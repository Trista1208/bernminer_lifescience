// Data layer for the Bern flow.
// Live mode calls POST /api/ui/analyze (see api.py `_ui_view`) and uses cards[0].
// Demo mode builds a card of the same shape locally, so the UI works without a backend.
// Field names follow BACKEND_CONTRACT.md: match.match_rate, match.score_breakdown
// .components / .component_max / .why_not_higher, match.capability_matches, match.bern_matches.

const API = import.meta.env.VITE_API_BASE || "/api";

export const COMPONENTS = [
  { key: "capability_overlap", label: "Capability overlap", hint: "Specific overlap with Bern research and clinical capabilities" },
  { key: "partnership_readiness", label: "Partnership readiness", hint: "Stated needs Bern can serve: trials, hospital, university, talent" },
  { key: "focused_keywords", label: "Medical focus", hint: "Fit with the focused-crawler medical keyword set" },
  { key: "domain_fit", label: "Domain fit", hint: "Life-science sector value for Bern" },
  { key: "swiss_proximity", label: "Swiss proximity", hint: "Bern site, Swiss HQ, or a neighbouring country" },
  { key: "signal_depth", label: "Signal depth", hint: "How much usable description, keywords and web data we found" },
];

export const DEFAULT_MAX = {
  capability_overlap: 25, focused_keywords: 15, partnership_readiness: 20,
  domain_fit: 15, swiss_proximity: 15, signal_depth: 10,
};

// Seed capabilities (mirrors data/bern_expertise.json) used by demo mode.
const CAPABILITIES = [
  { id: "diabetes_cgm", name: "Diabetes & Continuous Glucose Monitoring", source: "Diabetes Center Berne",
    units: ["Diabetes Center Berne", "Department of Diabetes, Endocrinology, Nutritional Medicine & Metabolism"],
    terms: ["diabetes", "cgm", "glucose", "insulin", "biosensing", "wearable sensing", "pump", "continuous glucose monitoring"] },
  { id: "biomed_eng", name: "Biomedical Engineering & Medical Devices", source: "ARTORG Center",
    units: ["ARTORG Center for Biomedical Engineering Research"],
    terms: ["biomedical engineering", "medical device", "medtech", "implant", "prosthetics", "sensor", "wearable", "device"] },
  { id: "surgical_robotics", name: "Surgical Robotics & Computer-Assisted Intervention", source: "ARTORG Center",
    units: ["ARTORG Center", "Inselspital surgical research groups"],
    terms: ["surgical robotics", "robotic surgery", "navigation", "image-guided", "computer-assisted", "surgery", "surgical"] },
  { id: "medical_imaging_ai", name: "Medical Imaging & Clinical AI", source: "University of Bern / ARTORG",
    units: ["ARTORG", "Department of Diagnostic, Interventional and Pediatric Radiology"],
    terms: ["medical imaging", "radiology", "ai", "deep learning", "computer vision", "pathology", "ultrasound", "mri", "imaging"] },
  { id: "translational_medicine", name: "Translational & Clinical Research", source: "University of Bern / Inselspital",
    units: ["Inselspital", "sitem-insel", "Faculty of Medicine UniBE"],
    terms: ["clinical trial", "clinical validation", "translational", "hospital", "investigator", "clinical study", "clinical"] },
  { id: "biologics_immuno", name: "Biologics, Immunology & Biomanufacturing Talent", source: "University of Bern",
    units: ["Faculty of Medicine", "Institute of Immunology"],
    terms: ["biologics", "immunology", "plasma", "antibody", "biomanufacturing", "vaccine", "cell therapy", "protein", "monoclonal", "antibody-drug conjugate", "biosimilar"] },
  { id: "digital_health", name: "Digital Health & Remote Monitoring", source: "ARTORG / Diabetes Center Berne",
    units: ["ARTORG", "Diabetes Center Berne"],
    terms: ["digital health", "remote monitoring", "mhealth", "telemedicine", "app", "connected", "health data", "software"] },
  { id: "metabolic_nutrition", name: "Metabolic Health & Nutrition Science", source: "University of Bern / Diabetes Center Berne",
    units: ["Diabetes Center Berne"],
    terms: ["metabolic", "obesity", "nutrition", "endocrinology", "metabolism", "glp-1", "weight"] },
  { id: "lab_automation", name: "Lab Automation & Core Facilities", source: "University of Bern",
    units: ["UniBE core facilities", "research platforms"],
    terms: ["lab automation", "assay", "screening", "omics", "sequencing", "proteomics", "high-throughput", "diagnostics"] },
];

