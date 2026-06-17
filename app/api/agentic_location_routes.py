from __future__ import annotations

import logging

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.schemas.agentic_location_schema import (
    ParseQueryResponse,
    QueryRequest,
    SearchResponse,
)
from app.services.agents.query_understanding_agent import understand_query
from app.services.agentic_location_agent import run_agent, stream_agent

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/agentic-location", tags=["agentic-location"])


@router.post("/parse-query", response_model=ParseQueryResponse)
async def parse_query(body: QueryRequest):
    """Parse a natural language query and return structured intent."""
    parsed = understand_query(body.query)
    return ParseQueryResponse(
        intent=parsed.get("intent", "nearby_place_search"),
        place_type=parsed.get("place_type", ""),
        base_location=parsed.get("base_location", ""),
        radius_km=float(parsed.get("radius_km") or 2),
        city=parsed.get("city"),
        confidence=float(parsed.get("confidence") or 0.8),
    )


@router.post("/search", response_model=SearchResponse)
async def search(body: QueryRequest):
    """Run the full agentic search pipeline (blocking, returns complete response)."""
    return await run_agent(body.query)


@router.post("/search/stream")
async def search_stream(body: QueryRequest):
    """Run the agentic search pipeline with real-time SSE streaming + RAG memory."""
    return StreamingResponse(
        stream_agent(body.query),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
