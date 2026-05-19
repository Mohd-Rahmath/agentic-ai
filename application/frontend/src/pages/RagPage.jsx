import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import ImageUpload from "../components/ImageUpload.jsx";
import ResultDisplay from "../components/ResultDisplay.jsx";
import HistoryPanel from "../components/HistoryPanel.jsx";
import DocumentUpload from "../components/DocumentUpload.jsx";
import DocumentResult from "../components/DocumentResult.jsx";

const API = "http://localhost:8000";

export default function RagPage() {
  const [activeTab, setActiveTab] = useState("analyze");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [docLoading, setDocLoading] = useState(false);
  const [docResult, setDocResult] = useState(null);
  const [docError, setDocError] = useState(null);
  const [docHistory, setDocHistory] = useState([]);
  const [docHistoryLoading, setDocHistoryLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API}/history`);
      const data = await res.json();
      setHistory(data.history || []);
    } catch {
      // non-critical
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const fetchDocHistory = useCallback(async () => {
    setDocHistoryLoading(true);
    try {
      const res = await fetch(`${API}/document-history`);
      const data = await res.json();
      setDocHistory(data.history || []);
    } catch {
      // non-critical
    } finally {
      setDocHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "history") fetchHistory();
    if (activeTab === "doc-history") fetchDocHistory();
  }, [activeTab, fetchHistory, fetchDocHistory]);

  const handleDocumentAnalyze = async (file) => {
    setDocLoading(true);
    setDocResult(null);
    setDocError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API}/analyze-document`, { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Unknown error" }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setDocResult(data);
    } catch (e) {
      setDocError(e.message || "Failed to analyze document. Check that the backend is running.");
    } finally {
      setDocLoading(false);
    }
  };

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
            <p style={styles.logoSub}>Powered by OpenRouter + ChromaDB</p>
          </div>
        </div>
        <nav style={styles.nav}>
          {[
            { id: "analyze", label: "🔍 Analyze" },
            { id: "history", label: "📚 History" },
            { id: "documents", label: "📄 Documents" },
            { id: "doc-history", label: "🗂 Doc History" },
          ].map(({ id, label }) => (
            <button
              key={id}
              style={{ ...styles.navBtn, ...(activeTab === id ? styles.navBtnActive : {}) }}
              onClick={() => setActiveTab(id)}
            >
              {label}
            </button>
          ))}
          <Link to="/location" style={styles.locationLink}>
            📍 Location Finder
          </Link>
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
                  <p style={styles.placeholderText}>Analyzing your image...</p>
                </div>
              )}
              <ResultDisplay result={result} error={error} />
            </section>
          </div>
        )}

        {activeTab === "history" && (
          <section style={styles.historySection}>
            <div style={styles.historyHeader}>
              <h2 style={styles.panelTitle}>Past Image Analyses</h2>
              <button style={styles.refreshBtn} onClick={fetchHistory} disabled={historyLoading}>
                {historyLoading ? "Loading..." : "↻ Refresh"}
              </button>
            </div>
            <HistoryPanel history={history} />
          </section>
        )}

        {activeTab === "documents" && (
          <div style={styles.analyzeLayout}>
            <section style={styles.panel}>
              <h2 style={styles.panelTitle}>Upload Document</h2>
              <DocumentUpload onAnalyze={handleDocumentAnalyze} loading={docLoading} />
            </section>
            <section style={styles.panel}>
              <h2 style={styles.panelTitle}>
                {docResult ? "Analysis Result" : "Waiting for document..."}
              </h2>
              {!docResult && !docError && !docLoading && (
                <div style={styles.placeholder}>
                  <span style={{ fontSize: 48 }}>👈</span>
                  <p style={styles.placeholderText}>Upload a PDF, TXT, or DOCX to see the AI analysis here</p>
                </div>
              )}
              {docLoading && (
                <div style={styles.placeholder}>
                  <div style={styles.bigSpinner} />
                  <p style={styles.placeholderText}>Analyzing your document...</p>
                </div>
              )}
              <DocumentResult result={docResult} error={docError} />
            </section>
          </div>
        )}

        {activeTab === "doc-history" && (
          <section style={styles.historySection}>
            <div style={styles.historyHeader}>
              <h2 style={styles.panelTitle}>Past Document Analyses</h2>
              <button style={styles.refreshBtn} onClick={fetchDocHistory} disabled={docHistoryLoading}>
                {docHistoryLoading ? "Loading..." : "↻ Refresh"}
              </button>
            </div>
            <HistoryPanel history={docHistory} />
          </section>
        )}
      </main>

      <footer style={styles.footer}>
        RAG Image Recognition Agent — OpenRouter vision + ChromaDB
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
  nav: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
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
  locationLink: {
    padding: "8px 18px", borderRadius: 8,
    border: "1px solid var(--accent)",
    background: "var(--accent-dim)", color: "var(--accent)",
    fontSize: 14, fontWeight: 600,
    textDecoration: "none",
    transition: "all 0.15s",
    marginLeft: 8,
  },
  main: { flex: 1, padding: "32px", maxWidth: 1100, margin: "0 auto", width: "100%" },
  analyzeLayout: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 },
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
