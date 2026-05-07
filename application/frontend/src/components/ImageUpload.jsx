import React, { useState, useRef, useCallback } from "react";

export default function ImageUpload({ onAnalyze, loading }) {
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const inputRef = useRef(null);

  const handleFile = useCallback((f) => {
    if (!f || !f.type.startsWith("image/")) return;
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      handleFile(f);
    },
    [handleFile]
  );

  const handleInputChange = (e) => handleFile(e.target.files[0]);

  const handleSubmit = () => {
    if (file && !loading) onAnalyze(file);
  };

  const handleClear = () => {
    setFile(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div style={styles.wrapper}>
      <div
        style={{
          ...styles.dropzone,
          ...(dragOver ? styles.dropzoneActive : {}),
          ...(preview ? styles.dropzoneWithImage : {}),
        }}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => !preview && inputRef.current?.click()}
      >
        {preview ? (
          <div style={styles.previewWrapper}>
            <img src={preview} alt="Preview" style={styles.previewImg} />
            <button style={styles.clearBtn} onClick={(e) => { e.stopPropagation(); handleClear(); }}>
              ✕
            </button>
          </div>
        ) : (
          <div style={styles.placeholder}>
            <div style={styles.uploadIcon}>🖼️</div>
            <p style={styles.uploadText}>Drop an image here or <span style={styles.link}>browse</span></p>
            <p style={styles.uploadHint}>JPEG, PNG, GIF, WebP — max 10MB</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleInputChange}
        />
      </div>

      {file && (
        <div style={styles.fileInfo}>
          <span style={styles.fileName}>{file.name}</span>
          <span style={styles.fileSize}>{(file.size / 1024).toFixed(1)} KB</span>
        </div>
      )}

      <button
        style={{
          ...styles.analyzeBtn,
          ...((!file || loading) ? styles.analyzeBtnDisabled : {}),
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
            <span>🔍</span> Analyze Image
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
  dropzoneWithImage: { cursor: "default", border: "2px solid var(--border)" },
  placeholder: { textAlign: "center", padding: 32 },
  uploadIcon: { fontSize: 48, marginBottom: 12 },
  uploadText: { fontSize: 15, color: "var(--text-muted)", marginBottom: 6 },
  link: { color: "var(--accent)", cursor: "pointer" },
  uploadHint: { fontSize: 12, color: "var(--text-muted)" },
  previewWrapper: { width: "100%", position: "relative" },
  previewImg: { width: "100%", maxHeight: 320, objectFit: "contain", display: "block" },
  clearBtn: {
    position: "absolute", top: 8, right: 8,
    background: "rgba(0,0,0,0.6)", color: "#fff",
    border: "none", borderRadius: "50%",
    width: 28, height: 28, cursor: "pointer",
    fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center",
  },
  fileInfo: {
    display: "flex", justifyContent: "space-between",
    padding: "6px 4px", fontSize: 13,
  },
  fileName: { color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "75%" },
  fileSize: { color: "var(--text-muted)", flexShrink: 0 },
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

// inject keyframe for spinner
const styleEl = document.createElement("style");
styleEl.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(styleEl);
