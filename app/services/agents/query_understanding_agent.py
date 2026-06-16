from __future__ import annotations

import json
import logging
import os

import anthropic

logger = logging.getLogger(__name__)

_client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

MODEL = "claude-sonnet-4-6"

_SYSTEM = """You are an expert location search query parser. Extract structured data from natural language location search queries.

Return ONLY valid JSON — no markdown fences, no explanation, no extra text:
{
  "intent": "nearby_place_search",
  "place_type": "<type of place the user wants to find>",
  "base_location": "<the reference location string>",
  "radius_km": <numeric radius in km, default 2 if not mentioned>,
  "city": "<city name if identifiable, else null>",
  "filters": {},
  "confidence": <float 0.0–1.0>
}

Rules:
- place_type: extract the venue/place type (farmhouse, restaurant, hotel, park, cafe, etc.)
- base_location: the full location string the user wants to search near
- radius_km: convert any unit to km (e.g. "2 miles" → 3.2, "500m" → 0.5). Default 2 if absent.
- city: city name extracted from the query, or null if unclear
- confidence: how confident you are in the extraction (0.0–1.0)

Examples:
Input: "Find farmhouses near 27 kilometer Hyderabad around 2 km"
Output: {"intent":"nearby_place_search","place_type":"farmhouse","base_location":"27 kilometer Hyderabad","radius_km":2,"city":"Hyderabad","filters":{},"confidence":0.95}

Input: "restaurants near Gachibowli within 5 km"
Output: {"intent":"nearby_place_search","place_type":"restaurant","base_location":"Gachibowli","radius_km":5,"city":null,"filters":{},"confidence":0.92}

Input: "hotels in Banjara Hills Hyderabad 3 km"
Output: {"intent":"nearby_place_search","place_type":"hotel","base_location":"Banjara Hills, Hyderabad","radius_km":3,"city":"Hyderabad","filters":{},"confidence":0.90}"""


def understand_query(query: str) -> dict:
    resp = _client.messages.create(
        model=MODEL,
        max_tokens=512,
        system=_SYSTEM,
        messages=[{"role": "user", "content": query}],
    )

    raw = resp.content[0].text.strip()
    logger.debug("Claude raw response: %s", raw)

    if "```" in raw:
        for chunk in raw.split("```"):
            chunk = chunk.strip().lstrip("json").strip()
            try:
                return json.loads(chunk)
            except json.JSONDecodeError:
                continue

    return json.loads(raw)
