from __future__ import annotations

import time

from app.providers.google_maps_provider import geocode

# Simple in-process cache: key → (results, expiry_timestamp)
_cache: dict[str, tuple[list[dict], float]] = {}
_TTL = 3600  # 1 hour


async def geocode_location(base_location: str, city: str | None = None) -> list[dict]:
    cache_key = f"{base_location}|{city or ''}"
    now = time.monotonic()

    cached = _cache.get(cache_key)
    if cached and cached[1] > now:
        return cached[0]

    attempts = [base_location]

    if city and city.lower() not in base_location.lower():
        attempts.append(f"{base_location}, {city}")
        attempts.append(f"{base_location}, {city}, India")

    attempts.append(f"{base_location}, India")

    for attempt in attempts:
        results = await geocode(attempt)
        if results:
            _cache[cache_key] = (results, now + _TTL)
            return results

    return []