const LIFE_SCIENCE = ["biopharma", "medical", "medtech", "health", "pharma", "biotech", "clinical", "patient", "diagnos", "therap",
  "diabetes", "device", "drug", "hospital", "surgical", "glucose", "imaging", "life science", "biolog"];
const MEDICAL = ["diabetes", "glucose", "insulin", "cgm", "sensor", "implant", "surgery", "surgical", "imaging",
  "patient", "clinical", "wearable", "cardio", "oncology", "cancer", "copd", "monitoring", "therapy", "antibody"];
const NEEDS = [
  ["clinical validation", /clinical (validation|trial|stud)/i],
  ["hospital partnership", /hospital/i],
  ["university collaboration", /universit|academ|research partner/i],
  ["talent", /talent|hiring|recruit|engineers/i],
  ["co-development", /co-develop|partner|collaborat/i],
  ["regulatory support", /regulat|approval|swissmedic|ce mark|mdr/i],
];

const BERN_PLACES = /\b(bern|berne|biel|bienne|thun|burgdorf|langenthal)\b/i;
const NEAR_BERN = /\b(fribourg|freiburg|solothurn|neuch[aâ]tel|lucerne|luzern|basel|zurich|z[uü]rich)\b/i;
const SWISS = /\b(switzerland|swiss|schweiz|suisse|geneva|gen[eè]ve|lausanne|zug|lugano|st\.? gallen|ag\b|sa\b)/i;
const NEIGHBOURS = /\b(germany|deutschland|munich|m[uü]nchen|berlin|france|paris|lyon|austria|vienna|italy|milan)\b/i;

const sat = (raw, k) => 1 - Math.exp(-raw / k);
const r1 = (x) => Math.round(x * 10) / 10;

export function tierFor(rate) {
  if (rate >= 70) return { tier: "Strong collaboration potential", verdict: "strong", verdict_label: "Strong potential — prioritize outreach" };
  if (rate >= 50) return { tier: "Promising collaboration potential", verdict: "promising", verdict_label: "Promising — worth exploring with Bern units" };
  if (rate >= 30) return { tier: "Possible collaboration potential", verdict: "possible", verdict_label: "Possible — nurture and gather more signal" };
  return { tier: "Weak collaboration potential", verdict: "weak", verdict_label: "Weak — low collaboration priority for now" };
}

function guessName(name, text, website) {
  if (name?.trim()) return name.trim();
  const m = text.match(/company name\s*:\s*(.+)/i);
  if (m) return m[1].trim();
  if (website) {
    try { return new URL(website.startsWith("http") ? website : `https://${website}`).hostname.replace(/^www\./, "").split(".")[0].replace(/^\w/, (c) => c.toUpperCase()); } catch { /* ignore */ }
  }
  const first = text.trim().split(/[.\n]/)[0];
  return first.split(/\s+/).slice(0, 3).join(" ") || "Your company";
}

function guessHq(text) {
  const m = text.match(/(?:headquarters|hq|based in|located in)\s*:?\s*([^\n.]+)/i);
  if (!m) return { hq_city: null, hq_country: null };
  const [city, country] = m[1].split(",").map((s) => s.trim());
  return { hq_city: city || null, hq_country: country || null };
}

