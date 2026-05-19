import React, { useState } from "react";

const EXAMPLES = [
  "Find me a good coffee shop near Connaught Place, Delhi within 1km",
  "Best pharmacy near Koramangala, Bangalore within 500m",
  "Restaurants near Gateway of India, Mumbai within 2km",
];

export default function AgentSearchBox({ onSearch, loading }) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim() && !loading) onSearch(query.trim());
  };

  return (
    <div style={styles.wrapper}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <textarea
          style={styles.textarea}
          rows={3}
          placeholder="Describe what you are looking for and where..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
          }}
          disabled={loading}
        />
        <button
          type="submit"
          style={{ ...styles.btn, ...(loading || !query.trim() ? styles.btnDisabled : {}) }}
          disabled={loading || !query.trim()}
        >
          {loading ? (
            <span style={styles.btnInner}><span style={styles.spinner} />Searching...</span>
          ) : (
            <span style={styles.btnInner}>🔍 Find Locations</span>
          )}
        </button>
      </form>

      <div style={styles.examples}>
        <p style={styles.examplesLabel}>Try an example:</p>
        <div style={styles.exampleChips}>
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              style={styles.chip}
              onClick={() => setQuery(ex)}
              disabled={loading}
            >
              {ex}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: { display: "flex", flexDirection: "column", gap: 16 },
  form: { display: "flex", flexDirection: "column", gap: 10 },
  textarea: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 10,
    border: "1.5px solid var(--border)",
    background: "var(--surface)",
    color: "var(--text)",
    fontSize: 15,
    resize: "vertical",
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  btn: {
    padding: "12px 24px",
    borderRadius: 10,
    border: "none",
    background: "var(--accent)",
    color: "#fff",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.2s",
  },
  btnDisabled: { background: "var(--surface2)", color: "var(--text-muted)", cursor: "not-allowed" },
  btnInner: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8 },
  spinner: {
    width: 16, height: 16,
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "#fff",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
    display: "inline-block",
  },
  examples: { display: "flex", flexDirection: "column", gap: 8 },
  examplesLabel: { fontSize: 12, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" },
  exampleChips: { display: "flex", flexDirection: "column", gap: 6 },
  chip: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--surface)",
    color: "var(--text-muted)",
    fontSize: 13,
    cursor: "pointer",
    textAlign: "left",
    transition: "border-color 0.15s",
  },
};
