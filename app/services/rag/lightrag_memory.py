from __future__ import annotations

import asyncio
import logging
import os
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

_rag = None
_WORKING_DIR = os.path.join(os.path.dirname(__file__), "../../../data/lightrag")
_HAIKU = "claude-haiku-4-5-20251001"
_EMBED_DIM = 384  # all-MiniLM-L6-v2 via ChromaDB ONNX


# ── LLM function (Claude Haiku — cheap for graph extraction) ───────────────────

async def _claude_llm(
    prompt: str,
    system_prompt: Optional[str] = None,
    history_messages: list = [],
    **kwargs,
) -> str:
    import anthropic
    client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
    sys = system_prompt or "You are a helpful knowledge extraction assistant."
    response = client.messages.create(
        model=_HAIKU,
        max_tokens=2048,
        system=sys,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text


# ── Embedding function (ChromaDB ONNX — no HuggingFace needed) ────────────────

async def _chroma_embed(texts: list[str]) -> np.ndarray:
    from chromadb.utils.embedding_functions import DefaultEmbeddingFunction
    ef = DefaultEmbeddingFunction()
    embeddings = ef(texts)
    return np.array(embeddings, dtype=np.float32)


# ── Lazy init ──────────────────────────────────────────────────────────────────

def _get_rag():
    global _rag
    if _rag is not None:
        return _rag
    try:
        from lightrag import LightRAG

        try:
            from lightrag.utils.embedding import EmbeddingFunc
        except ImportError:
            from lightrag.utils import EmbeddingFunc

        os.makedirs(_WORKING_DIR, exist_ok=True)
        _rag = LightRAG(
            working_dir=_WORKING_DIR,
            llm_model_func=_claude_llm,
            embedding_func=EmbeddingFunc(
                embedding_dim=_EMBED_DIM,
                max_token_size=512,
                func=_chroma_embed,
            ),
        )
        logger.info("LightRAG knowledge graph initialised at %s", _WORKING_DIR)
    except Exception as exc:
        logger.warning("LightRAG unavailable — falling back to ChromaDB: %s", exc)
        _rag = None
    return _rag


# ── Public API ─────────────────────────────────────────────────────────────────

async def retrieve(query: str) -> list[str]:
    """Query the knowledge graph. Returns list with one rich string, or empty."""
    rag = _get_rag()
    if rag is None:
        return []
    try:
        from lightrag import QueryParam
        result = await rag.aquery(query, param=QueryParam(mode="hybrid"))
        if result and result.strip() and result.strip().lower() not in ("none", "no information"):
            return [result.strip()]
    except Exception as exc:
        logger.warning("LightRAG query failed: %s", exc)
    return []


async def store(
    query: str,
    place_type: str,
    location: str,
    radius_km: float,
    results: list[dict],
    summary: str,
) -> None:
    """Insert a completed search into the knowledge graph (run in background)."""
    rag = _get_rag()
    if rag is None:
        return
    try:
        lines = [
            f"Location search query: {query}",
            f"Place type searched: {place_type}",
            f"Base location: {location}, India",
            f"Search radius: {radius_km} km",
            f"Result summary: {summary}",
            "",
            "Places found:",
        ]
        for r in results[:10]:
            name = r.get("name", "Unknown")
            addr = r.get("address", "")
            rating = r.get("rating")
            dist = r.get("distance_km", 0)
            phone = r.get("phone") or ""
            parts = [f"- {name}", addr, f"Rating: {rating}" if rating else "", f"{dist}km away", phone]
            lines.append(" | ".join(p for p in parts if p))

        doc = "\n".join(lines)
        await rag.ainsert(doc)
        logger.info("LightRAG: stored knowledge for '%s near %s'", place_type, location)
    except Exception as exc:
        logger.warning("LightRAG insert failed: %s", exc)
