import logging

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from pydantic import BaseModel

from rag_engine import RAGEngine
from image_analyzer_service import ImageAnalyzerService
from document_analyzer_service import DocumentAnalyzerService
from agentic_location_service import AgenticLocationService

# Initialize services
rag = RAGEngine()
analyzer = ImageAnalyzerService(rag)

doc_rag = RAGEngine(collection_name="document_analyses")
doc_analyzer = DocumentAnalyzerService(doc_rag)

location_service = AgenticLocationService()

# Create FastAPI app
app = FastAPI(title="RAG Image Recognition API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    """Analyze an uploaded image and store results in RAG database."""
    image_bytes = await file.read()
    content_type = file.content_type or "application/octet-stream"
    filename = file.filename or "unknown"

    try:
        result = await run_in_threadpool(
            analyzer.analyze_image, image_bytes, content_type, filename
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return JSONResponse(
        content={
            "id": result["id"],
            "filename": filename,
            "quick_description": result["quick_description"],
            "analysis": result["analysis"],
            "similar_past_analyses": result["similar_analyses"],
        }
    )


@app.get("/history")
def get_history():
    return {"history": rag.get_all()}


@app.post("/analyze-document")
async def analyze_document(file: UploadFile = File(...)):
    """Analyze an uploaded document (PDF, TXT, DOCX) and store results in RAG database."""
    file_bytes = await file.read()
    content_type = file.content_type or "application/octet-stream"
    filename = file.filename or "unknown"

    try:
        result = await run_in_threadpool(
            doc_analyzer.analyze_document, file_bytes, content_type, filename
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return JSONResponse(
        content={
            "id": result["id"],
            "filename": filename,
            "quick_summary": result["quick_summary"],
            "analysis": result["analysis"],
            "char_count": result["char_count"],
            "similar_past_analyses": result["similar_past_analyses"],
        }
    )


@app.get("/document-history")
def get_document_history():
    return {"history": doc_rag.get_all()}


class LocationSearchRequest(BaseModel):
    query: str


@app.post("/agentic-location/search")
async def agentic_location_search(body: LocationSearchRequest):
    if not body.query.strip():
        raise HTTPException(status_code=400, detail="Query must not be empty.")
    try:
        result = await run_in_threadpool(location_service.search, body.query)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return JSONResponse(content=result)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
