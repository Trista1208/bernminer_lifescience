"""Bridge: focused-crawler highlights → company_match Bern records.

Teammates run::

    PYTHONPATH=src python -m navigator focused-crawl --complete --export data/highlights.json
    PYTHONPATH=src python -m company_match import-focused data/highlights.json

The export lands in ``data/bern_records/focused_highlights.json`` so matching
picks it up automatically (see ``bern_records.py``).
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

DEFAULT_OUT = Path(__file__).resolve().parent / "data" / "bern_records" / "focused_highlights.json"

_TYPE_MAP = {
    "research_result": "project",
    "project": "project",
    "technology": "infrastructure",
    "capability": "service",
    "infrastructure": "infrastructure",
    "achievement": "project",
}


def _finding_to_record(finding: dict[str, Any]) -> dict[str, Any] | None:
    urls = list(finding.get("source_urls") or [])
    if not urls and finding.get("evidence"):
        for ev in finding["evidence"]:
            u = ev.get("source_url")
            if u:
                urls.append(u)
    if not urls:
        return None
    source_url = str(urls[0])
    if not source_url.startswith("http"):
        return None

    fid = str(finding.get("id") or "").strip()
    if not fid:
        slug = re.sub(r"[^a-z0-9]+", "-", (finding.get("title") or "finding").lower())[:40].strip("-")
        digest = re.sub(r"[^a-z0-9]", "", (urls[0] if urls else slug).lower())[-12:] or "x"
        fid = f"{slug}-{digest}"
    name = (finding.get("title") or finding.get("original_name") or "").strip()
    if len(name) < 3:
        return None

    expertise = list(finding.get("keywords") or [])[:24]
    for t in finding.get("topics") or []:
        if t not in expertise:
            expertise.append(t)
    orgs = finding.get("organizations") or []
    institution = orgs[0] if orgs else (finding.get("unit") or "")

    return {
        "id": fid if fid.startswith("focused-") else f"focused-{fid}",
        "name": name[:200],
        "type": _TYPE_MAP.get(str(finding.get("type") or ""), "project"),
        "unit": finding.get("unit") or "",
        "institution": institution,
        "description": (finding.get("summary") or finding.get("rationale") or "")[:2000],
        "expertise": expertise[:24],
        "projects": [name] if finding.get("type") in {"project", "research_result", "achievement"} else [],
        "infrastructure": [name] if finding.get("type") in {"infrastructure", "technology"} else [],
        "services": [name] if finding.get("type") in {"capability"} else [],
        "source_url": source_url,
        "extra_source_urls": [u for u in urls[1:8] if isinstance(u, str) and u.startswith("http")],
        "language": "en",
        "focused_scores": finding.get("scores") or {},
        "focused_keywords": finding.get("keywords") or [],
    }


def import_focused_export(
    path: str | Path,
    *,
    out: str | Path | None = None,
    min_score: int = 2,
) -> tuple[Path, int]:
    """Convert a focused-crawler JSON export into Bern records. Returns (out_path, count)."""
    src = Path(path)
    data = json.loads(src.read_text(encoding="utf-8"))
    findings = data.get("findings") if isinstance(data, dict) else data
    if not isinstance(findings, list):
        raise ValueError("focused export must be {findings:[...]} or a JSON array")

    records: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    for f in findings:
        if not isinstance(f, dict):
            continue
        scores = f.get("scores") or {}
        try:
            top = max(int(v) for v in scores.values()) if scores else 0
        except (TypeError, ValueError):
            top = 0
        if top < min_score:
            continue
        rec = _finding_to_record(f)
        if not rec:
            continue
        rid = rec["id"]
        if rid in seen_ids:
            # Same title/url can appear twice; keep first (higher score after sort)
            continue
        seen_ids.add(rid)
        records.append(rec)

    dest = Path(out) if out else DEFAULT_OUT
    dest.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "schema_version": 1,
        "source": "navigator.focused",
        "imported_from": str(src),
        "count": len(records),
        "records": records,
    }
    dest.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return dest, len(records)
