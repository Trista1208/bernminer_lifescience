"""Offline bridge: Coupur `data/raw` crawl corpus → focused findings → Bern records.

Teammates' sorted HTML lives under ``data/raw/<source>/`` (manifest.jsonl + pages/).
This module reuses the focused-crawler rule selector without hitting the network,
then writes a highlights export and imports it into ``data/bern_records/``.

Usage::

    PYTHONPATH=src python -m company_match import-raw
    PYTHONPATH=src python -m company_match import-raw --only artorg dcberne --max-pages 400
"""

from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from navigator import config
from navigator.extract import extract
from navigator.focused.models import Document
from navigator.focused.selection import evaluate, validate_findings
from navigator.sources import load_sources

from .focused_import import import_focused_export

DEFAULT_HIGHLIGHTS = config.DATA_DIR / "highlights_from_raw.json"
DEFAULT_BERN = Path(__file__).resolve().parent / "data" / "bern_records" / "focused_from_raw.json"

_ORG = {
    "artorg": "ARTORG",
    "dcberne": "Diabetes Center Berne",
}


def _org_for(source_id: str, source_name: str = "") -> str:
    if source_id in _ORG:
        return _ORG[source_id]
    name = (source_name or "").lower()
    if "artorg" in name:
        return "ARTORG"
    if "diabetes" in name or "dcberne" in name or "dcb" == source_id:
        return "Diabetes Center Berne"
    return "University of Bern"


def _score_rank(finding: dict[str, Any]) -> int:
    scores = finding.get("scores") or {}
    try:
        return max(int(v) for v in scores.values()) if scores else 0
    except (TypeError, ValueError):
        return 0


def scan_raw_to_findings(
    *,
    raw_dir: Path | None = None,
    only: list[str] | None = None,
    max_pages: int | None = None,
    min_chars: int = 200,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """Run focused rules on every successful HTML page in data/raw."""
    root = Path(raw_dir) if raw_dir else config.RAW_DIR
    try:
        sources = {s.id: s for s in load_sources()}
    except Exception:
        sources = {}
    only_set = set(only) if only else None

    findings: list[dict[str, Any]] = []
    stats = {
        "pages_seen": 0,
        "pages_scored": 0,
        "pages_with_findings": 0,
        "findings": 0,
        "sources": {},
        "skipped_missing_file": 0,
    }

    manifests = sorted(root.glob("*/manifest.jsonl"))
    for manifest in manifests:
        sid = manifest.parent.name
        if only_set and sid not in only_set:
            continue
        src = sources.get(sid)
        org = _org_for(sid, src.name if src else "")
        src_stats = stats["sources"].setdefault(sid, {"pages": 0, "findings": 0})

        for line in open(manifest, encoding="utf-8"):
            if max_pages is not None and stats["pages_seen"] >= max_pages:
                break
            row = json.loads(line)
            if row.get("status") != 200 or not row.get("file"):
                continue
            ctype = (row.get("content_type") or "").lower()
            if "html" not in ctype and not str(row["file"]).endswith(".html"):
                continue
            stats["pages_seen"] += 1
            if stats["pages_seen"] % 50 == 0:
                print(
                    f"… scanned {stats['pages_seen']} pages, "
                    f"{stats['findings']} findings so far ({sid})",
                    flush=True,
                )
            path = manifest.parent / row["file"]
            if not path.exists():
                stats["skipped_missing_file"] += 1
                continue

            url = row.get("final_url") or row["url"]
            html = path.read_text(encoding="utf-8", errors="replace")
            page = extract(html, url, paragraphs=True)
            text = page.get("text") or ""
            if len(text) < min_chars:
                continue
            title = (page.get("title") or url)[:250]
            doc = Document(
                url=url,
                title=title,
                text=text[:36_000],
                source_id=sid,
                organization=org,
                fetched_at=row.get("fetched_at") or datetime.now(timezone.utc).isoformat(),
                references=(),
            )
            stats["pages_scored"] += 1
            src_stats["pages"] += 1
            try:
                accepted, _rejected = validate_findings(evaluate(doc), doc)
            except Exception:
                continue
            if not accepted:
                continue
            stats["pages_with_findings"] += 1
            for rec in accepted:
                # Unique id from source URL (+ title) so Bern-record import accepts all rows
                url_key = (rec.get("source_urls") or [url] or [""])[0]
                digest = hashlib.sha1(f"{sid}|{url_key}|{rec.get('title') or ''}".encode()).hexdigest()[:12]
                slug = re.sub(r"[^a-z0-9]+", "-", (rec.get("title") or "finding").lower())[:40].strip("-")
                rec["id"] = f"{sid}-{slug}-{digest}"
                findings.append(rec)
                src_stats["findings"] += 1
                stats["findings"] += 1
        if max_pages is not None and stats["pages_seen"] >= max_pages:
            break

    # Prefer stronger findings; keep focused ceiling of 500
    findings.sort(key=_score_rank, reverse=True)
    if len(findings) > 500:
        findings = findings[:500]
        stats["truncated_to"] = 500

    return findings, stats


def import_raw_corpus(
    *,
    raw_dir: Path | None = None,
    only: list[str] | None = None,
    max_pages: int | None = None,
    min_score: int = 2,
    highlights_out: Path | None = None,
    bern_out: Path | None = None,
) -> dict[str, Any]:
    findings, stats = scan_raw_to_findings(
        raw_dir=raw_dir, only=only, max_pages=max_pages
    )
    hl_path = Path(highlights_out) if highlights_out else DEFAULT_HIGHLIGHTS
    hl_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "schema_version": 2,
        "language": "en",
        "count": len(findings),
        "findings": findings,
        "source": "data/raw offline focused selection",
        "stats": stats,
        "exhaustive": False,
    }
    hl_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    dest, n = import_focused_export(
        hl_path,
        out=bern_out or DEFAULT_BERN,
        min_score=min_score,
    )
    return {
        "highlights": str(hl_path),
        "bern_records": str(dest),
        "findings_exported": len(findings),
        "bern_records_imported": n,
        "stats": stats,
    }
