Clinical-Swarm: Real-Time Layered Safety Analysis

This project is a critical prototype of a 3-agent AI system designed to drastically reduce the manual review time for clinical trial Adverse Event (AE) reports. The architecture utilizes a Layered Memory approach to maintain full traceability and context throughout the analysis pipeline.

1. Architecture Overview

The system runs sequentially: each agent performs a specialized cognitive task and commits its output to a specific layer in a shared MongoDB document.

Layer

Agent

Role

Output Data

AI Method

Foundation

EventExtractorAgent

Data Acquisition

Structured JSON of symptoms, history, etc.

Real-Time API Call (Teammate's Model)

Strategic

RiskAnalyzerAgent

Correlation/Analysis

Risk Score (0.0-1.0), Emergent Cluster ID

RAG (Retrieval-Augmented Generation)

Synthesis

RecommendationSLMAgent

Decision/Handoff

Recommended Action ("ESCALATE"), Reasoning

Protocol-Aware Rules Engine

2. Tech Stack and Memory

Backend: Node.js v18 (Express.js)

Database (Layered Memory): MongoDB Atlas (Single clinical_events collection per job)

Knowledge Base (RAG): 9 clinical trial JSON files (in the /data folder)

Client: React/Vite/TypeScript (lives in the /client folder)

Intelligence: Hybrid Model Strategy (Node-fetch calls Python server, plus internal mock logic for Agents 2 & 3).

Proof-of-Concept: We demonstrated capability for model optimization by successfully compiling a Qwen-1.7B model on AWS Trainium.

3. Getting Started (Build and Run)

This guide assumes you are starting from the clinical-swarm directory. You must run three separate processes at the same time: your teammate's Model Server, your Backend Server, and the Frontend Client.

Prerequisites

Node.js v18+

MongoDB Atlas URI (Must be in your .env file)

Teammate's Server: The Python model server must be running on http://localhost:8000/predict at all times.

Start Sequence

A. Backend Server (server.js)

This server runs on http://localhost:3000.

# 1. Ensure Node.js v18 is active
nvm use 18

# 2. Go to the project root
cd ~/clinical-swarm

# 3. Install packages (if you just cloned the repo)
npm install

# 4. Run the server
npm start


Note: The EXTRACTOR_API_URL in server.js is set to http://localhost:8000/predict.

B. Frontend Client (client)

Open a NEW, separate terminal and start the UI.

# 1. Go into the client folder
cd client

# 2. Install dependencies
npm install

# 3. Run the development server
npm run dev


4. Test the API

To verify the full agent pipeline is running, use this curl command in a separate terminal:

curl -X POST http://localhost:3000/api/submit-event \
-H "Content-Type: application/json" \
-d '{
    "patient_id": "999",
    "report_text": "Patient 999 reports severe headache, confusion, and loss of balance."
}'


The server console will print the step-by-step log for all three agents.