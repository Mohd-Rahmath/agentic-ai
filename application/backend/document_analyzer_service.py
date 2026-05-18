import io
import logging
import os
from typing import Optional

from openai import OpenAI
from fastapi import HTTPException
from rag_engine import RAGEngine

logger = logging.getLogger(__name__)


class DocumentAnalyzerService:
    ALLOWED_TYPES = {
        "text/plain",
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }
    MAX_DOC_SIZE = 20 * 1024 * 1024  # 20MB
    MAX_TEXT_CHARS = 12000  # truncate to fit model context
    MODEL = "qwen/qwen3-32b"

    SYSTEM_PROMPT = """You are an expert document analyst. When given document text:
1. Identify the document type and purpose
2. Summarize the key points and main themes
3. Extract any important data, facts, or conclusions
4. If similar past documents are provided, note any relationships or patterns

Be concise yet thorough. Structure your response clearly."""

    def __init__(self, rag_engine: RAGEngine):
        self.client = OpenAI(
            api_key=os.environ.get("GROQ_API_KEY"),
            base_url="https://api.groq.com/openai/v1",
        )
        self.rag = rag_engine

    def validate_document(self, content_type: str, file_bytes: bytes) -> None:
        if content_type not in self.ALLOWED_TYPES:
            raise HTTPException(
                status_code=400,
                detail="Unsupported document type. Allowed: PDF, TXT, DOCX",
            )
        if len(file_bytes) > self.MAX_DOC_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"Document too large. Max {self.MAX_DOC_SIZE // (1024 * 1024)}MB.",
            )

    def _extract_text(self, file_bytes: bytes, content_type: str) -> str:
        if content_type == "text/plain":
            return file_bytes.decode("utf-8", errors="replace")

        if content_type == "application/pdf":
            try:
                import fitz  # PyMuPDF
                doc = fitz.open(stream=file_bytes, filetype="pdf")
                text = "\n".join(page.get_text() for page in doc)
                doc.close()
                return text
            except Exception as e:
                raise HTTPException(status_code=422, detail=f"Failed to parse PDF: {e}")

        if content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            try:
                from docx import Document
                doc = Document(io.BytesIO(file_bytes))
                return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
            except Exception as e:
                raise HTTPException(status_code=422, detail=f"Failed to parse DOCX: {e}")

        raise HTTPException(status_code=400, detail="Unsupported document type.")

    def _assistant_message_text(self, message) -> Optional[str]:
        content = getattr(message, "content", None)
        if content is None:
            return None
        if isinstance(content, str):
            return content.strip() or None
        if isinstance(content, list):
            parts: list[str] = []
            for block in content:
                if isinstance(block, dict):
                    if block.get("type") == "text" and block.get("text"):
                        parts.append(str(block["text"]))
                else:
                    t = getattr(block, "text", None)
                    if isinstance(t, str) and t:
                        parts.append(t)
            return " ".join(parts).strip() or None
        return str(content).strip() or None

    def _require_completion_text(self, completion, step: str) -> str:
        if not completion.choices:
            raise HTTPException(
                status_code=502,
                detail=f"Model returned no choices ({step}). Try again.",
            )
        text = self._assistant_message_text(completion.choices[0].message)
        if text is None:
            fr = getattr(completion.choices[0], "finish_reason", None)
            raise HTTPException(
                status_code=502,
                detail=f"Model returned empty content ({step}, finish_reason={fr!r}).",
            )
        return text

    def _get_quick_summary(self, text: str) -> str:
        snippet = text[:3000]
        msg = self.client.chat.completions.create(
            model=self.MODEL,
            max_completion_tokens=200,
            messages=[
                {
                    "role": "user",
                    "content": f"In one sentence, what is this document about?\n\n{snippet}",
                }
            ],
        )
        return self._require_completion_text(msg, "quick summary")

    def _build_rag_context(self, query: str) -> str:
        similar = self.rag.retrieve_similar(query, top_k=3)
        if not similar:
            return ""
        context = "\n\nSimilar past documents for context:\n"
        for i, s in enumerate(similar, 1):
            context += f"{i}. [{s['filename']}]: {s['description'][:200]}\n"
        return context

    def _get_full_analysis(self, text: str, rag_context: str) -> str:
        truncated = text[: self.MAX_TEXT_CHARS]
        msg = self.client.chat.completions.create(
            model=self.MODEL,
            max_completion_tokens=1024,
            messages=[
                {"role": "system", "content": self.SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"Analyze this document in detail.{rag_context}\n\n"
                        f"Document content:\n{truncated}"
                    ),
                },
            ],
        )
        return self._require_completion_text(msg, "full analysis")

    def analyze_document(self, file_bytes: bytes, content_type: str, filename: str) -> dict:
        logger.info(
            "Analyzing document: %s (%s, %d bytes)", filename, content_type, len(file_bytes)
        )

        self.validate_document(content_type, file_bytes)
        text = self._extract_text(file_bytes, content_type)

        if not text.strip():
            raise HTTPException(
                status_code=422, detail="Document appears to be empty or unreadable."
            )

        quick_summary = self._get_quick_summary(text)
        rag_context = self._build_rag_context(quick_summary)
        analysis = self._get_full_analysis(text, rag_context)

        doc_id = self.rag.store(analysis, filename or "unknown")

        return {
            "id": doc_id,
            "filename": filename,
            "quick_summary": quick_summary,
            "analysis": analysis,
            "char_count": len(text),
            "similar_past_analyses": self.rag.retrieve_similar(quick_summary, top_k=3),
        }
