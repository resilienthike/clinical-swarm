// /agents/EventExtractorAgent.js
import { BaseAgent } from './BaseAgent.js';

export class EventExtractorAgent extends BaseAgent {
  constructor(llmClient, dbClient) {
    super('EventExtractorAgent', 'Data Extraction Specialist', llmClient, dbClient);
  }

  async reason(context) {
    const rawText = context.raw_report_text;
    
    const prompt = `You are an expert at clinical data extraction.
    Extract all structured data from the following adverse event report.
    Report: "${rawText}"
    
    Format your response as a single, valid JSON object:
    {
      "patient_id": "string",
      "symptoms": ["list", "of", "symptoms"],
      "is_serious": "boolean, true if life-threatening"
    }
    
    Respond ONLY with valid JSON.`;

    console.log('[EventExtractorAgent] Extracting structured data...');
    const response = await this.llm.generateContent(prompt);
    const resultText = response.response.text();
    
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('[EventExtractorAgent] LLM did not return valid JSON');
    }
    
    const result = JSON.parse(jsonMatch[0]);
    console.log(`[EventExtractorAgent] Extracted symptoms: ${result.symptoms.join(', ')}`);
    return result;
  }

  async updateContext(eventId, result) {
    await this.db.collection('clinical_events').updateOne(
      { event_id: eventId },
      {
        $set: {
          'context_layers.foundation.structured_data': result,
          'context_layers.foundation.extraction_complete': true,
          last_update: new Date()
        }
      }
    );
  }

  async logHandoff(eventId, result, timing) {
    await super.logHandoff(eventId, result, timing); // Logs the basic timing
    
    await this.db.collection('clinical_events').updateOne(
      { event_id: eventId },
      {
        $push: {
          agent_handoffs: {
            handoff_id: `handoff_001`,
            from_agent: this.name,
            to_agent: 'RiskAnalyzerAgent',
            timestamp: new Date(),
            message: `Foundation layer complete: Extracted ${result.symptoms.length} symptoms.`
          }
        }
      }
    );
  }
}