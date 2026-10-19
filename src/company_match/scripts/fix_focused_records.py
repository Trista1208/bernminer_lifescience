"""Give focused_from_raw.json records real names: the crawler wrote rule labels
("Research project or activity at University of Bern") as names. Take each record's
title and lead from its crawled source page (data/raw), merge records that point to the
same page, and drop ones whose page gives no usable name."""
import json, re, sys
from pathlib import Path
from bs4 import BeautifulSoup
RAW, SRC, OUT = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
# names already in the other records file (unibe_crawl.json) would show up twice in the UI
OTHER = {re.sub(r"\s+\d+$", "", r["name"].lower()) for r in json.loads(Path(sys.argv[4]).read_text())["records"]} if len(sys.argv) > 4 else set()
# rule labels look like "Research project or activity at University of Bern": lowercase words + " at <Org>"
GENERIC = re.compile(r"^[A-Z][a-z]+(?: (?:or )?[a-z-]+)* at (?:the )?[A-Z][\w ]*$|^(research project or activity|reported research finding|available research capability|research technology or method)$")
LISTING = re.compile(r"^(focus areas|schwerpunktbereiche|ended projects|ongoing projects|booking & rates|new at .*|join .*|partners? (&|und) (network|netzwerk)|forschung|navigation|news \d{4}|news|news and events|events?|projects?|research|home|team|people|publications|overview|aktuell|forschung|news & events|newsroom|media)$", re.I)
SCRUB = re.compile(r"(\+?\d[\d\s()/-]{7,}\d)|([\w.+-]+@[\w-]+\.[\w.]+)|\b(Facebook|Instagram|LinkedIn|English|German|Deutsch|Phone2?|E-Mail(-Address)?|Contact)\b", re.I)

pages = {}
for man in RAW.glob("*/manifest.jsonl"):
    for line in man.open():
        r = json.loads(line)
        if r.get("status") != 200 or not r.get("file"): continue
        f = man.parent / r["file"]
        if f.exists():
            for u in {r["url"], r.get("final_url") or r["url"]}: pages[u.rstrip("/")] = f

def page_info(url):
    f = pages.get(url.rstrip("/"))
    if not f: return None
    soup = BeautifulSoup(f.read_text(errors="ignore"), "html.parser")
    h1 = soup.find("h1")
    title = (h1.get_text(" ", strip=True) if h1 else "") or (soup.title.string.strip() if soup.title and soup.title.string else "")
    title = re.split(r"\s+[|–-]\s+", title)[0].strip()
    meta = soup.find("meta", attrs={"name": "description"})
    for t in soup(["script", "style", "nav", "header", "footer", "noscript"]): t.decompose()
    main = soup.find("main") or soup.body or soup
    body = re.sub(r"\s+", " ", main.get_text(" ")).strip()
    lead = (meta.get("content", "").strip() if meta else "") or body[:500]
    if lead.lower().startswith(title.lower()): lead = lead[len(title):]
    lead = re.sub(r"\s+", " ", SCRUB.sub(" ", lead)).strip(" ·|-–")
    lead = lead[:300].rsplit(" ", 1)[0] + ("…" if len(lead) > 300 else "")
    return title, lead

doc = json.loads(SRC.read_text())
by_url, dropped = {}, 0
for r in doc["records"]:
    if not GENERIC.search(r["name"]):
        key = ("name", r["name"].lower())
    else:
        info = page_info(r["source_url"])
        if not info or not info[0] or len(info[0]) > 120 or LISTING.match(info[0]):
            dropped += 1; continue
        r = dict(r, name=info[0], description=info[1] or r["description"])
        key = ("url", r["source_url"].rstrip("/"))
    r["expertise"] = [e for e in r["expertise"] if not GENERIC.search(e)]
    r["projects"] = [p for p in r.get("projects", []) if not GENERIC.search(p)]
    if key in by_url:  # same page or same name: merge topics instead of repeating the card
        m = by_url[key]
        m["expertise"] = list(dict.fromkeys(m["expertise"] + r["expertise"]))
        continue
    by_url[key] = r
# a page title shared by several URLs (e.g. EN/DE copies) is still one card
seen, out = set(), []
for r in by_url.values():
    base = re.sub(r"\s+\d+$", "", r["name"].lower())  # "Du Toit Lab 2" is the same lab
    k = (base, r.get("institution", ""))
    if k in seen or base in OTHER or LISTING.match(r["name"]): continue
    seen.add(k); out.append(r)
doc["records"] = out; doc["count"] = len(out)
doc["note_names"] = "Names and descriptions taken from each record's crawled source page; records sharing a page were merged."
OUT.write_text(json.dumps(doc, ensure_ascii=False, indent=1))
print(len(out), "kept,", dropped, "dropped, from", len(json.loads(SRC.read_text())["records"]))
