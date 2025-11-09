## 🌟 Clinical-Swarm: Real-Time Layered Safety Analysis

This project is a critical prototype of a **3-agent AI system** designed to drastically reduce the manual review time for clinical trial **Adverse Event (AE) reports**. The architecture utilizes a **Layered Memory** approach to maintain full traceability and context throughout the analysis pipeline.

---

### 1. 🏗️ Architecture Overview

The system runs sequentially: each agent performs a specialized cognitive task and **commits its output to a specific layer** in a shared MongoDB document, ensuring a fully auditable process.

| Layer | Agent | Role | AI Method | Key Output |
| :--- | :--- | :--- | :--- | :--- |
| **Foundation** | `EventExtractorAgent` | Data Acquisition | Custom Model (Trained on AWS Trainium) | Structured JSON (Symptoms, History) |
| **Strategic** | `RiskAnalyzerAgent` | Correlation/Analysis | RAG (Retrieval-Augmented Generation) | Risk Score (0.0-1.0), Emergent Cluster ID |
| **Synthesis** | `RecommendationSLMAgent` | Decision/Handoff | Protocol-Aware Rules Engine | Recommended Action ("ESCALATE"), Reasoning |

---

### 2. ⚙️ Tech Stack and Memory

This hybrid system combines a Node.js orchestration backend with a dedicated Python model server for intelligent processing.

* **Backend Server:** **Node.js v18** (Express.js) runs the agent orchestration on **Port 3000**.
* **Database (Layered Memory):** **MongoDB Atlas** stores the auditable `clinical_events` document.
* **Knowledge Base (RAG):** Nine clinical trial JSON files (from the `/data` folder) are used by the Risk Analyzer to dynamically assess risk.
* **Intelligence:** **Hybrid Strategy** (`node-fetch` connects the Node.js agents to the Python model server).
* **Client:** **React/Vite/TypeScript** (lives in the `/client` folder).

---

### 3. 🚀 Getting Started (Build and Run)

This guide assumes you are starting from the main `clinical-swarm` directory.

#### Prerequisites

* **Node.js v18+** (`nvm use 18`)
* **MongoDB Atlas URI:** Must be set in your `.env` file.
* **Teammate's Server:** The dedicated **Python model server** must be running on `http://localhost:8000/predict` at all times.

#### Start Sequence

You will need **two separate terminals** to run the full application stack.

**A. Backend Server (`server.js`)**

1.  Start the main server (runs on **Port 3000**):
    ```bash
    npm start
    ```

**B. Frontend Client (`client`)**

Open a **NEW, separate terminal** and start the UI.

1.  Go into the client directory:
    ```bash
    cd client
    ```
2.  Install dependencies (if needed):
    ```bash
    npm install
    ```
3.  Run the development server:
    ```bash
    npm run dev
    ```

---

### 4. 🧪 API Test

To verify the full 3-agent pipeline is running correctly, open a **third terminal** and use the following `curl` command:

```bash
curl -X POST http://localhost:3000/api/submit-event \
-H "Content-Type: application/json" \
-d '{
    "patient_id": "999",
    "report_text": "Patient 999 reports severe headache, confusion, and loss of balance."
}'