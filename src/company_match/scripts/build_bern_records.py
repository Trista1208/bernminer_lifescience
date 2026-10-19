"""Turn the team's crawled Bern pages (data/raw/<site>/) into bern_records for company_match.

Usage: python build_bern_records.py <repo>/data/raw <out.json>
"""
import json, re, sys
from collections import Counter
from pathlib import Path
from bs4 import BeautifulSoup

RAW = Path(sys.argv[1]); OUT = Path(sys.argv[2])

SITES = {  # life-science relevant sites only
    "artorg": "ARTORG Center for Biomedical Engineering Research",
    "dcberne": "Diabetes Center Berne",
    "dbmr": "Department for BioMedical Research (DBMR)",
    "medizin": "Faculty of Medicine, University of Bern",
    "ikim": "Institute of Complementary and Integrative Medicine",
    "iml": "Institute for Medical Education",
    "ibmm": "Institute of Biochemistry and Molecular Medicine",
    "ispm": "Institute of Social and Preventive Medicine",
    "bcpm": "Bern Center for Precision Medicine",
    "neuroscience": "Neuroscience Bern",
    "ngs": "Next Generation Sequencing Platform",
    "mic": "Microscopy Imaging Center",
    "img": "Institute of Medical Genetics",
    "pki": "Institute of Pharmacology",
    "ifik": "Institute for Infectious Diseases",
    "izb": "Institute of Cell Biology",
    "vetsuisse": "Vetsuisse Faculty Bern",
    "ita-vetsuisse": "Institute of Animal Pathology, Vetsuisse",
    "biology": "Institute of Ecology and Evolution / Biology",
    "tki": "Theodor Kocher Institute",
    "irm": "Institute of Forensic Medicine",
    "csh": "Centre for Sustainable Health",
    "cde": "Centre for Development and Environment",
    "dcbp": "Department of Chemistry, Biochemistry and Pharmaceutical Sciences",
}

VOCAB = {  # canonical term: regex (EN + DE)
    "continuous glucose monitoring": r"continuous glucose|\bcgm\b|glucose sens|glukose",
    "diabetes": r"diabet",
    "insulin delivery": r"insulin (pump|deliver)|closed[- ]loop|artificial pancreas",
    "metabolism": r"metabol|obesity|adipositas",
    "medical device": r"medical device|medizinprodukt|implant",
    "surgical robotics": r"surgical robot|robotic surg|robot",
    "surgical navigation": r"navigation|image[- ]guided",
    "medical imaging": r"medical imag|\bmri\b|\bct\b|radiolog|ultrasound|bildgeb",
    "artificial intelligence": r"artificial intelligence|machine learning|deep learning|\bai\b|künstliche intelligenz",
    "biomedical engineering": r"biomedical engineering|bioengineering|biomechanic",
    "cardiovascular": r"cardiovascular|cardiac|heart|kardio",
    "neuroscience": r"neuro|brain|gehirn",
    "ophthalmology": r"ophthalm|retina|\beye\b",
    "orthopaedics": r"orthop|spine|bone|musculoskeletal",
    "hearing": r"hearing|cochlear|audiolog",
    "oncology": r"cancer|tumou?r|oncolog|krebs",
    "immunology": r"immun",
    "infectious diseases": r"infect|virus|viral|bacteri|antibiotic|antimicrob",
    "genomics": r"genom|sequencing|\bngs\b|genetic",
    "precision medicine": r"precision medicine|personali[sz]ed medicine",
    "drug discovery": r"drug discovery|pharmacolog|therapeutic|wirkstoff",
    "biologics": r"antibod|protein engineering|biologic",
    "cell biology": r"cell biolog|stem cell|zellbiolog",
    "microscopy": r"microscop|mikroskop",
    "clinical trials": r"clinical (trial|stud)|klinische stud",
    "epidemiology": r"epidemiolog|public health|cohort",
    "digital health": r"digital health|telemedicine|mhealth|wearable|app\b",
    "regenerative medicine": r"regenerat|tissue engineering",
    "veterinary medicine": r"veterin|animal health|tiermedizin",
    "lab automation": r"automation|high[- ]throughput|core facilit",
}
VOCAB = {k: re.compile(v, re.I) for k, v in VOCAB.items()}

