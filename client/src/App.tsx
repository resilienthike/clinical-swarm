import { useState } from "react";
import axios from "axios";
import "./App.css";
import LoadingScreen from "./LoadingScreen";

interface ExtractionResult {
  [key: string]: any;
}

export default function App() {
  console.log("✅ App rendered");
  const [notes, setNotes] = useState<string>("");
  const [phase, setPhase] = useState<"input" | "loading" | "result">("input");
  const [result, setResult] = useState<ExtractionResult | null>(null);

  const submitNotes = async () => {
    console.log("✅ Extract Data button clicked");

    if (!notes.trim()) {
      console.log("⚠️ No notes entered");
      return;
    }

    // Move to loading screen
    console.log("➡️ Moving to loading phase");
    setPhase("loading");

    try {
      const res = await axios.post<ExtractionResult>(
        "http://localhost:3000/extract",
        { notes }
      );

      console.log("✅ API response received:", res.data);

      setResult(res.data);
      setPhase("result");
    } catch (err) {
      console.error("❌ API error:", err);
      alert("Error contacting server.");
      setPhase("input");
    }
  };

  // ✅ Loading screen takes over the whole UI
  if (phase === "loading") {
    console.log("⏳ Rendering loading screen");
    return <LoadingScreen />;
  }

  // ✅ Result page replaces input page
  if (phase === "result" && result) {
    console.log("📄 Rendering results screen");
    return (
      <div className="page">
        <h1 className="main-title">Extracted Clinical Data</h1>

        <pre className="result-box">{JSON.stringify(result, null, 2)}</pre>

        <button
          className="submit-btn"
          style={{ marginTop: "30px" }}
          onClick={() => {
            setNotes("");
            setResult(null);
            setPhase("input");
          }}
        >
          Analyze Another Patient
        </button>
      </div>
    );
  }

  // ✅ Input screen
  console.log("📝 Rendering input screen");

  return (
    <div className="page">
      <h1 className="main-title">Clinical Trial Doctor Assistant</h1>

      <div className="center-box">
        <textarea
          className="input-box"
          rows={10}
          placeholder="Paste clinical notes here..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <button className="submit-btn" onClick={submitNotes}>
          Extract Data
        </button>
      </div>
    </div>
  );
}
