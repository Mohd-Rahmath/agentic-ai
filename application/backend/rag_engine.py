import uuid
import chromadb
from chromadb.utils.embedding_functions import DefaultEmbeddingFunction
from datetime import datetime


class RAGEngine:
    def __init__(self, persist_dir: str = "./chroma_db"):
        self.client = chromadb.PersistentClient(path=persist_dir)
        self.embed_fn = DefaultEmbeddingFunction()
        self.collection = self.client.get_or_create_collection(
            name="image_analyses",
            embedding_function=self.embed_fn,
            metadata={"hnsw:space": "cosine"},
        )

    def store(self, description: str, filename: str) -> str:
        doc_id = str(uuid.uuid4())
        self.collection.add(
            documents=[description],
            metadatas=[{"filename": filename, "timestamp": datetime.utcnow().isoformat()}],
            ids=[doc_id],
        )
        return doc_id

    def retrieve_similar(self, query: str, top_k: int = 3) -> list[dict]:
        count = self.collection.count()
        if count == 0:
            return []
        results = self.collection.query(
            query_texts=[query],
            n_results=min(top_k, count),
        )
        similar = []
        for i, doc in enumerate(results["documents"][0]):
            similar.append(
                {
                    "description": doc,
                    "filename": results["metadatas"][0][i].get("filename", ""),
                    "timestamp": results["metadatas"][0][i].get("timestamp", ""),
                    "distance": results["distances"][0][i] if results.get("distances") else None,
                }
            )
        return similar

    def get_all(self) -> list[dict]:
        count = self.collection.count()
        if count == 0:
            return []
        results = self.collection.get()
        entries = []
        for i, doc in enumerate(results["documents"]):
            entries.append(
                {
                    "id": results["ids"][i],
                    "description": doc,
                    "filename": results["metadatas"][i].get("filename", ""),
                    "timestamp": results["metadatas"][i].get("timestamp", ""),
                }
            )
        entries.sort(key=lambda x: x["timestamp"], reverse=True)
        return entries
