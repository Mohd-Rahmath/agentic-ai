import React, { useState, useEffect, useCallback } from "react";
import ImageUpload from "./components/ImageUpload.jsx";
import ResultDisplay from "./components/ResultDisplay.jsx";
import HistoryPanel from "./components/HistoryPanel.jsx";

const API = "/api";

export default function App() {
  const [activeTab, setActiveTab] = useState("analyze");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API}/history`);
      const data = await res.json();
      setHistory(data.history || []);
    } catch {
      // history fetch is non-critical
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "history") fetchHistory();
  }, [activeTab, fetchHistory]);

  const handleAnalyze = async (file) => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API}/analyze`, { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Unknown error" }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(e.message || "Failed to analyze image. Check that the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>🧠</span>
          <div>
            <h1 style={styles.logoTitle}>RAG Image Recognition</h1>
            <p style={styles.logoSub}>Powered by Claude + ChromaDB</p>
          </div>
        </div>
        <nav style={styles.nav}>
          {["analyze", "history"].map((tab) => (
            <button
              key={tab}
              style={{ ...styles.navBtn, ...(activeTab === tab ? styles.navBtnActive : {}) }}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "analyze" ? "🔍 Analyze" : "📚 History"}
            </button>
          ))}
        </nav>
      </header>

      <main style={styles.main}>
        {activeTab === "analyze" && (
          <div style={styles.analyzeLayout}>
            <section style={styles.panel}>
              <h2 style={styles.panelTitle}>Upload Image</h2>
              <ImageUpload onAnalyze={handleAnalyze} loading={loading} />
            </section>
            <section style={styles.panel}>
              <h2 style={styles.panelTitle}>
                {result ? "Analysis Result" : "Waiting for image..."}
              </h2>
              {!result && !error && !loading && (
                <div style={styles.placeholder}>
                  <span style={{ fontSize: 48 }}>👈</span>
                  <p style={styles.placeholderText}>Upload an image to see the AI analysis here</p>
                </div>
              )}
              {loading && (
                <div style={styles.placeholder}>
                  <div style={styles.bigSpinner} />
                  <p style={styles.placeholderText}>Claude is analyzing your image...</p>
                </div>
              )}
              <ResultDisplay result={result} error={error} />
            </section>
          </div>
        )}

        {activeTab === "history" && (
          <section style={styles.historySection}>
            <div style={styles.historyHeader}>
              <h2 style={styles.panelTitle}>Past Analyses</h2>
              <button style={styles.refreshBtn} onClick={fetchHistory} disabled={historyLoading}>
                {historyLoading ? "Loading..." : "↻ Refresh"}
              </button>
            </div>
            <HistoryPanel history={history} />
          </section>
        )}
      </main>

      <footer style={styles.footer}>
        RAG Image Recognition Agent — Claude claude-sonnet-4-6 + ChromaDB
      </footer>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", display: "flex", flexDirection: "column" },
  header: {
    background: "var(--surface)",
    borderBottom: "1px solid var(--border)",
    padding: "16px 32px",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    flexWrap: "wrap", gap: 12,
  },
  logo: { display: "flex", alignItems: "center", gap: 12 },
  logoIcon: { fontSize: 36 },
  logoTitle: { fontSize: 20, fontWeight: 700, color: "var(--text)" },
  logoSub: { fontSize: 12, color: "var(--text-muted)" },
  nav: { display: "flex", gap: 8 },
  navBtn: {
    padding: "8px 18px", borderRadius: 8,
    border: "1px solid var(--border)",
    background: "transparent", color: "var(--text-muted)",
    cursor: "pointer", fontSize: 14, fontWeight: 500,
    transition: "all 0.15s",
  },
  navBtnActive: {
    background: "var(--accent-dim)",
    borderColor: "var(--accent)",
    color: "var(--accent)",
  },
  main: { flex: 1, padding: "32px", maxWidth: 1100, margin: "0 auto", width: "100%" },
  analyzeLayout: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 24,
  },
  panel: { display: "flex", flexDirection: "column", gap: 16 },
  panelTitle: { fontSize: 18, fontWeight: 600, color: "var(--text)" },
  placeholder: {
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    gap: 16, minHeight: 240,
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
  },
  placeholderText: { fontSize: 14, color: "var(--text-muted)", textAlign: "center", padding: "0 16px" },
  bigSpinner: {
    width: 48, height: 48,
    border: "4px solid var(--border)",
    borderTopColor: "var(--accent)",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  historySection: { display: "flex", flexDirection: "column", gap: 16 },
  historyHeader: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  refreshBtn: {
    padding: "6px 14px", fontSize: 13, borderRadius: 8,
    border: "1px solid var(--border)", background: "transparent",
    color: "var(--text-muted)", cursor: "pointer",
  },
  footer: {
    textAlign: "center", padding: "16px",
    fontSize: 12, color: "var(--text-muted)",
    borderTop: "1px solid var(--border)",
    background: "var(--surface)",
  },
};
