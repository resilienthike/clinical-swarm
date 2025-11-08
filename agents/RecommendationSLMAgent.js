// /agents/RecommendationSLMAgent.js
import { BaseAgent } from './BaseAgent.js';

export class RecommendationSLMAgent extends BaseAgent {
  constructor(llmClient, dbClient) {
    super('RecommendationSLMAgent', 'Clinical Protocol Specialist', llmClient, dbClient);
    
    // For the hackathon, hard-coding key rules is faster and more reliable.
    this.protocolRules = [
      "Exclusion: History of pancreatitis",
      "Exclusion: Family or personal history of medullary thyroid carcinoma (MTC)",
      "Exclusion: History of significant active or unstable major depressive disorder (MDD)"
    ];
  }

  async reason(context) {
    const { foundation, strategic } = context.context_layers;

    if (!strategic || !strategic.risk_score) {
      throw new Error('No risk score found. RiskAnalyzerAgent must run first.');
    }
    
    const prompt = `You are a clinical protocol meta-reasoner.
    Your job is to generate a final, auditable action based on the analysis.

    PROTOCOL RULES (from trial NCT04660643):
    ${this.protocolRules.join('\n    ')}

    ANALYSIS (from previous agents):
    - Patient Event: ${JSON.stringify(foundation.structured_data)}
    - Risk Analysis: ${JSON.stringify(strategic)}

    Your Task:
    1. Check if the risk score (>= 0.8) or symptoms (e.g., 'confusion') trigger a protocol rule.
    2. Generate a clear 'recommended_action' (e.g., "MONITOR", "ESCALATE").
    3. Provide brief 'reasoning' for your action, referencing the data.

    Format your response as a single, valid JSON object:
    {
      "recommended_action": "ESCALATE: Immediate protocol review.",
      "reasoning": "Risk score 0.9 and symptoms 'confusion' match 'unstable major depressive disorder' exclusion criteria.",
      "audit_trail": "RiskAnalyzerAgent -> RecommendationSLMAgent"
    }
    
    Respond ONLY with valid JSON.`;

    console.log('[RecommendationSLM] Generating final action...');
    const response = await this.llm.generateContent(prompt);
    const resultText = response.response.text();
    
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('[RecommendationSLM] LLM did not return valid JSON');
    }
    
    const result = JSON.parse(jsonMatch[0]);
    console.log(`[RecommendationSLM] Action: ${result.recommended_action}`);
    return result;
  }

  async updateContext(eventId, result) {
    await this.db.collection('clinical_events').updateOne(
      { event_id: eventId },
      {
        $set: {
          'context_layers.synthesis.recommended_action': result.recommended_action,
          'context_layers.synthesis.reasoning': result.reasoning,
          'context_layers.synthesis.audit_trail': result.audit_trail,
          'context_layers.synthesis.synthesis_complete': true,
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
            handoff_id: `handoff_003`,
            from_agent: this.name,
            to_agent: 'END_OF_SWARM',
            timestamp: new Date(),
            message: `Synthesis complete: Final action generated. (${result.recommended_action})`
          }
        }
      }
    );
  }
}