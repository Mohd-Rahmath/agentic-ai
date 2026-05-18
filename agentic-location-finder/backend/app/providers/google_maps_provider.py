from __future__ import annotations

import logging
import os

import httpx

logger = logging.getLogger(__name__)

_BASE = "https://maps.googleapis.com/maps/api"


def _key() -> str:
    k = os.environ.get("GOOGLE_MAPS_API_KEY", "")
    if not k:
        raise RuntimeError("GOOGLE_MAPS_API_KEY is not set in environment")
    return k


async def geocode(address: str) -> list[dict]:
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.get(
            f"{_BASE}/geocode/json",
            params={"address": address, "key": _key()},
        )
        data = r.json()

    status = data.get("status")
    if status != "OK":
        logger.warning("Geocode status=%s for %r", status, address)
        return []

    out = []
    for res in data["results"]:
        loc = res["geometry"]["location"]
        out.append(
            {
                "lat": loc["lat"],
                "lng": loc["lng"],
                "formatted_address": res["formatted_address"],
            }
        )
    return out


async def nearby_search(
    lat: float, lng: float, radius_m: int, keyword: str
) -> list[dict]:
    params = {
        "location": f"{lat},{lng}",
        "radius": str(radius_m),
        "keyword": keyword,
        "key": _key(),
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(f"{_BASE}/place/nearbysearch/json", params=params)
        data = r.json()

    status = data.get("status")
    if status not in ("OK", "ZERO_RESULTS"):
        logger.warning("NearbySearch status=%s", status)
        return []
    return data.get("results", [])


async def text_search(
    query: str,
    location: str | None = None,
    radius_m: int | None = None,
) -> list[dict]:
    params: dict = {"query": query, "key": _key()}
    if location:
        params["location"] = location
    if radius_m:
        params["radius"] = str(radius_m)

    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(f"{_BASE}/place/textsearch/json", params=params)
        data = r.json()

    status = data.get("status")
    if status not in ("OK", "ZERO_RESULTS"):
        logger.warning("TextSearch status=%s", status)
        return []
    return data.get("results", [])


async def get_place_details(place_id: str) -> dict:
    params = {
        "place_id": place_id,
        "fields": "formatted_phone_number",
        "key": _key(),
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.get(f"{_BASE}/place/details/json", params=params)
        data = r.json()

    if data.get("status") != "OK":
        return {}
    return data.get("result", {})