def kind(url):
    u = url.lower()
    if re.search(r"/(staff|persons?|people|team)/[^/]+/(index|$)", u) or re.search(r"/(prof|dr|pd)_", u): return "person"
    if re.search(r"_lab/|research_programs/|/research/[a-z]{2,5}/index|/group|/forschungsgruppe", u): return "group"
    if re.search(r"/projects?/|/project_category/", u): return "project"
    if re.search(r"facilit|platform|plattform|service|dienstleist", u): return "service"
    return "unit"

SKIP = re.compile(r"news|newsletter|event|publication|boris_portal|kontakt|contact|impressum|jobs|stellen|studium|lehre|teaching|login|sitemap|/de/|index_ger|_ger\.html|/fr/", re.I)

NOISE = re.compile(r"prize|award|seminar|alumni|^objectives$|^research$|^focus areas|project calls|^cas\b|join .*study|making life|^home$|^about|overview$|^welcome|^team$|^projects?$|ongoing projects|ended projects|partners & network|research programs|research groups|^community$|phd projects|^people$|^members$|lecture|course|vacanc|opening hours|emergenc", re.I)
SCRUB = re.compile(r"(\+?\d[\d\s()/-]{7,}\d)|([\w.+-]+@[\w-]+\.[\w.]+)|\bPhone2?\b|\bE-Mail(-Address)?\b|\bContact\b", re.I)

def text_of(soup):
    for t in soup(["script", "style", "nav", "header", "footer", "noscript"]): t.decompose()
    main = soup.find("main") or soup.find(id=re.compile("content|main", re.I)) or soup.body or soup
    return re.sub(r"\s+", " ", main.get_text(" ")).strip()

def clean_title(s, inst):
    s = re.split(r"\s+[|–-]\s+", s or "")[0].strip()
    return s

records, seen = [], set()
for site, inst in SITES.items():
    man = RAW / site / "manifest.jsonl"
    if not man.exists(): continue
    for line in man.open():
        r = json.loads(line)
        if r.get("status") != 200 or not r.get("file"): continue
        url = r.get("final_url") or r["url"]
        if SKIP.search(url): continue
        f = RAW / site / r["file"]
        if not f.exists(): continue
        soup = BeautifulSoup(f.read_text(errors="ignore"), "html.parser")
        h1 = soup.find("h1"); title = clean_title((h1.get_text(" ", strip=True) if h1 else "") or (soup.title.string if soup.title else ""), inst)
        meta = soup.find("meta", attrs={"name": "description"})
        body = text_of(soup)
        if not title or len(title) > 120 or len(body) < 200 or NOISE.search(title): continue
        lead = (meta.get("content", "").strip() if meta else "") or body[:500]
        if lead.lower().startswith(title.lower()): lead = lead[len(title):]
        lead = re.sub(r"\s+", " ", SCRUB.sub(" ", lead)).strip(" ·|-–")
        lead = lead[:300].rsplit(" ", 1)[0] + ("…" if len(lead) > 300 else "")
        hits = [k for k, rx in VOCAB.items() if len(rx.findall(body)) >= 2]
        if len(hits) < 2: continue
        # surface words the page actually uses for each topic (e.g. "cancer", "antibodies"), so
        # company keywords match them lexically in bern_records.match
        toks = Counter(w for w in re.findall(r"[a-zäöü][a-zäöü-]{3,}", body.lower()))
        words = []
        for k in hits:
            rx = VOCAB[k]
            words += [w for w, _ in sorted(((w, c) for w, c in toks.items() if rx.search(w)), key=lambda x: -x[1])[:3]]
        words = [w for w in dict.fromkeys(words) if w not in hits][:10]
        key = (site, title.lower())
        if key in seen: continue
        seen.add(key)
        t = kind(url)
        if t == "person" and not re.search(r"prof|\bdr\b|dr\.|\bpd\b|head|leader|director", title + " " + lead, re.I): continue
        rec = {
            "id": f"{site}-{len(records)+1:04d}", "type": t, "name": title, "institution": inst,
            "expertise": hits[:8] + words, "description": lead, "source_url": url,
            "source": "crawl", "site": site,
        }
        if t == "person":
            m = re.search(r"/research/([a-z]+)/", url)
            if m: rec["unit"] = m.group(1).upper()
        records.append(rec)

OUT.write_text(json.dumps({"_note": "Built from the team's crawled Bern pages (data/raw/<site>/) by extract.py. Every record links to its public source page.", "records": records}, ensure_ascii=False, indent=1))
from collections import Counter
print(len(records), Counter(r["type"] for r in records), Counter(r["site"] for r in records).most_common(30))
