import React, { useState } from "react";
import { Link } from "react-router-dom";
import AgentSearchBox from "../components/agentic-location/AgentSearchBox.jsx";
import { searchLocations } from "../services/agenticLocationService.js";

export default function AgenticLocationFinderPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async (query) => {
    setLoading(true);
    setResults(null);
    setError(null);
    try {
      const data = await searchLocations(query);
      setResults(data);
    } catch (e) {
      setError(e.message || "Failed to search locations. Check that the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>📍</span>
          <div>
            <h1 style={styles.logoTitle}>Agentic Location Finder</h1>
            <p style={styles.logoSub}>AI-powered local search</p>
          </div>
        </div>
        <Link to="/" style={styles.backLink}>← Back to RAG Agent</Link>
      </header>

      <main style={styles.main}>
        <section style={styles.searchSection}>
          <AgentSearchBox onSearch={handleSearch} loading={loading} />
        </section>

        {error && (
          <div style={styles.errorBox}>{error}</div>
        )}

        {results && (
          <section style={styles.resultsSection}>
            {results.locations && results.locations.length > 0 ? (
              <>
                <h2 style={styles.resultsTitle}>
                  Found {results.locations.length} location{results.locations.length !== 1 ? "s" : ""}
                </h2>
                <div style={styles.resultsList}>
                  {results.locations.map((loc, i) => (
                    <div key={i} style={styles.card}>
                      <div style={styles.cardHeader}>
                        <span style={styles.cardName}>{loc.name}</span>
                        {loc.distance && (
                          <span style={styles.cardDistance}>{loc.distance}</span>
                        )}
                      </div>
                      {loc.address && <p style={styles.cardAddress}>{loc.address}</p>}
                      {loc.description && <p style={styles.cardDesc}>{loc.description}</p>}
                      {loc.rating && (
                        <p style={styles.cardMeta}>Rating: {loc.rating}</p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={styles.noResults}>
                <span style={{ fontSize: 40 }}>🔍</span>
                <p>No locations found. Try a different query.</p>
              </div>
            )}
            {results.summary && (
              <div style={styles.summary}>
                <strong>Agent summary:</strong> {results.summary}
              </div>
            )}
          </section>
        )}

        {!results && !error && !loading && (
          <div style={styles.placeholder}>
            <span style={{ fontSize: 56 }}>🗺️</span>
            <p style={styles.placeholderText}>Enter a location query above to get started</p>
          </div>
        )}
      </main>

      <footer style={styles.footer}>
        Agentic Location Finder — Powered by OpenRouter
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
  backLink: {
    padding: "8px 18px", borderRadius: 8,
    border: "1px solid var(--border)",
    background: "transparent", color: "var(--text-muted)",
    fontSize: 14, fontWeight: 500, textDecoration: "none",
  },
  main: { flex: 1, padding: "32px", maxWidth: 800, margin: "0 auto", width: "100%" },
  searchSection: { marginBottom: 32 },
  errorBox: {
    padding: "14px 18px", borderRadius: 10,
    background: "#fff0f0", border: "1px solid #fca5a5",
    color: "#b91c1c", fontSize: 14, marginBottom: 24,
  },
  resultsSection: { display: "flex", flexDirection: "column", gap: 16 },
  resultsTitle: { fontSize: 18, fontWeight: 600, color: "var(--text)" },
  resultsList: { display: "flex", flexDirection: "column", gap: 12 },
  card: {
    padding: "16px 20px", borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--surface)",
    display: "flex", flexDirection: "column", gap: 6,
  },
  cardHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardName: { fontSize: 16, fontWeight: 600, color: "var(--text)" },
  cardDistance: {
    fontSize: 13, fontWeight: 500, color: "var(--accent)",
    background: "var(--accent-dim)", padding: "2px 10px", borderRadius: 20,
  },
  cardAddress: { fontSize: 13, color: "var(--text-muted)" },
  cardDesc: { fontSize: 14, color: "var(--text)" },
  cardMeta: { fontSize: 13, color: "var(--text-muted)" },
  noResults: {
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: 12, padding: 40, color: "var(--text-muted)", textAlign: "center",
  },
  summary: {
    padding: "14px 18px", borderRadius: 10,
    background: "var(--surface)", border: "1px solid var(--border)",
    fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6,
  },
  placeholder: {
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    gap: 16, minHeight: 300,
    color: "var(--text-muted)",
  },
  placeholderText: { fontSize: 15, color: "var(--text-muted)", textAlign: "center" },
  footer: {
    textAlign: "center", padding: "16px",
    fontSize: 12, color: "var(--text-muted)",
    borderTop: "1px solid var(--border)",
    background: "var(--surface)",
  },
};
