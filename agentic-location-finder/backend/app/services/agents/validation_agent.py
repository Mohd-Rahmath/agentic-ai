def validate_query(parsed: dict) -> dict:
    place_type = (parsed.get("place_type") or "").strip()
    base_location = (parsed.get("base_location") or "").strip()
    radius_km = parsed.get("radius_km")

    if not place_type:
        return {
            "valid": False,
            "message": (
                "Please specify what type of place you want to find "
                "(e.g., farmhouse, restaurant, hotel, park)."
            ),
        }

    if not base_location:
        return {
            "valid": False,
            "message": (
                "Please provide a base location to search near "
                "(e.g., '27 kilometer Hyderabad' or 'Gachibowli')."
            ),
        }

    if not radius_km or float(radius_km) <= 0:
        parsed["radius_km"] = 2.0

    return {"valid": True, "message": "Valid"}
