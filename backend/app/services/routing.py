"""
Routing service — the only place that talks to OSRM (section 41R:
external services must be wrapped, not scattered across routes).

Failure behavior (section 21 / step 4.14): if OSRM is unreachable or
errors, this module does NOT fabricate an ETA. It returns a result
object with `travel_seconds=None` and `source="UNAVAILABLE"`, OR — if
`routing_fallback_policy` in prototype_config is set to
"GEOGRAPHIC_DISTANCE" (the default) — returns a clearly labeled
straight-line-distance estimate with `source="GEOGRAPHIC_FALLBACK"`.
Callers (candidate ranking, UI) must check `source` before treating
a travel estimate as a real routed ETA.
"""

import math
from dataclasses import dataclass
from typing import Optional

import requests

from app.config import get_config
from app.services.db import get_prototype_config


@dataclass
class RouteEstimate:
    travel_seconds: Optional[float]
    distance_meters: Optional[float]
    source: str  # "OSRM" | "GEOGRAPHIC_FALLBACK" | "UNAVAILABLE"


def _haversine_meters(lat1, lon1, lat2, lon2) -> float:
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


# Configurable assumption (section 0.10): used only by the geographic
# fallback to turn distance into a rough ETA. This is explicitly NOT a
# claim about real traffic conditions.
_FALLBACK_AVG_SPEED_KMH = 30.0

_osrm_consecutive_failures = 0
_last_osrm_failure_time = 0.0
_route_cache = {}


def get_travel_estimate(origin_lat, origin_lon, dest_lat, dest_lon) -> RouteEstimate:
    global _osrm_consecutive_failures, _last_osrm_failure_time
    import time
    cfg = get_config()

    cache_key = (round(float(origin_lat), 4), round(float(origin_lon), 4), round(float(dest_lat), 4), round(float(dest_lon), 4))
    if cache_key in _route_cache:
        return _route_cache[cache_key]

    # Fast circuit-breaker: if OSRM recently failed, use instant haversine fallback
    if _osrm_consecutive_failures >= 1 and (time.time() - _last_osrm_failure_time) < 180.0:
        distance_m = _haversine_meters(origin_lat, origin_lon, dest_lat, dest_lon)
        estimated_seconds = (distance_m / 1000.0) / _FALLBACK_AVG_SPEED_KMH * 3600.0
        est = RouteEstimate(
            travel_seconds=round(estimated_seconds),
            distance_meters=round(distance_m),
            source="GEOGRAPHIC_FALLBACK",
        )
        _route_cache[cache_key] = est
        return est

    try:
        url = (
            f"{cfg.OSRM_BASE_URL}/route/v1/driving/"
            f"{origin_lon},{origin_lat};{dest_lon},{dest_lat}"
            f"?overview=false"
        )
        resp = requests.get(url, timeout=0.8)
        resp.raise_for_status()
        data = resp.json()
        route = data["routes"][0]
        _osrm_consecutive_failures = 0
        est = RouteEstimate(
            travel_seconds=round(route["duration"]),
            distance_meters=round(route["distance"]),
            source="OSRM",
        )
        _route_cache[cache_key] = est
        return est
    except Exception:
        _osrm_consecutive_failures += 1
        _last_osrm_failure_time = time.time()
        distance_m = _haversine_meters(origin_lat, origin_lon, dest_lat, dest_lon)
        estimated_seconds = (distance_m / 1000.0) / _FALLBACK_AVG_SPEED_KMH * 3600.0
        est = RouteEstimate(
            travel_seconds=round(estimated_seconds),
            distance_meters=round(distance_m),
            source="GEOGRAPHIC_FALLBACK",
        )
        _route_cache[cache_key] = est
        return est
