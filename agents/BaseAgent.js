// /agents/BaseAgent.js
// This is the "parent" class all your other agents will use.

export class BaseAgent {
  constructor(name, title, llmClient, dbClient) {
    this.name = name;
    this.title = title;
    this.llm = llmClient;
    this.db = dbClient;
  }

  async run(contextId) {
    console.log(`[${this.name}] ===== Agent Activated. Target: ${contextId} =====`);
    const startTime = process.hrtime.bigint();

    // 1. READ current context from DB
    const context = await this.readContext(contextId);
    if (!context) {
      throw new Error(`[${this.name}] No context found for ${contextId}`);
    }

    // 2. REASON (This is the main logic for each agent)
    const result = await this.reason(context);

    // 3. WRITE the new results back to DB
    await this.updateContext(contextId, result);

    const endTime = process.hrtime.bigint();
    const timing = Number(endTime - startTime) / 1_000_000_000; // in seconds

    // 4. HANDOFF (Log and prepare for next agent)
    await this.logHandoff(contextId, result, timing);
    
    console.log(`[${this.name}] ===== Agent Finished. Time: ${timing.toFixed(2)}s =====`);
    return result;
  }

  async readContext(contextId) {
    return await this.db.collection('clinical_events').findOne({ event_id: contextId });
  }

  async reason(context) {
    throw new Error(`[${this.name}] reason() method must be implemented by child class.`);
  }

  async updateContext(contextId, result) {
    throw new Error(`[${this.name}] updateContext() method must be implemented by child class.`);
  }

  async logHandoff(contextId, result, timing) {
    await this.db.collection('clinical_events').updateOne(
      { event_id: contextId },
      {
        $push: {
          agent_logs: {
            agent_name: this.name,
            agent_title: this.title,
            execution_time_sec: timing,
            timestamp: new Date()
          }
        }
      }
    );
  }
}