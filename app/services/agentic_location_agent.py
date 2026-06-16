from __future__ import annotations

import asyncio
import json
import logging
import os
from math import asin, cos, radians, sin, sqrt

import anthropic

from app.providers.google_maps_provider import (
    get_place_details,
    nearby_search,
    text_search,
)
from app.schemas.agentic_location_schema import (
    AgentStep,
    BaseCoordinates,
    LocationResult,
    ParsedQuery,
    SearchResponse,
)
from app.services.agents.geocoding_agent import geocode_location
from app.services.agents.query_understanding_agent import understand_query
from app.services.agents.validation_agent import validate_query

logger = logging.getLogger(__name__)

_client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
MODEL = "claude-sonnet-4-6"

_TOOLS: list[dict] = [
    {
        "name": "geocode_location",
        "description": (
            "Convert a location string to geographic coordinates (lat/lng). "
            "Always call this first to resolve the user's base location."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "Location string to geocode (e.g. '27 kilometer Hyderabad', 'Gachibowli')",
                },
                "city": {
                    "type": "string",
                    "description": "Optional city hint to improve accuracy",
                },
            },
            "required": ["location"],
        },
    },
    {
        "name": "search_nearby_places",
        "description": (
            "Search for places near coordinates using Google Places Nearby Search. "
            "Best for standard place types: restaurant, cafe, hotel, park, bar, gym, bank, etc."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "lat": {"type": "number", "description": "Latitude of centre point"},
                "lng": {"type": "number", "description": "Longitude of centre point"},
                "keyword": {
                    "type": "string",
                    "description": "Place type / keyword to search for",
                },
                "radius_m": {
                    "type": "integer",
                    "description": "Search radius in metres (max 50000)",
                },
            },
            "required": ["lat", "lng", "keyword", "radius_m"],
        },
    },
    {
        "name": "search_text_places",
        "description": (
            "Search for places using a free-text query. "
            "Best for unusual/custom types like farmhouse, resort, villa, retreat, "
            "or when nearby search returns too few results."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Full text search query (e.g. 'farmhouses near Hyderabad')",
                },
                "lat": {"type": "number", "description": "Latitude to bias results"},
                "lng": {"type": "number", "description": "Longitude to bias results"},
                "radius_m": {
                    "type": "integer",
                    "description": "Bias radius in metres",
                },
            },
            "required": ["query", "lat", "lng", "radius_m"],
        },
    },
    {
        "name": "finish_search",
        "description": (
            "Call this when you have gathered all results and are ready to return them. "
            "Pass the final list of place dicts and a short summary."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "places": {
                    "type": "array",
                    "description": "Final list of place objects (include all fields from search results plus any phone numbers)",
                    "items": {"type": "object"},
                },
                "summary": {
                    "type": "string",
                    "description": "Human-readable summary of what was found",
                },
            },
            "required": ["places", "summary"],
        },
    },
]

_AGENT_SYSTEM = """You are an advanced location search agent powered by Google Maps. Your job is to find places near a specific location for the user.

You will receive a structured query with: place_type, base_location, radius_km, city.

Follow this workflow:
1. Call geocode_location to convert base_location to coordinates
2. Choose the right search tool:
   - Standard types (restaurant, cafe, hotel, park, bar, gym, bank, clinic, etc.) → search_nearby_places
   - Custom/unusual types (farmhouse, resort, villa, retreat, orchard, etc.) → search_text_places
   - If nearby search returns fewer than 3 results → also call search_text_places as fallback
3. Call search_text_places with a wider radius (3× the original) if initial results are sparse
4. Call finish_search with all results and a summary

Important notes:
- Convert radius_km to metres (multiply by 1000) when calling search tools
- For text search, construct a natural query like "{place_type} near {base_location}"
- Always call finish_search at the end — never stop without it
- Include all place data in finish_search so the user gets complete results"""


def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    d_lat = radians(lat2 - lat1)
    d_lng = radians(lng2 - lng1)
    a = sin(d_lat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lng / 2) ** 2
    return R * 2 * asin(sqrt(a))


