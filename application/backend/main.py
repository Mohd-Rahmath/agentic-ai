import os
import base64
from typing import Optional

import anthropic
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from rag_engine import RAGEngine

app = FastAPI(title="RAG Image Recognition API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rag = RAGEngine()
claude = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = """You are an expert image analyst. When given an image:
1. Identify what is shown (objects, scenes, people, text, etc.)
2. Describe colors, composition, and notable details
3. Provide context or interesting facts if relevant
4. If similar past analyses are provided, note any relationships

Be concise yet informative. Structure your response clearly."""


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    allowed = {"image/jpeg", "image/png", "image/gif", "image/webp"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Unsupported image type. Use JPEG, PNG, GIF, or WebP.")

    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large. Max 10MB.")

    b64_image = base64.standard_b64encode(image_bytes).decode("utf-8")
    media_type = file.content_type

    # Step 1: Quick first-pass description to use as RAG query
    quick_msg = claude.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=200,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": b64_image}},
                    {"type": "text", "text": "In one sentence, what is shown in this image?"},
                ],
            }
        ],
    )
    quick_desc = quick_msg.content[0].text.strip()

    # Step 2: Retrieve similar past analyses from RAG
    similar = rag.retrieve_similar(quick_desc, top_k=3)

    # Step 3: Build full analysis prompt with RAG context
    rag_context = ""
    if similar:
        rag_context = "\n\nSimilar past analyses for context:\n"
        for i, s in enumerate(similar, 1):
            rag_context += f"{i}. [{s['filename']}]: {s['description'][:200]}\n"

    full_msg = claude.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": b64_image}},
                    {"type": "text", "text": f"Analyze this image in detail.{rag_context}"},
                ],
            }
        ],
    )
    analysis = full_msg.content[0].text.strip()

    # Step 4: Store analysis in RAG vector store
    doc_id = rag.store(analysis, file.filename or "unknown")

    return JSONResponse(
        content={
            "id": doc_id,
            "filename": file.filename,
            "analysis": analysis,
            "similar_past_analyses": similar,
        }
    )


@app.get("/history")
def get_history():
    return {"history": rag.get_all()}
