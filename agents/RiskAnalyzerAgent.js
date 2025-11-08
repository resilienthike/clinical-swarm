// /agents/RiskAnalyzerAgent.js
import { BaseAgent } from './BaseAgent.js';
import fs from 'fs';
import path from 'path';

export class RiskAnalyzerAgent extends BaseAgent {
  constructor(llmClient, dbClient, clinicalDataPaths) {
    super('RiskAnalyzerAgent', 'Clinical Risk Specialist', llmClient, dbClient);
    
    this.clinicalKnowledgeBase = this.loadClinicalData(clinicalDataPaths);
    console.log(`[RiskAnalyzerAgent] Initialized with knowledge from ${this.clinicalKnowledgeBase.totalTrials} trials.`);
  }

  loadClinicalData(jsonFilePaths) {
    let allSeriousEvents = new Set();
    let allOtherEvents = new Set();

    for (const filePath of jsonFilePaths) {
      try {
        const fullPath = path.resolve(filePath);
        const fileData = fs.readFileSync(fullPath, 'utf8');
        const trialData = JSON.parse(fileData);

        const results = trialData.resultsSection;
        if (results && results.adverseEventsModule) {
          results.adverseEventsModule.seriousEvents?.forEach(e => allSeriousEvents.add(e.term));
          results.adverseEventsModule.otherEvents?.forEach(e => allOtherEvents.add(e.term));
        }
      } catch (err) {
        console.error(`[RiskAnalyzerAgent] ERROR loading data from ${filePath}: ${err.message}`);
      }
    }
    
    return {
      totalTrials: jsonFilePaths.length,
      seriousEvents: [...allSeriousEvents],
      otherEvents: [...allOtherEvents]
    };
  }

  async reason(context) {
    const { foundation } = context.context_layers;
    const structuredEvent = foundation.structured_data;

    if (!structuredEvent || !structuredEvent.symptoms) {
      throw new Error('No symptoms found in foundation layer. EventExtractor must run first.');
    }

    const prompt = `You are a clinical risk analysis specialist. A new adverse event report has been extracted.

New Event Data:
${JSON.stringify(structuredEvent, null, 2)}

Your Knowledge Base (compiled from 9 clinical trials):
- Known SERIOUS Adverse Events: ${this.clinicalKnowledgeBase.seriousEvents.join(', ')}
- Known OTHER Adverse Events: ${this.clinicalKnowledgeBase.otherEvents.join(', ')}

Your task:
1. Analyze the "New Event Data" against your "Knowledge Base".
2. Check for direct correlations (e.g., "headache" is a known "Other Event").
3. Check for "emergent clusters" (e.g., "confusion" and "loss of balance" are not listed, but they are primary symptoms of "Cerebral infarction," which IS a known "Serious Event").
4. Generate a risk score (0.0 - 1.0).
5. Provide clear reasoning.

Format your response as a single, valid JSON object:
{
  "risk_score": 0.85,
  "correlation_reason": "Symptom 'confusion' is not listed but is highly correlated with known Serious Event 'Cerebral infarction'.",
  "emergent_cluster_id": "cluster_004_stroke"
}

Respond ONLY with valid JSON.`;

    console.log(`[RiskAnalyzerAgent] Analyzing event for patient: ${structuredEvent.patient_id}...`);
    
    const response = await this.llm.generateContent(prompt);
    const resultText = response.response.text();
    
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('[RiskAnalyzerAgent] LLM did not return valid JSON');
    }
    
    const result = JSON.parse(jsonMatch[0]);
    console.log(`[RiskAnalyzerAgent] Event analyzed. Risk score: ${result.risk_score}`);
    return result;
  }

  async updateContext(eventId, result) {
    await this.db.collection('clinical_events').updateOne(
      { event_id: eventId },
      {
        $set: {
          'context_layers.strategic.risk_score': result.risk_score,
          'context_layers.strategic.correlation_reason': result.correlation_reason,
          'context_layers.strategic.emergent_cluster_id': result.emergent_cluster_id,
          'context_layers.strategic.analysis_complete': true,
          last_update: new Date()
        }
      }
    );
  }

  async logHandoff(eventId, result, timing) {
    await super.logHandoff(eventId, result, timing);
    
    await this.db.collection('clinical_events').updateOne(
      { event_id: eventId },
      {
        $push: {
          agent_handoffs: {
            handoff_id: `handoff_002`,
            from_agent: this.name,
            to_agent: 'RecommendationSLMAgent',
            timestamp: new Date(),
            message: `Strategic layer complete: Event analyzed with risk score ${result.risk_score}.`
          }
        }
      }
    );
  }
}