// Builds a `_ui_view` card from the user's input without a backend.
export function mockAnalyze({ name, website, text, fileNames = [] }) {
  const body = `${name || ""}\n${website || ""}\n${text || ""}\n${fileNames.join(" ")}`;
  const lower = body.toLowerCase();
  // word-start match (stems like "therap" still work); short terms like "ai" must be whole words
  const has = (t) => new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}${t.length <= 3 ? "\\b" : ""}`).test(lower);
  const count = (terms) => terms.filter(has).length;

  const caps = CAPABILITIES.map((c) => {
    const hits = c.terms.filter(has);
    return { ...c, overlap_terms: hits, score: r1(hits.length * 2.4 + (hits.some((h) => h.includes(" ")) ? 1.5 : 0)) };
  }).filter((c) => c.overlap_terms.length).sort((a, b) => b.score - a.score);

  const inScope = count(LIFE_SCIENCE) > 0 || caps.length > 0;
  const needs = NEEDS.filter(([, re]) => re.test(body)).map(([n]) => n);
  const hq = guessHq(text || "");
  const where = `${hq.hq_city || ""} ${hq.hq_country || ""} ${body}`;
  const bernSite = BERN_PLACES.test(where);
  const swiss = bernSite || SWISS.test(where) || NEAR_BERN.test(where) || /\.ch\b/.test(website || "");

  const w = DEFAULT_MAX;
  const capRaw = caps.slice(0, 3).reduce((s, c) => s + c.overlap_terms.length, 0);
  const components = inScope ? {
    capability_overlap: r1(w.capability_overlap * 0.84 * sat(capRaw, 3)),
    focused_keywords: r1(w.focused_keywords * sat(count(MEDICAL), 3)),
    partnership_readiness: r1(w.partnership_readiness * Math.min(1, needs.length / 2.5)),
    domain_fit: r1(w.domain_fit * (lower.includes("pharma") ? 1 : 0.95)),
    swiss_proximity: bernSite ? 15 : NEAR_BERN.test(where) ? 13.5 : swiss ? 10.5 : NEIGHBOURS.test(where) ? 5.3 : 0,
    signal_depth: r1(Math.min(10, (text || "").length / 60 + (website ? 2 : 0) + (fileNames.length ? 2 : 0))),
  } : Object.fromEntries(Object.keys(w).map((k) => [k, 0]));

  const match_rate = r1(Math.min(100, Object.values(components).reduce((a, b) => a + b, 0)));
  const why = [];
  if (!inScope) why.push("Out of life-science scope.");
  if (inScope && !swiss) why.push("HQ outside Switzerland — lower proximity score.");
  if (inScope && swiss && !bernSite) why.push("Swiss company but no Canton of Bern site yet.");
  if (inScope && !needs.length) why.push("No stated partnership needs (clinical validation, university, talent…).");
  if (inScope && caps.length < 2) why.push("Few specific overlaps with indexed Bern capabilities — add product/tech detail.");
  if (inScope) why.push("Demo mode: no verified Bern expert records loaded — capability overlap capped at 21/25.");
  if (!website) why.push("No company website on file.");

  const keywords = [...new Set(caps.flatMap((c) => c.overlap_terms))].slice(0, 12);
  const t = tierFor(match_rate);
  const summary = (text || "").replace(/^(company name|headquarters|hq|based in|located in|website)\s*:.*$/gim, "").replace(/\s+/g, " ").trim().slice(0, 260);

  return {
    company_name: guessName(name, text || "", website),
    in_scope: inScope,
    source_type: fileNames.length ? "file" : website ? "url" : "text",
    main_info: {
      name: guessName(name, text || "", website),
      sector: !inScope ? "out of scope" : lower.includes("pharma") ? "pharma" : lower.includes("biotech") ? "biotech" : "medtech",
      subsector: caps[0]?.name || null,
      description: summary,
      what_they_do: summary,
      needs,
      website: website || null,
      ...hq,
      canton_bern_presence: bernSite,
    },
    keywords: { all: keywords, early: keywords.slice(0, 4), mid: keywords.slice(4, 8), late: keywords.slice(8) },
    match: {
      match_rate,
      ...t,
      reasons: caps.slice(0, 3).map((c) => `Aligns with Bern capability '${c.name}' via terms: ${c.overlap_terms.join(", ")}.`),
      score_breakdown: {
        model: "collaboration-v2 (demo)",
        components,
        component_max: { ...w },
        why_not_higher: why,
        verdict: t.verdict,
        verdict_label: t.verdict_label,
      },
      capability_matches: caps.slice(0, 5).map(({ terms, ...c }) => ({
        ...c,
        reason: `Aligns with Bern capability '${c.name}' via terms: ${c.overlap_terms.join(", ")}. Source ecosystem: ${c.source}.`,
      })),
      bern_matches: [],
    },
    _demo: true,
  };
}

// Real example companies. Text is taken from each company's public website
// (medtronic.com, mabwell.com, October 2026); nothing is invented.
export const SAMPLES = [
  {
    label: "Medtronic",
    note: "US medtech",
    name: "Medtronic",
    website: "https://www.medtronic.com/en-us/index.html",
    text: `Headquarters: Minneapolis, United States

Medtronic describes itself as "where health meets high tech": "From the world's smallest pacemaker to robotic-assisted surgery, Medtronic transforms the lives of millions worldwide."

