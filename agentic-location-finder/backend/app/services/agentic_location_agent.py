from __future__ import annotations

import asyncio
import logging

from app.providers.google_maps_provider import get_place_details
from app.schemas.agentic_location_schema import (
    AgentStep,
    BaseCoordinates,
    LocationResult,
    ParsedQuery,
    SearchResponse,
)
from app.services.agents.geocoding_agent import geocode_location
from app.services.agents.places_search_agent import search_places
from app.services.agents.query_understanding_agent import understand_query
from app.services.agents.ranking_agent import rank_results
from app.services.agents.result_verification_agent import verify_results
from app.services.agents.search_planning_agent import plan_search
from app.services.agents.validation_agent import validate_query

logger = logging.getLogger(__name__)

_MAX_DETAIL_LOOKUPS = 5


def _step(step_id: str, status: str, message: str) -> AgentStep:
    return AgentStep(step=step_id, status=status, message=message)


def _build_result(place: dict) -> LocationResult:
    pid = place.get("place_id", "")
    return LocationResult(
        name=place.get("name", "Unknown"),
        address=place.get("vicinity") or place.get("formatted_address") or "",
        distance_km=place.get("_distance_km", 0.0),
        rating=place.get("rating"),
        reviews_count=int(place.get("user_ratings_total") or 0),
        phone=place.get("_phone"),
        maps_url=(
            f"https://www.google.com/maps/place/?q=place_id:{pid}" if pid else ""
        ),
        source="Google Places",
        relevance_score=place.get("_relevance_score", 0.5),
        outside_requested_radius=bool(place.get("_outside_radius")),
        place_id=pid,
    )


async def run_agent(query: str) -> SearchResponse:
    steps: list[AgentStep] = []

    # ── 1. Query understanding ─────────────────────────────────────────────
    steps.append(_step("query_understanding", "running", "Reading and understanding your query..."))
    try:
        raw = understand_query(query)
        parsed = ParsedQuery(
            intent=raw.get("intent", "nearby_place_search"),
            place_type=raw.get("place_type", ""),
            base_location=raw.get("base_location", ""),
            radius_km=float(raw.get("radius_km") or 2),
            city=raw.get("city"),
            filters=raw.get("filters") or {},
            confidence=float(raw.get("confidence") or 0.8),
        )
        steps[-1] = _step(
            "query_understanding",
            "completed",
            f"Extracted: {parsed.place_type!r} near {parsed.base_location!r}, radius {parsed.radius_km} km",
        )
    except Exception as exc:
        logger.exception("Query understanding failed")
        steps[-1] = _step("query_understanding", "failed", str(exc))
        return SearchResponse(
            agent_steps=steps,
            error="Could not understand the query. Please rephrase and try again.",
        )

    # ── 2. Validation ──────────────────────────────────────────────────────
    steps.append(_step("validation", "running", "Validating extracted information..."))
    parsed_dict = parsed.model_dump()
    val = validate_query(parsed_dict)
    if not val["valid"]:
        steps[-1] = _step("validation", "failed", val["message"])
        return SearchResponse(
            agent_steps=steps, parsed_query=parsed, error=val["message"]
        )
    # validation may have defaulted radius_km
    parsed = parsed.model_copy(update={"radius_km": parsed_dict["radius_km"]})
    steps[-1] = _step("validation", "completed", "All required fields are present")

    # ── 3. Geocoding ───────────────────────────────────────────────────────
    steps.append(
        _step("geocoding", "running", f"Resolving coordinates for '{parsed.base_location}'...")
    )
    locations = await geocode_location(parsed.base_location, parsed.city)
    if not locations:
        steps[-1] = _step("geocoding", "failed", "Location not found")
        return SearchResponse(
            agent_steps=steps,
            parsed_query=parsed,
            error=(
                f"Could not resolve '{parsed.base_location}'. "
                "Try a more specific address or include the city name."
            ),
        )
    base = locations[0]
    base_coords = BaseCoordinates(lat=base["lat"], lng=base["lng"])
    steps[-1] = _step(
        "geocoding", "completed", f"Resolved to: {base['formatted_address']}"
    )

    # ── 4. Search planning ─────────────────────────────────────────────────
    steps.append(_step("search_planning", "running", "Deciding optimal search strategy..."))
    strategy = plan_search(parsed.model_dump())
    steps[-1] = _step(
        "search_planning",
        "completed",
        f"Using {'nearby search' if strategy == 'nearby' else 'text search'} strategy",
    )

    # ── 5. Places search ───────────────────────────────────────────────────
    steps.append(_step("places_search", "running", "Querying Google Places API..."))
    try:
        raw_results = await search_places(
            parsed.model_dump(), {"lat": base_coords.lat, "lng": base_coords.lng}, strategy
        )
    except Exception as exc:
        logger.exception("Places search failed")
        steps[-1] = _step("places_search", "failed", str(exc))
        return SearchResponse(
            agent_steps=steps,
            parsed_query=parsed,
            base_coordinates=base_coords,
            error="Places search failed. Check your GOOGLE_MAPS_API_KEY.",
        )
    steps[-1] = _step(
        "places_search", "completed", f"Retrieved {len(raw_results)} candidate places"
    )

    # ── 6. Verification ────────────────────────────────────────────────────
    steps.append(_step("result_verification", "running", "Deduplicating and measuring distances..."))
    verified = verify_results(
        raw_results, {"lat": base_coords.lat, "lng": base_coords.lng}, parsed.radius_km
    )
    inside = sum(1 for p in verified if not p.get("_outside_radius"))
    steps[-1] = _step(
        "result_verification",
        "completed",
        f"{inside} within {parsed.radius_km} km, {len(verified) - inside} outside radius",
    )

    # ── 7. Ranking ─────────────────────────────────────────────────────────
    steps.append(_step("ranking", "running", "Scoring by distance, rating, and reviews..."))
    ranked = rank_results(verified)
    steps[-1] = _step(
        "ranking", "completed", f"Ranked {len(ranked)} results"
    )

    # ── Fetch phone numbers for top N results ──────────────────────────────
    top = ranked[:_MAX_DETAIL_LOOKUPS]
    detail_tasks = [
        get_place_details(p["place_id"]) for p in top if p.get("place_id")
    ]
    details = await asyncio.gather(*detail_tasks, return_exceptions=True)
    for i, detail in enumerate(details):
        if isinstance(detail, dict):
            top[i]["_phone"] = detail.get("formatted_phone_number")

    # ── Build final response ───────────────────────────────────────────────
    results = [_build_result(p) for p in ranked]
    inside_count = sum(1 for r in results if not r.outside_requested_radius)

    if results:
        summary = (
            f"Found {len(results)} {parsed.place_type}(s) near {parsed.base_location}. "
            f"{inside_count} within {parsed.radius_km} km."
        )
    else:
        summary = (
            f"No {parsed.place_type}s found near {parsed.base_location} "
            f"within {parsed.radius_km} km. Try increasing the radius."
        )

    return SearchResponse(
        agent_steps=steps,
        parsed_query=parsed,
        base_coordinates=base_coords,
        results=results,
        summary=summary,
    )
