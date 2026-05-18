import React from "react";

export default function DocumentResult({ result, error }) {
  if (error) {
    return (
      <div style={styles.errorCard}>
        <span style={styles.errorIcon}>⚠️</span>
        <p style={styles.errorText}>{error}</p>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <span style={styles.headerIcon}>🤖</span>
          <h3 style={styles.cardTitle}>Document Analysis</h3>
          <span style={styles.filename}>{result.filename}</span>
        </div>

        {result.quick_summary && (
          <div style={styles.summaryBox}>
            <span style={styles.summaryLabel}>Summary</span>
            <p style={styles.summaryText}>{result.quick_summary}</p>
          </div>
        )}

        <div style={styles.analysisText}>
          {result.analysis.split("\n").map((line, i) =>
            line.trim() ? <p key={i} style={styles.paragraph}>{line}</p> : <br key={i} />
          )}
        </div>

        {result.char_count != null && (
          <div style={styles.meta}>
            <span style={styles.metaChip}>
              {result.char_count.toLocaleString()} characters extracted
            </span>
          </div>
        )}
      </div>

      {result.similar_past_analyses?.length > 0 && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.headerIcon}>📚</span>
            <h3 style={styles.cardTitle}>RAG Context — Similar Past Documents</h3>
          </div>
          <div style={styles.similarList}>
            {result.similar_past_analyses.map((item, i) => (
              <div key={i} style={styles.similarItem}>
                <div style={styles.similarMeta}>
                  <span style={styles.similarFile}>📄 {item.filename || "unknown"}</span>
                  {item.distance != null && (
                    <span style={styles.similarScore}>
                      {((1 - item.distance) * 100).toFixed(1)}% match
                    </span>
                  )}
                </div>
                <p style={styles.similarText}>
                  {item.description.length > 250
                    ? item.description.slice(0, 250) + "…"
                    : item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: { display: "flex", flexDirection: "column", gap: 16 },
  card: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: 20,
  },
  cardHeader: {
    display: "flex", alignItems: "center", gap: 10,
    marginBottom: 16, flexWrap: "wrap",
  },
  headerIcon: { fontSize: 20 },
  cardTitle: { fontSize: 16, fontWeight: 600, color: "var(--text)" },
  filename: {
    marginLeft: "auto", fontSize: 12,
    color: "var(--text-muted)",
    background: "var(--surface2)",
    padding: "2px 8px", borderRadius: 6,
  },
  summaryBox: {
    background: "var(--accent-dim)",
    border: "1px solid var(--accent)",
    borderRadius: 8,
    padding: "10px 14px",
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 11, fontWeight: 700, color: "var(--accent)",
    textTransform: "uppercase", letterSpacing: "0.05em",
    display: "block", marginBottom: 4,
  },
  summaryText: { fontSize: 13, color: "var(--text)", lineHeight: 1.6 },
  analysisText: { color: "var(--text)", fontSize: 14, lineHeight: 1.8 },
  paragraph: { marginBottom: 8 },
  meta: { marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" },
  metaChip: {
    fontSize: 11, color: "var(--text-muted)",
    background: "var(--surface2)",
    padding: "2px 8px", borderRadius: 6,
  },
  similarList: { display: "flex", flexDirection: "column", gap: 12 },
  similarItem: {
    background: "var(--surface2)",
    borderRadius: 8, padding: 14,
    borderLeft: "3px solid var(--accent)",
  },
  similarMeta: {
    display: "flex", justifyContent: "space-between",
    marginBottom: 8, flexWrap: "wrap", gap: 4,
  },
  similarFile: { fontSize: 12, color: "var(--accent)", fontWeight: 500 },
  similarScore: {
    fontSize: 11, color: "var(--success)",
    background: "rgba(76, 175, 138, 0.1)",
    padding: "2px 8px", borderRadius: 10,
  },
  similarText: { fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 },
  errorCard: {
    background: "rgba(239, 83, 80, 0.1)",
    border: "1px solid rgba(239, 83, 80, 0.3)",
    borderRadius: "var(--radius)", padding: 16,
    display: "flex", alignItems: "flex-start", gap: 10,
  },
  errorIcon: { fontSize: 20, flexShrink: 0 },
  errorText: { color: "var(--error)", fontSize: 14, lineHeight: 1.6 },
};