Businesses listed on its website include Cardiac Rhythm & Diagnostics, Cardiovascular, Diabetes, Neurological, Patient Monitoring, Respiratory, Spinal & Orthopedic, Surgical Navigation & Imaging and Surgical Robotics.

Products named on the website include the Hugo robotic-assisted surgery system, the AiBLE smart surgical ecosystem, the Touch Surgery Ecosystem and the Reveal LINQ insertable cardiac monitor (ICM).`,
  },
  {
    label: "Mabwell",
    note: "Chinese biopharma",
    name: "Mabwell (Shanghai) Bioscience",
    website: "https://mabwell.com/en/",
    text: `Headquarters: Shanghai, China

Mabwell "is an innovation-driven biopharmaceutical company with end-to-end capabilities from drug discovery to commercialization". It runs automatic, high-throughput antibody engineering platforms and a druggability evaluation system, and its manufacturing system is GMP compliant for China, the U.S. and Europe.

Pipeline and products named on its website: 9MW2821, a Nectin-4-targeting antibody-drug conjugate (ADC) studied with toripalimab in cervical cancer and triple-negative breast cancer (oncology); 9MW1911, an anti-ST2 monoclonal antibody with Phase Ib/IIa data in COPD; an aflibercept biosimilar with partnerships in ASEAN countries and the GCC; and denosumab injections. Listed in Shanghai (688062.SH) and Hong Kong (02493.HK).`,
  },
];

// /health also asks the local LLM for its status, which can take several seconds,
// so wait generously and retry a few times before falling back to demo data.
export async function checkHealth(tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 10000);
      const res = await fetch(`${API}/health`, { signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

export async function analyzeLive({ name, website, text, files }) {
  const form = new FormData();
  // Any combination works:
  // - name only → backend web-searches + LLM knowledge
  // - website only → fetch page (or domain fallback) + enrich
  // - text only → extract + score
  // - any mix → merged into one company card
  const n = (name || "").trim();
  const w = (website || "").trim();
  const t0 = (text || "").trim();
  let fullText = "";
  if (t0 && n) fullText = `Company Name: ${n}\n${t0}`;
  else if (t0) fullText = t0;
  else if (n) fullText = n; // name-only seed → backend web search + LLM
  if (fullText) form.append("text", fullText);
  if (w) form.append("urls", w);
  for (const f of files || []) form.append("files", f);
  form.append("llm_mode", "lite");
  form.append("translate", "true");
  form.append("write_handoff", "true");
  form.append("index_qdrant", "false");
  if (!fullText && !w && !(files || []).length) {
    throw new Error("Add a company name, website, text, or PDF.");
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 180_000);
  try {
    const res = await fetch(`${API}/ui/analyze`, { method: "POST", body: form, signal: ctrl.signal });
    if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const view = await res.json();
    const cards = view.cards || [];
    if (!cards.length) throw new Error("The API returned no company.");
    const wanted = n.toLowerCase();
    return normalizeCard(cards.find((c) => wanted && (c.company_name || "").toLowerCase().includes(wanted)) || cards[0]);
  } finally {
    clearTimeout(t);
  }
}

// The API names capability fields capability_id / capability_name; demo mode uses id / name.
export function normalizeCard(card) {
  const m = card.match || {};
  return {
    ...card,
    match: {
      ...m,
      capability_matches: (m.capability_matches || []).map((c) => ({
        ...c, id: c.id || c.capability_id, name: c.name || c.capability_name,
      })),
    },
  };
}

// Bern counterparts for the choice step: verified teammate records first, then seed capabilities.
export function partnersFrom(card) {
  const m = card?.match || {};
  const fromRecords = (m.bern_matches || []).map((b) => ({
    id: `rec:${b.record_id}`,
    name: b.name,
    kind: b.type || "record",
    detail: b.reason || "",
    terms: b.matched_terms || [],
    url: b.source_url,
    units: [b.institution || b.name].filter(Boolean),
    verified: true,
  }));
  const fromCaps = (m.capability_matches || []).map((c) => ({
    id: `cap:${c.id}`,
    name: c.name,
    kind: "capability",
    detail: (c.units || []).join(" · "),
    terms: c.overlap_terms || [],
    units: c.units || [],
    source: c.source,
    verified: false,
  }));
  return [...fromRecords, ...fromCaps];
}
