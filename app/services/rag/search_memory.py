from __future__ import annotations

import hashlib
import logging
import os

logger = logging.getLogger(__name__)

_collection = None
_SIMILARITY_THRESHOLD = 0.5


def _get_collection():
    global _collection
    if _collection is not None:
        return _collection
    try:
        import chromadb
        from chromadb.utils.embedding_functions import DefaultEmbeddingFunction

        db_path = os.path.join(os.path.dirname(__file__), "../../../data/chromadb")
        os.makedirs(db_path, exist_ok=True)
        client = chromadb.PersistentClient(path=db_path)
        _collection = client.get_or_create_collection(
            "search_memory",
            embedding_function=DefaultEmbeddingFunction(),
        )
        logger.info("RAG search memory initialised at %s", db_path)
    except Exception as exc:
        logger.warning("ChromaDB unavailable — RAG memory disabled: %s", exc)
        _collection = None
    return _collection


def store(
    query: str,
    place_type: str,
    location: str,
    radius_km: float,
    result_count: int,
    summary: str,
) -> None:
    col = _get_collection()
    if col is None:
        return
    try:
        doc = f"Search for {place_type} near {location} within {radius_km} km. {summary}"
        doc_id = hashlib.md5(query.lower().strip().encode()).hexdigest()
        col.upsert(
            ids=[doc_id],
            documents=[doc],
            metadatas=[{
                "query": query,
                "place_type": place_type,
                "location": location,
                "radius_km": radius_km,
                "result_count": result_count,
            }],
        )
    except Exception as exc:
        logger.warning("Failed to store search memory: %s", exc)


def retrieve(query: str, k: int = 2) -> list[str]:
    col = _get_collection()
    if col is None:
        return []
    try:
        count = col.count()
        if count == 0:
            return []
        results = col.query(query_texts=[query], n_results=min(k, count))
        docs = results.get("documents", [[]])[0]
        distances = results.get("distances", [[]])[0]
        return [doc for doc, dist in zip(docs, distances) if dist < _SIMILARITY_THRESHOLD]
    except Exception as exc:
        logger.warning("Failed to retrieve search memory: %s", exc)
        return []
