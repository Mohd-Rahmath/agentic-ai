from __future__ import annotations

from app.providers.google_maps_provider import geocode


async def geocode_location(base_location: str, city: str | None = None) -> list[dict]:
    attempts = [base_location]

    if city and city.lower() not in base_location.lower():
        attempts.append(f"{base_location}, {city}")
        attempts.append(f"{base_location}, {city}, India")

    # Generic fallback variations
    attempts.append(f"{base_location}, India")

    for attempt in attempts:
        results = await geocode(attempt)
        if results:
            return results

    return []
