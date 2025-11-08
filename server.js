// server.js
// This is your entire backend for the hackathon.

import express from 'express';
import { MongoClient } from 'mongodb';
import 'dotenv/config'; // Loads .env file

// Import your three agents
import { EventExtractorAgent } from './agents/EventExtractorAgent.js';
import { RiskAnalyzerAgent } from './agents/RiskAnalyzerAgent.js';
import { RecommendationSLMAgent } from './agents/RecommendationSLMAgent.js';

// --- SETUP ---
const app = express();
app.use(express.json());

// --- MOCK LLM CLIENT ---
// This is a "smart" mock that responds differently based on the agent's prompt
// TODO: Replace this with your REAL LLM client if you have time.
const llmClient = {
  generateContent: async (prompt) => {
    console.log(`[MockLLM] Received a prompt...`);
    
    // Mock for EventExtractorAgent
    if (prompt.includes("Extract all structured data")) {
      return { response: { text: () => `{
        "patient_id": "1109",
        "symptoms": ["headache", "confusion", "loss of balance"],
        "is_serious": true
      }`}};
    }
    
    // Mock for RiskAnalyzerAgent
    if (prompt.includes("You are a clinical risk analysis specialist")) {
      return { response: { text: () => `{
        "risk_score": 0.9,
        "correlation_reason": "MOCK: 'confusion' and 'loss of balance' are highly correlated with known Serious Event 'Cerebral infarction'.",
        "emergent_cluster_id": "cluster_004_stroke"
      }`}};
    }
    
    // Mock for RecommendationSLMAgent
    if (prompt.includes("You are a clinical protocol meta-reasoner")) {
      return { response: { text: () => `{
        "recommended_action": "ESCALATE: Immediate protocol review.",
        "reasoning": "MOCK: Risk score 0.9 and symptoms 'confusion' match 'unstable major depressive disorder' exclusion criteria.",
        "audit_trail": "RiskAnalyzerAgent -> RecommendationSLMAgent"
      }`}};
    }

    // Fallback
    return { response: { text: () => `{"error": "Mock response not configured for this prompt."}` }};
  }
};

// --- DATABASE CONNECTION ---
let dbClient;
let db;

async function connectDB() {
  if (!process.env.MONGODB_URI) {
    console.error("Error: MONGODB_URI is not set in the .env file.");
    process.exit(1);
  }
  console.log('Connecting to MongoDB...');
  const mongoClient = new MongoClient(process.env.MONGODB_URI);
  await mongoClient.connect();
  db = mongoClient.db(process.env.VITE_DB_NAME || 'clinical_swarm_db');
  dbClient = mongoClient; // Keep the client for other purposes if needed
  console.log('MongoDB connected.');
  return db; // Return the db object for agents
}

// --- AGENT INITIALIZATION ---
// This function will be called AFTER the DB is connected
function initializeAgents(db) {
  
  // *** THIS IS THE UPDATED LIST ***
  const clinicalTrialFiles = [
    './data/NCT03131687.json',
    './data/NCT04166773.json',
    './data/NCT04184622.json',
    './data/NCT04311411.json',
    './data/NCT04660643.json',
    './data/NCT04881760.json',
    './data/NCT05051579.json',
    './data/NCT05064735.json',
    './data/NCT05616013.json'
  ];

  // Create the agents and pass them the DB and LLM clients
  const eventExtractor = new EventExtractorAgent(llmClient, db);
  const riskAnalyzer = new RiskAnalyzerAgent(llmClient, db, clinicalTrialFiles);
  const recommendationSLM = new RecommendationSLMAgent(llmClient, db);
  
  return { eventExtractor, riskAnalyzer, recommendationSLM };
}


// --- API ENDPOINT ---
// This is the endpoint your React app will call
async function startServer() {
  const db = await connectDB();
  const { eventExtractor, riskAnalyzer, recommendationSLM } = initializeAgents(db);

  app.post('/api/submit-event', async (req, res) => {
    try {
      const { report_text, patient_id } = req.body;
      
      if (!report_text || !patient_id) {
        return res.status(400).json({ error: 'patient_id and report_text are required.' });
      }

      const eventId = `event_${patient_id}_${Date.now()}`;

      // 1. Create the new event document in MongoDB
      await db.collection('clinical_events').insertOne({
        event_id: eventId,
        status: 'pending',
        raw_report_text: report_text,
        patient_id: patient_id,
        created_at: new Date(),
        context_layers: {
          foundation: {},
          strategic: {},
          synthesis: {}
        },
        agent_logs: [],
        agent_handoffs: []
      });

      console.log(`New event created: ${eventId}`);

      // 2. Run the agent swarm in sequence (NOT awaiting)
      runSwarm(eventId, eventExtractor, riskAnalyzer, recommendationSLM, db);

      // 3. Respond to the frontend immediately
      res.status(202).json({
        message: 'Event accepted. Analysis is in progress.',
        event_id: eventId
      });

    } catch (error) {
      console.error('Error submitting event:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // This function runs the agents in the background
  async function runSwarm(eventId, eventExtractor, riskAnalyzer, recommendationSLM, db) {
    try {
      // 1. EventExtractor runs
      await eventExtractor.run(eventId);
      
      // 2. RiskAnalyzer runs
      await riskAnalyzer.run(eventId);
      
      // 3. RecommendationSLM runs
      await recommendationSLM.run(eventId);

      // 4. Mark as complete
      await db.collection('clinical_events').updateOne(
        { event_id: eventId },
        { $set: { status: 'complete', last_update: new Date() } }
      );
      console.log(`Swarm complete for ${eventId}`);

    } catch (err) {
      console.error(`[SwarmError] for ${eventId}:`, err);
      await db.collection('clinical_events').updateOne(
        { event_id: eventId },
        { $set: { status: 'failed', error: err.message, last_update: new Date() } }
      );
    }
  }

  // --- START THE SERVER ---
  app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
  });
}

startServer().catch(console.error);