from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    query: str


class ParsedQuery(BaseModel):
    intent: str = "nearby_place_search"
    place_type: str = ""
    base_location: str = ""
    radius_km: float = 2.0
    city: str | None = None
    filters: dict[str, Any] = Field(default_factory=dict)
    confidence: float = 0.9


class AgentStep(BaseModel):
    step: str
    status: str  # pending | running | completed | failed
    message: str


class BaseCoordinates(BaseModel):
    lat: float
    lng: float


class LocationResult(BaseModel):
    name: str
    address: str
    distance_km: float
    rating: float | None = None
    reviews_count: int = 0
    phone: str | None = None
    maps_url: str
    source: str = "Google Places"
    relevance_score: float = 0.5
    outside_requested_radius: bool = False
    place_id: str


class ParseQueryResponse(BaseModel):
    intent: str
    place_type: str
    base_location: str
    radius_km: float
    city: str | None
    confidence: float


class SearchResponse(BaseModel):
    agent_steps: list[AgentStep]
    parsed_query: ParsedQuery | None = None
    base_coordinates: BaseCoordinates | None = None
    results: list[LocationResult] = Field(default_factory=list)
    summary: str = ""
    error: str | None = None
    memory_context: list[str] | None = None