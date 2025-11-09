# Clinical-Swarm: Real-Time Layered Safety Analysis

This project is a critical prototype of a 3-agent AI system designed to drastically reduce the manual review time for clinical trial Adverse Event (AE) reports. The architecture utilizes a Layered Memory approach to maintain full traceability and context throughout the analysis pipeline.

## 1. Architecture Overview

The system runs sequentially: each agent performs a specialized cognitive task and commits its output to a specific layer in a shared MongoDB document.

| Layer | Agent | Role | Output Data | AI Method |
|---|---|---|---|---|
| Foundation | EventExtractorAgent | Data Acquisition | Structured JSON of symptoms, history, etc. | Real-Time API Call (Teammate's Model) |
| Strategic | RiskAnalyzerAgent | Correlation/Analysis | Risk Score (0.0-1.0), Emergent Cluster ID | RAG (Retrieval-Augmented Generation) |
| Synthesis | RecommendationSLMAgent | Decision/Handoff | Recommended Action ("ESCALATE"), Reasoning | Protocol-Aware Rules Engine |

## 2. Tech Stack and Memory

- Backend: Node.js v18 (Express.js)
- Database (Layered Memory): MongoDB Atlas (Single `clinical_events` collection per job)
- Knowledge Base (RAG): 9 clinical trial JSON files (in the `/data` folder)
- Client: React/Vite/TypeScript (lives in the `/client` folder)
- Intelligence: Hybrid Model Strategy (node-fetch calls Python server, plus internal mock logic for Agents 2 & 3).
- Proof-of-Concept: We demonstrated capability for model optimization by successfully compiling a Qwen-1.7B model on AWS Trainium.

## 3. Getting Started (Build and Run)

This guide assumes you are starting from the `clinical-swarm` directory. You must run three separate processes at the same time: your teammate's Model Server, your Backend Server, and the Frontend Client.

### Prerequisites

- Node.js v18+
- MongoDB Atlas URI (Must be in your `.env` file)
- Teammate's Server: The Python model server must be running on `http://localhost:8000/predict` at all times.

### Start Sequence

This project expects the following processes to be running concurrently.

A. Backend Server (`server.js`)

This server runs on `http://localhost:3000`.

```bash
# 1. Ensure Node.js v18 is active
nvm use 18

# 2. Go to the project root
cd ~/clinical-swarm

# 3. Install packages (if you just cloned the repo)
npm install

# 4. Run the server
npm start
```

Note: The `EXTRACTOR_API_URL` in `server.js` is set to `http://localhost:8000/predict`.

B. Frontend Client (client)

Open a NEW, separate terminal and start the UI.

```bash
# 1. Go into the client folder
cd client

# 2. Install dependencies
npm install

# 3. Run the development server
npm run dev
```

## 4. Test the API

To verify the full agent pipeline is running, use this command in a separate terminal:

```bash
curl -X POST http://localhost:3000/api/submit-event \
-H "Content-Type: application/json" \
-d '{
    "patient_id": "999",
    "report_text": "Patient 999 reports severe headache, confusion, and loss of balance."
}'
```

The server console will print the step-by-step log for all three agents.

---

If you want me to adapt these instructions to the current repository layout (this codebase is named `HackathonAgent`), or to add example `.env` and sample cURL/JS client snippets for automated testing, tell me which one and I will add it next.
# AURA - Argument Unit Relational Analyzer

> Multi-agent system for legal brief analysis with zero context loss through structured memory layers.

## What is AURA?

AURA solves the **context shredding problem** in multi-agent legal analysis. Instead of agents passing summaries or losing context in handoffs, AURA uses a **layered memory architecture** where each agent builds upon a shared MongoDB document:

- **Foundation Layer** (ResearchAgent) → Finds precedents
- **Strategic Layer** (AnalysisAgent) → Analyzes arguments, references precedents
- **Synthesis Layer** (DraftingAgent) → Generates brief, cites arguments and precedents

Every citation traces back through the reasoning chain with full provenance.

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Express.js REST API
- **Database**: MongoDB Atlas (structured document store)
- **LLM**: any LLM works
- **Architecture**: Sequential agent orchestration with polling UI

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB Atlas account
- LLM API key

### Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment (`.env`):**
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_DB_NAME=legal_context_weaver
```

3. **Test connections:**
```bash
node test-connections.js
```

4. **Run the system:**
```bash
npm run dev:all
```

Opens:
- Backend API: 
- Frontend

## How It Works

### Architecture

```
┌─────────────────┐
│  React Frontend │ ← Polling every 500ms
└────────┬────────┘
         │ HTTP
┌────────▼────────┐
│   Express API   │ ← Sequential agent execution
└────────┬────────┘
         │
┌────────▼────────┐
│  MongoDB Atlas  │ ← Single document with layers
└────────┬────────┘
         │
┌────────▼────────┐
│        LLM      │ ← LLM calls per agent
└─────────────────┘
```

### Execution Flow

1. **User uploads case file** (or triggers demo)
2. **Backend API** runs agents sequentially:
   - `ResearchAgent` → Writes `context_layers.foundation`
   - `AnalysisAgent` → Reads foundation, writes `context_layers.strategic`
   - `DraftingAgent` → Reads both, writes `context_layers.synthesis`
3. **Frontend polls** MongoDB via API, displays live updates
4. **Result**: Fully traceable reasoning chain

### MongoDB Document Structure

```javascript
{
  case_id: "case_123",
  status: "complete",
  context_layers: {
    foundation: {
      precedents: [{ id, case_name, year, relevance_score, ... }],
      relevant_doctrines: [...],
      research_complete: true
    },
    strategic: {
      argument_map: [
        {
          id, 
          argument_text, 
          strength_score,
          supporting_precedents: ["prec_1", "prec_2"], // References foundation layer
          weaknesses: [...]
        }
      ],
      overall_case_strength: 0.75,
      analysis_complete: true
    },
    synthesis: {
      brief_sections: [
        {
          section_name,
          content,
          citations: [
            { precedent_id: "prec_1", inline_cite: "...", ... }
          ],
          reasoning_source: { analysis_id: "arg_1", ... }
        }
      ],
      draft_complete: true
    }
  },
  agent_handoffs: [
    { from_agent, to_agent, message, timestamp }
  ]
}
```

## API Endpoints

```
GET  /api/health              # Check MongoDB + LLM status
GET  /api/context/:caseId     # Fetch context document
POST /api/execute/:caseId     # Execute agent workflow
POST /api/reset/:caseId       # Clear context
```



## License

Open Source