def _score(place: dict) -> float:
    dist = float(place.get("_distance_km") or 99)
    rating = float(place.get("rating") or 0)
    reviews = int(place.get("user_ratings_total") or 0)
    outside = bool(place.get("_outside_radius"))

    dist_score = max(0.0, 1.0 - dist / 20.0)
    rating_score = rating / 5.0
    review_score = min(reviews / 300.0, 1.0)
    penalty = 0.3 if outside else 0.0

    return round(
        (dist_score * 0.5 + rating_score * 0.3 + review_score * 0.2) - penalty, 3
    )


def rank_results(verified: list[dict]) -> list[dict]:
    for place in verified:
        place["_relevance_score"] = _score(place)
    return sorted(verified, key=lambda p: p["_relevance_score"], reverse=True)