def _build_result(place: dict, base_lat: float, base_lng: float, radius_km: float) -> LocationResult:
    pid = place.get("place_id", "")
    loc = place.get("geometry", {}).get("location", {})
    lat = loc.get("lat") or place.get("lat")
    lng = loc.get("lng") or place.get("lng")

    dist_km = 0.0
    if lat and lng:
        dist_km = _haversine(base_lat, base_lng, lat, lng)

    outside = dist_km > radius_km if dist_km else False

    return LocationResult(
        name=place.get("name", "Unknown"),
        address=place.get("vicinity") or place.get("formatted_address") or "",
        distance_km=round(dist_km, 2),
        rating=place.get("rating"),
        reviews_count=int(place.get("user_ratings_total") or 0),
        phone=place.get("_phone"),
        maps_url=f"https://www.google.com/maps/place/?q=place_id:{pid}" if pid else "",
        source="Google Places",
        relevance_score=place.get("_relevance_score", 0.5),
        outside_requested_radius=outside,
        place_id=pid,
    )


async def run_agent(query: str) -> SearchResponse:
    steps: list[AgentStep] = []

    def _step(step_id: str, status: str, msg: str) -> AgentStep:
        return AgentStep(step=step_id, status=status, message=msg)

    # ── 1. Query understanding (Claude) ────────────────────────────────────
    steps.append(_step("query_understanding", "running", "Parsing your search query with Claude AI..."))
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
            f"Understood: {parsed.place_type!r} near {parsed.base_location!r}, radius {parsed.radius_km} km",
        )
    except Exception as exc:
        logger.exception("Query understanding failed")
        steps[-1] = _step("query_understanding", "failed", str(exc))
        return SearchResponse(agent_steps=steps, error="Could not understand the query. Please rephrase and try again.")

    # ── 2. Validation ─────────────────────────────────────────────────────
    steps.append(_step("validation", "running", "Validating extracted information..."))
    parsed_dict = parsed.model_dump()
    val = validate_query(parsed_dict)
    if not val["valid"]:
        steps[-1] = _step("validation", "failed", val["message"])
        return SearchResponse(agent_steps=steps, parsed_query=parsed, error=val["message"])
    parsed = parsed.model_copy(update={"radius_km": parsed_dict["radius_km"]})
    steps[-1] = _step("validation", "completed", "All required fields present")

    # ── 3. Claude agentic orchestration (tool use) ────────────────────────
    steps.append(_step("agentic_search", "running", "Claude AI is orchestrating the search..."))

    agent_query = json.dumps({
        "place_type": parsed.place_type,
        "base_location": parsed.base_location,
        "radius_km": parsed.radius_km,
        "city": parsed.city,
    }, ensure_ascii=False)

    messages: list[dict] = [{"role": "user", "content": agent_query}]
    context: dict = {}
    tool_call_log: list[str] = []
    final_places: list[dict] = []
    final_summary: str = ""
    base_coords: BaseCoordinates | None = None
    max_iterations = 12

    for _ in range(max_iterations):
        response = _client.messages.create(
            model=MODEL,
            max_tokens=4096,
            system=_AGENT_SYSTEM,
            tools=_TOOLS,
            messages=messages,
        )

        # Collect assistant message content
        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason == "end_turn":
            break

        if response.stop_reason != "tool_use":
            break

        # Process all tool calls in this response
        tool_results = []
        for block in response.content:
            if block.type != "tool_use":
                continue

            tool_name = block.name
            tool_input = block.input
            tool_call_log.append(tool_name)
            logger.info("Claude tool call: %s %s", tool_name, tool_input)

            result_content: str

            try:
                if tool_name == "geocode_location":
                    locs = await geocode_location(
                        tool_input["location"], tool_input.get("city")
                    )
                    if locs:
                        context["base_lat"] = locs[0]["lat"]
                        context["base_lng"] = locs[0]["lng"]
                        base_coords = BaseCoordinates(lat=locs[0]["lat"], lng=locs[0]["lng"])
                        result_content = json.dumps({
                            "success": True,
                            "lat": locs[0]["lat"],
                            "lng": locs[0]["lng"],
                            "formatted_address": locs[0]["formatted_address"],
                        })
                    else:
                        result_content = json.dumps({"success": False, "error": "Location not found"})

                elif tool_name == "search_nearby_places":
                    places = await nearby_search(
                        lat=tool_input["lat"],
                        lng=tool_input["lng"],
                        radius_m=int(tool_input["radius_m"]),
                        keyword=tool_input["keyword"],
                    )
                    context.setdefault("all_places", []).extend(places)
                    result_content = json.dumps({
                        "success": True,
                        "count": len(places),
                        "places": places,
                    }, default=str)

                elif tool_name == "search_text_places":
                    location_str = f"{tool_input['lat']},{tool_input['lng']}"
                    places = await text_search(
                        query=tool_input["query"],
                        location=location_str,
                        radius_m=int(tool_input["radius_m"]),
                    )
                    context.setdefault("all_places", []).extend(places)
                    result_content = json.dumps({
                        "success": True,
                        "count": len(places),
                        "places": places,
                    }, default=str)

                elif tool_name == "finish_search":
                    final_places = tool_input.get("places") or []
                    final_summary = tool_input.get("summary", "")
                    result_content = json.dumps({"success": True})

                else:
                    result_content = json.dumps({"error": f"Unknown tool: {tool_name}"})

            except Exception as exc:
                logger.exception("Tool %s failed", tool_name)
                result_content = json.dumps({"error": str(exc)})

            tool_results.append({
                "type": "tool_result",
                "tool_use_id": block.id,
                "content": result_content,
            })

        messages.append({"role": "user", "content": tool_results})

        if "finish_search" in tool_call_log:
            break

    # ── Build step summary ─────────────────────────────────────────────────
    unique_tools = list(dict.fromkeys(tool_call_log))
    steps[-1] = _step(
        "agentic_search",
        "completed",
        f"Claude used {len(unique_tools)} tools: {', '.join(unique_tools)}",
    )

    # ── Build results ─────────────────────────────────────────────────────
    if base_coords is None:
        return SearchResponse(
            agent_steps=steps,
            parsed_query=parsed,
            error="Could not resolve the location. Please provide a more specific address.",
        )

    # Deduplicate by place_id
    seen_ids: set[str] = set()
    unique_places: list[dict] = []
    for p in final_places:
        pid = p.get("place_id", "")
        if pid and pid in seen_ids:
            continue
        if pid:
            seen_ids.add(pid)
        unique_places.append(p)

    # Fetch phone numbers for top 5 results in parallel
    _MAX_PHONES = 5
    top_with_id = [p for p in unique_places if p.get("place_id")][:_MAX_PHONES]
    if top_with_id:
        phone_results = await asyncio.gather(
            *[get_place_details(p["place_id"]) for p in top_with_id],
            return_exceptions=True,
        )
        for place, detail in zip(top_with_id, phone_results):
            if isinstance(detail, dict):
                place["_phone"] = detail.get("formatted_phone_number")

    # Sort: inside radius first, then by rating desc
    def _sort_key(p: dict) -> tuple:
        loc = p.get("geometry", {}).get("location", {})
        lat = loc.get("lat") or p.get("lat")
        lng = loc.get("lng") or p.get("lng")
        dist = _haversine(base_coords.lat, base_coords.lng, lat, lng) if (lat and lng) else 999
        outside = dist > parsed.radius_km
        return (int(outside), dist, -(p.get("rating") or 0))

    unique_places.sort(key=_sort_key)

    results = [_build_result(p, base_coords.lat, base_coords.lng, parsed.radius_km) for p in unique_places]
    inside_count = sum(1 for r in results if not r.outside_requested_radius)

    if not final_summary:
        if results:
            final_summary = (
                f"Found {len(results)} {parsed.place_type}(s) near {parsed.base_location}. "
                f"{inside_count} within {parsed.radius_km} km."
            )
        else:
            final_summary = (
                f"No {parsed.place_type}s found near {parsed.base_location} "
                f"within {parsed.radius_km} km. Try increasing the radius."
            )

    return SearchResponse(
        agent_steps=steps,
        parsed_query=parsed,
        base_coordinates=base_coords,
        results=results,
        summary=final_summary,
    )
