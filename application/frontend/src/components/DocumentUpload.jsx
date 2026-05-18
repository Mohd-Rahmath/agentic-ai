import React, { useState, useRef, useCallback } from "react";

const ALLOWED_EXTENSIONS = [".pdf", ".txt", ".docx"];
const ALLOWED_MIME = new Set([
  "text/plain",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function fileIcon(name) {
  if (!name) return "📄";
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "📕";
  if (ext === "docx" || ext === "doc") return "📘";
  return "📄";
}

export default function DocumentUpload({ onAnalyze, loading }) {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const inputRef = useRef(null);

  const handleFile = useCallback((f) => {
    if (!f) return;
    if (!ALLOWED_MIME.has(f.type) && !ALLOWED_EXTENSIONS.some((e) => f.name.endsWith(e))) return;
    setFile(f);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      handleFile(e.dataTransfer.files[0]);
    },
    [handleFile]
  );

  const handleInputChange = (e) => handleFile(e.target.files[0]);

  const handleSubmit = () => {
    if (file && !loading) onAnalyze(file);
  };

  const handleClear = () => {
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div style={styles.wrapper}>
      <div
        style={{
          ...styles.dropzone,
          ...(dragOver ? styles.dropzoneActive : {}),
          ...(file ? styles.dropzoneWithFile : {}),
        }}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => !file && inputRef.current?.click()}
      >
        {file ? (
          <div style={styles.filePreview}>
            <span style={styles.filePreviewIcon}>{fileIcon(file.name)}</span>
            <div style={styles.filePreviewInfo}>
              <span style={styles.filePreviewName}>{file.name}</span>
              <span style={styles.filePreviewSize}>{(file.size / 1024).toFixed(1)} KB</span>
            </div>
            <button
              style={styles.clearBtn}
              onClick={(e) => { e.stopPropagation(); handleClear(); }}
            >
              ✕
            </button>
          </div>
        ) : (
          <div style={styles.placeholder}>
            <div style={styles.uploadIcon}>📂</div>
            <p style={styles.uploadText}>
              Drop a document here or <span style={styles.link}>browse</span>
            </p>
            <p style={styles.uploadHint}>PDF, TXT, DOCX — max 20MB</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.docx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          style={{ display: "none" }}
          onChange={handleInputChange}
        />
      </div>

      <button
        style={{
          ...styles.analyzeBtn,
          ...(!file || loading ? styles.analyzeBtnDisabled : {}),
        }}
        onClick={handleSubmit}
        disabled={!file || loading}
      >
        {loading ? (
          <span style={styles.btnContent}>
            <span style={styles.spinner} />
            Analyzing...
          </span>
        ) : (
          <span style={styles.btnContent}>
            <span>🔍</span> Analyze Document
          </span>
        )}
      </button>
    </div>
  );
}

const styles = {
  wrapper: { display: "flex", flexDirection: "column", gap: 12 },
  dropzone: {
    border: "2px dashed var(--border)",
    borderRadius: "var(--radius)",
    background: "var(--surface)",
    cursor: "pointer",
    transition: "all 0.2s ease",
    minHeight: 220,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  dropzoneActive: {
    borderColor: "var(--accent)",
    background: "var(--accent-dim)",
  },
  dropzoneWithFile: { cursor: "default", border: "2px solid var(--border)" },
  placeholder: { textAlign: "center", padding: 32 },
  uploadIcon: { fontSize: 48, marginBottom: 12 },
  uploadText: { fontSize: 15, color: "var(--text-muted)", marginBottom: 6 },
  link: { color: "var(--accent)", cursor: "pointer" },
  uploadHint: { fontSize: 12, color: "var(--text-muted)" },
  filePreview: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "24px 28px",
    width: "100%",
  },
  filePreviewIcon: { fontSize: 40, flexShrink: 0 },
  filePreviewInfo: { flex: 1, display: "flex", flexDirection: "column", gap: 4, overflow: "hidden" },
  filePreviewName: {
    fontSize: 14, fontWeight: 600, color: "var(--text)",
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  },
  filePreviewSize: { fontSize: 12, color: "var(--text-muted)" },
  clearBtn: {
    flexShrink: 0,
    background: "var(--surface2)", color: "var(--text-muted)",
    border: "1px solid var(--border)", borderRadius: "50%",
    width: 28, height: 28, cursor: "pointer",
    fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center",
  },
  analyzeBtn: {
    padding: "12px 24px", borderRadius: "var(--radius)",
    background: "var(--accent)", color: "#fff",
    border: "none", fontSize: 15, fontWeight: 600,
    cursor: "pointer", transition: "background 0.2s",
    width: "100%",
  },
  analyzeBtnDisabled: { background: "var(--surface2)", color: "var(--text-muted)", cursor: "not-allowed" },
  btnContent: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8 },
  spinner: {
    width: 16, height: 16,
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "#fff",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
    display: "inline-block",
  },
};
