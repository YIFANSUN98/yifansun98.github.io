#!/usr/bin/env python3
"""Refresh the interactive globe data from the public Flag Counter map."""

from __future__ import annotations

import html
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen


SOURCE_URL = "https://s01.flagcounter.com/gmap/vTsZ/"
OUTPUT_PATH = Path(__file__).resolve().parents[1] / "data" / "visitor-map.json"

MARKER_PATTERN = re.compile(
    r"iconUrl:\s*'[^']*/flags/(?P<code>[a-z]{2})\.png'.*?"
    r"L\.marker\(\[(?P<latitude>-?\d+(?:\.\d+)?),(?P<longitude>-?\d+(?:\.\d+)?)\]"
    r".*?\.bindPopup\('(?P<popup>.*?)'\);",
    re.DOTALL,
)
COUNTRY_PATTERN = re.compile(r"<b>(?P<country>[^<]+)</b>")
VISITORS_PATTERN = re.compile(r"Visitors:\s*(?P<visitors>[\d,]+)")
LAST_VISIT_PATTERN = re.compile(r"Last new visitor:\s*(?P<last_visit>[^<]+)")


def fetch_source() -> str:
    request = Request(
        SOURCE_URL,
        headers={"User-Agent": "YifanSun98.github.io visitor-map updater"},
    )
    with urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8", errors="replace")


def parse_countries(source: str) -> list[dict[str, object]]:
    countries: list[dict[str, object]] = []

    for match in MARKER_PATTERN.finditer(source):
        popup = html.unescape(match.group("popup"))
        country_match = COUNTRY_PATTERN.search(popup)
        visitors_match = VISITORS_PATTERN.search(popup)
        if not country_match or not visitors_match:
            continue

        last_visit_match = LAST_VISIT_PATTERN.search(popup)
        countries.append(
            {
                "code": match.group("code").upper(),
                "name": html.unescape(country_match.group("country")).strip(),
                "latitude": float(match.group("latitude")),
                "longitude": float(match.group("longitude")),
                "visitors": int(visitors_match.group("visitors").replace(",", "")),
                "lastVisit": last_visit_match.group("last_visit").strip() if last_visit_match else "",
            }
        )

    return sorted(countries, key=lambda country: (-int(country["visitors"]), str(country["name"])))


def main() -> None:
    countries = parse_countries(fetch_source())
    if not countries:
        raise RuntimeError("Flag Counter returned no visitor-country markers; existing data was not overwritten.")

    total_visitors = sum(int(country["visitors"]) for country in countries)
    if OUTPUT_PATH.exists():
        existing = json.loads(OUTPUT_PATH.read_text(encoding="utf-8"))
        if existing.get("totalVisitors") == total_visitors and existing.get("countries") == countries:
            return

    output = {
        "updatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "totalVisitors": total_visitors,
        "countries": countries,
    }
    OUTPUT_PATH.write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
