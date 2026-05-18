import base64
import io
import logging
import os
from typing import Optional

from PIL import Image
from openai import OpenAI
from fastapi import HTTPException
from rag_engine import RAGEngine

logger = logging.getLogger(__name__)


class ImageAnalyzerService:
    """Service for analyzing images using OpenAI vision API and RAG context."""
    
    ALLOWED_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
    MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
    MODEL = "google/gemma-4-31b-it:free"
    
    SYSTEM_PROMPT = """You are an expert image analyst. When given an image:
1. Identify what is shown (objects, scenes, people, text, etc.)
2. Describe colors, composition, and notable details
3. Provide context or interesting facts if relevant
4. If similar past analyses are provided, note any relationships

Be concise yet informative. Structure your response clearly."""

    def __init__(self, rag_engine: RAGEngine):
        """Initialize with OpenAI client and RAG engine."""
        self.client = OpenAI(
            api_key=os.environ.get("OPENROUTER_API_KEY"),
            base_url="https://openrouter.ai/api/v1",
        )
        self.rag = rag_engine

    def validate_image(self, content_type: str, image_bytes: bytes) -> None:
        """Validate image type and size. Raises HTTPException if invalid."""
        if content_type not in self.ALLOWED_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported image type. Allowed: {', '.join(self.ALLOWED_TYPES)}"
            )
        
        if len(image_bytes) > self.MAX_IMAGE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"Image too large. Max {self.MAX_IMAGE_SIZE // (1024*1024)}MB."
            )

    def _assistant_message_text(self, message) -> Optional[str]:
        """Extract and normalize assistant message content to text."""
        content = getattr(message, "content", None)
        if content is None:
            return None
        
        if isinstance(content, str):
            s = content.strip()
            return s or None
        
        if isinstance(content, list):
            parts: list[str] = []
            for block in content:
                if isinstance(block, dict):
                    if block.get("type") == "text" and block.get("text"):
                        parts.append(str(block["text"]))
                    elif isinstance(block.get("text"), str):
                        parts.append(block["text"])
                else:
                    t = getattr(block, "text", None)
                    if isinstance(t, str) and t:
                        parts.append(t)
            
            joined = " ".join(parts).strip()
            return joined or None
        
        return str(content).strip() or None

    def _require_completion_text(self, completion, step: str) -> str:
        """Extract text from completion or raise HTTPException."""
        if not completion.choices:
            raise HTTPException(
                status_code=502,
                detail=f"Model returned no choices ({step}). Try again in a moment.",
            )
        
        text = self._assistant_message_text(completion.choices[0].message)
        if text is None:
            fr = getattr(completion.choices[0], "finish_reason", None)
            raise HTTPException(
                status_code=502,
                detail=(
                    f"Model returned empty content ({step}, finish_reason={fr!r}). "
                    "Free-tier vision models sometimes do this when overloaded or for unsupported inputs—retry or try another image."
                ),
            )
        return text

    MAX_SIDE_PX = 1024  # resize long edge to this before encoding
    MAX_B64_BYTES = 4 * 1024 * 1024  # ~3 MB raw → ~4 MB base64

    def _encode_image_to_data_url(self, image_bytes: bytes, content_type: str) -> str:
        """Resize image to fit model context limits, then encode as data URL."""
        try:
            img = Image.open(io.BytesIO(image_bytes))
            if img.mode in ("RGBA", "P", "LA"):
                img = img.convert("RGB")

            if max(img.size) > self.MAX_SIDE_PX:
                img.thumbnail((self.MAX_SIDE_PX, self.MAX_SIDE_PX), Image.LANCZOS)

            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=85)
            image_bytes = buf.getvalue()
            content_type = "image/jpeg"
        except Exception as e:
            logger.warning("PIL resize failed, using original bytes: %s", e)

        if len(image_bytes) > self.MAX_B64_BYTES:
            raise HTTPException(status_code=413, detail="Image too large to encode for model.")

        b64_image = base64.standard_b64encode(image_bytes).decode("utf-8")
        return f"data:{content_type};base64,{b64_image}"

    def _get_quick_description(self, data_url: str) -> str:
        """Get quick one-sentence description of image for RAG query."""
        msg = self.client.chat.completions.create(
            model=self.MODEL,
            max_tokens=200,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": data_url}},
                        {"type": "text", "text": "In one sentence, what is shown in this image?"},
                    ],
                }
            ],
        )
        return self._require_completion_text(msg, "quick description")

    def _build_rag_context(self, query: str) -> str:
        """Retrieve similar past analyses and format as context."""
        similar = self.rag.retrieve_similar(query, top_k=3)
        
        if not similar:
            return ""
        
        context = "\n\nSimilar past analyses for context:\n"
        for i, s in enumerate(similar, 1):
            context += f"{i}. [{s['filename']}]: {s['description'][:200]}\n"
        
        return context

    def _get_full_analysis(self, data_url: str, rag_context: str) -> str:
        """Get detailed analysis of image with RAG context."""
        msg = self.client.chat.completions.create(
            model=self.MODEL,
            max_tokens=1024,
            messages=[
                {"role": "system", "content": self.SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": data_url}},
                        {"type": "text", "text": f"Analyze this image in detail.{rag_context}"},
                    ],
                },
            ],
        )
        return self._require_completion_text(msg, "full analysis")

    def analyze_image(self, image_bytes: bytes, content_type: str, filename: str) -> dict:
        """
        Main analysis pipeline:
        1. Validate image
        2. Get quick description for RAG query
        3. Retrieve similar past analyses
        4. Get detailed analysis with RAG context
        5. Store in RAG vector database
        
        Returns dict with analysis results.
        """
        logger.info("Analyzing image: %s (%s, %d bytes)", filename, content_type, len(image_bytes))

        # Validate
        self.validate_image(content_type, image_bytes)
        
        # Encode image
        data_url = self._encode_image_to_data_url(image_bytes, content_type)
        
        # Get quick description for RAG retrieval
        quick_desc = self._get_quick_description(data_url)
        
        # Build RAG context
        rag_context = self._build_rag_context(quick_desc)
        
        # Get full analysis
        analysis = self._get_full_analysis(data_url, rag_context)
        
        # Store in RAG
        doc_id = self.rag.store(analysis, filename or "unknown")
        
        return {
            "id": doc_id,
            "quick_description": quick_desc,
            "analysis": analysis,
            "similar_analyses": self.rag.retrieve_similar(quick_desc, top_k=3),
        }
