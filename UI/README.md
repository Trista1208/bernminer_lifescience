# BearMiner UI (React)

*Dig Bern gold from life-science partners.*

Four steps: **Company → Match → Choose → Proposal PDF**, with Berni the Bern bear.

One input is enough: a company **name**, a **website**, a **PDF**, or a short description.

## Run it (two terminals, from the repo root)

Terminal 1, the matching API (the real `company_match` logic):

```bash
source .venv/bin/activate          # or: python3 -m venv .venv && source .venv/bin/activate
pip install -r src/company_match/requirements.txt
PYTHONPATH=src uvicorn company_match.api:app --app-dir src --reload --port 8088
```

Terminal 2, the UI:

```bash
cd UI
npm install
npm run dev
```

Open http://localhost:5173. The badge in the top right says **Live API** when the UI can reach
the API on port 8088. If the API is down, it says **Demo data** and scores in the browser instead.
The original analyst screen is still at http://localhost:5173/?classic.

## How it talks to the backend

- `src/bern/data.js` → `analyzeLive()` posts the form to `POST /ui/analyze` (the Vite dev server
  proxies `/api` to `http://127.0.0.1:8088`). It sends `text` (the name alone, or
  `Company Name: …` plus the description), `urls` (website) and `files` (PDF), with `llm_mode=lite`.
- A bare name is a "name-only seed": the backend searches the web for it, so that needs internet,
  and an LLM (Ollama or Apertus in `.env`) gives richer profiles.
- The UI reads `cards[0]` of the response: `match.match_rate`, `match.score_breakdown.components`
  and `component_max` (the six score parts), `why_not_higher`, `capability_matches`,
  `bern_matches` and `warnings`. Field names follow `src/company_match/BACKEND_CONTRACT.md`.
- The proposal PDF is made in the browser (html2canvas + jsPDF, loaded from cdnjs on first click),
  so that needs internet too.

## Plugging in the crawled Bern data

The UI needs no change. Crawled records go to the backend, and the score page shows how many were
used ("N crawled Bern records") and lists matching ones as **verified record** partners with their
source URL. Those partners can be picked in step 3 and appear in the PDF.

Either drop a records file (JSON / JSONL, format in `src/company_match/BACKEND_CONTRACT.md`) into
`src/company_match/data/bern_records/`, or import the focused crawler's export:

```bash
PYTHONPATH=src python -m navigator focused-crawl --complete --export data/highlights.json
PYTHONPATH=src python -m company_match import-focused data/highlights.json
curl localhost:8088/bern/records/status    # check what the matcher loaded
```

Records are re-read automatically when the files change.

## Files

- `src/BernApp.jsx`: the four steps
- `src/bern/data.js`: API call, demo scorer, sample companies (Medtronic, Mabwell)
- `src/bern/Letter.jsx`: the proposal letter
- `src/bern/pdf.js`: PDF download
- `src/bern/Bear.jsx`: Berni
- `src/bern.css`: styles
