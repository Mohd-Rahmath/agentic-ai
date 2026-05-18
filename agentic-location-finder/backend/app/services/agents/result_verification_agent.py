from __future__ import annotations

from app.utils.distance_calculator import haversine_km


def verify_results(
    raw: list[dict], base_coords: dict, radius_km: float
) -> list[dict]:
    seen: set[str] = set()
    out: list[dict] = []

    lat1 = base_coords["lat"]
    lng1 = base_coords["lng"]

    for place in raw:
        pid = place.get("place_id", "")

        # Deduplicate by place_id
        if pid:
            if pid in seen:
                continue
            seen.add(pid)

        loc = (place.get("geometry") or {}).get("location") or {}
        lat2 = loc.get("lat")
        lng2 = loc.get("lng")
        if lat2 is None or lng2 is None:
            continue

        dist = haversine_km(lat1, lng1, lat2, lng2)
        place["_distance_km"] = round(dist, 2)
        place["_outside_radius"] = dist > radius_km
        out.append(place)

    return out
