import React, { useState } from "react";

export default function HistoryPanel({ history }) {
  const [expanded, setExpanded] = useState(null);

  if (!history || history.length === 0) {
    return (
      <div style={styles.empty}>
        <span style={{ fontSize: 32 }}>🗂️</span>
        <p style={styles.emptyText}>No past analyses yet. Upload an image to get started!</p>
      </div>
    );
  }

  return (
    <div style={styles.list}>
      {history.map((item) => (
        <div key={item.id} style={styles.item}>
          <div style={styles.itemHeader} onClick={() => setExpanded(expanded === item.id ? null : item.id)}>
            <div style={styles.itemMeta}>
              <span style={styles.itemFile}>📄 {item.filename}</span>
              <span style={styles.itemTime}>
                {new Date(item.timestamp).toLocaleString()}
              </span>
            </div>
            <span style={styles.chevron}>{expanded === item.id ? "▲" : "▼"}</span>
          </div>
          {expanded === item.id && (
            <div style={styles.itemBody}>
              {item.description.split("\n").map((line, i) =>
                line.trim() ? <p key={i} style={styles.line}>{line}</p> : <br key={i} />
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const styles = {
  list: { display: "flex", flexDirection: "column", gap: 8 },
  item: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    overflow: "hidden",
  },
  itemHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "12px 16px", cursor: "pointer",
    transition: "background 0.15s",
  },
  itemMeta: { display: "flex", flexDirection: "column", gap: 2 },
  itemFile: { fontSize: 14, color: "var(--text)", fontWeight: 500 },
  itemTime: { fontSize: 12, color: "var(--text-muted)" },
  chevron: { fontSize: 10, color: "var(--text-muted)" },
  itemBody: { padding: "0 16px 14px", borderTop: "1px solid var(--border)" },
  line: { fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7, marginTop: 8 },
  empty: {
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: 12, padding: 40, color: "var(--text-muted)", textAlign: "center",
  },
  emptyText: { fontSize: 14 },
};
