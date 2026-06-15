# Place types that map well to Google Places' built-in type system
_STANDARD_TYPES = {
    "restaurant", "cafe", "coffee", "hotel", "motel", "park", "hospital",
    "clinic", "bank", "pharmacy", "school", "university", "gym", "fitness",
    "mall", "supermarket", "grocery", "airport", "bus", "station",
    "bar", "pub", "bakery", "spa", "salon", "library", "museum",
    "cinema", "theater", "theatre", "zoo", "temple", "church", "mosque",
}


def plan_search(parsed: dict) -> str:
    """Return 'nearby' for standard place types, 'text' for custom ones like farmhouse."""
    place_type = (parsed.get("place_type") or "").lower()
    for t in _STANDARD_TYPES:
        if t in place_type:
            return "nearby"
    return "text"