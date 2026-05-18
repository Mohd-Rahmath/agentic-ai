from __future__ import annotations

from app.providers.google_maps_provider import nearby_search, text_search


async def search_places(parsed: dict, base_coords: dict, strategy: str) -> list[dict]:
    lat = base_coords["lat"]
    lng = base_coords["lng"]
    radius_km = float(parsed.get("radius_km") or 2)
    radius_m = int(radius_km * 1000)
    place_type = parsed.get("place_type", "")
    base_location = parsed.get("base_location", "")

    # Cast a wider net initially (3x) so we can filter after distance calc
    search_radius_m = max(radius_m * 3, 5000)

    results: list[dict] = []

    if strategy == "nearby":
        results = await nearby_search(lat, lng, search_radius_m, place_type)

    if not results:
        # Fallback 1: text search with location bias
        query = f"{place_type} near {base_location}"
        results = await text_search(
            query, location=f"{lat},{lng}", radius_m=search_radius_m
        )

    if not results:
        # Fallback 2: text search without location bias (pure text)
        results = await text_search(f"{place_type} {base_location}")

    return results
