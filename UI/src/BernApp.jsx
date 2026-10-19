import { useEffect, useMemo, useRef, useState } from "react";
import Bear, { BearMark } from "./bern/Bear.jsx";
import Letter, { OFFERS } from "./bern/Letter.jsx";
import Coin, { COIN_LABELS, CoinRating, CoinShower, coinsFor, zeroCoinLabel, reducedMotion } from "./bern/Coin.jsx";
import { downloadLetter } from "./bern/pdf.js";
import {
  COMPONENTS, DEFAULT_MAX, SAMPLES, analyzeLive, checkHealth, mockAnalyze, partnersFrom,
} from "./bern/data.js";
import "./bern.css";

const STEPS = ["Company", "Match", "Choose", "Proposal"];

function Stepper({ step, maxStep, onGo }) {
  return (
    <ol className="stepper" aria-label="Progress">
      {STEPS.map((s, i) => (
        <li key={s} className={i === step ? "is-current" : i < step ? "is-done" : ""}>
          <button type="button" disabled={i > maxStep} onClick={() => onGo(i)}>
            <span className="stepper__dot">{i < step ? "✓" : i + 1}</span>
            <span className="stepper__label">{s}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

function Speech({ mood, children, size = 130, onPoke }) {
  const [hop, setHop] = useState(0);
  const poke = () => { setHop((h) => h + 1); onPoke?.(); };
  return (
    <div className="speech">
      <button type="button" className={`speech__poke ${hop ? "is-hop" : ""}`} key={hop}
        onClick={poke} aria-label="Poke Berni" title="Poke Berni">
        <Bear mood={mood} size={size} className="speech__bear" />
      </button>
      <div className="speech__bubble" key={typeof children === "string" ? children : undefined}>{children}</div>
    </div>
  );
}

const POKE_LINES = [
  "Hey, that tickles! Give me a company and I'll go dig.",
  "One coin is possible potential, two is promising, three means strong — dig in.",
  "Paste a website or drop a pitch deck. The more I read, the deeper I can dig.",
  "Try the Medtronic sample if you want to see me get really excited.",
  "I only dig for life-science gold. Bananas are someone else's job.",
];

/* ---------- 1. Company entry ---------- */

const LOADING_LINES = [
  "Reading the company profile…",
  "Translating to English where needed…",
  "Comparing with Bern research groups…",
  "Checking hospital and clinical partners…",
  "Adding up the six score parts…",
];

function EntryStep({ live, onResult }) {
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [line, setLine] = useState(0);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const fileRef = useRef(null);
  const [poke, setPoke] = useState(-1);

  useEffect(() => {
    if (!busy) return undefined;
    const t = setInterval(() => setLine((l) => (l + 1) % LOADING_LINES.length), 1400);
    return () => clearInterval(t);
  }, [busy]);

  const ready = name.trim() || website.trim() || text.trim() || files.length;

  async function submit(e) {
    e?.preventDefault();
    const input = { name, website, text, files };
    if (!(input.name || input.website || input.text || input.files?.length)) return;
    setBusy(true); setError(""); setLine(0);
    try {
      let card;
      if (live) {
        card = await analyzeLive(input);
      } else {
        await new Promise((r) => setTimeout(r, 1600));
        card = mockAnalyze({ ...input, fileNames: (input.files || []).map((f) => f.name) });
      }
      onResult(card);
    } catch (err) {
      setError(err.name === "AbortError" ? "The API took too long to answer." : err.message);
    } finally {
      setBusy(false);
    }
  }

  function pickSample(s) {
    setName(s.name); setWebsite(s.website); setText(s.text); setFiles([]);
  }

  function addFiles(list) {
    const pdfs = [...list].filter((f) => /pdf|text/.test(f.type) || /\.(pdf|txt)$/i.test(f.name));
    setFiles((prev) => [...prev, ...pdfs].slice(0, 3));
  }

  if (busy) {
    return (
      <div className="loading card">
        <Bear mood="dig" size={170} />
        <h2>Berni is digging for Bern gold</h2>
        <p className="loading__line" key={line}>{LOADING_LINES[line]}</p>
        <div className="loading__bar"><i /></div>
      </div>
    );
  }

  return (
    <div className="entry">
      <section className="entry__hero">
        <p className="eyebrow">BearMiner · Canton of Bern life science</p>
        <h1>Dig Bern <em className="gold-word">gold<span className="gold-word__coins" aria-hidden="true">
          <Coin size={30} /><Coin size={24} /></span></em> from life-science partners.</h1>
        <p className="slogan">Find out how well a company fits Bern, then send it a proposal.</p>
        <p className="lede">
          Tell us about a company. We match it against Bern's hospitals, research groups and
          programmes, then turn the result into a ready-to-send investment proposal.
        </p>
        <Speech mood={poke < 0 ? "wave" : "happy"} size={150} onPoke={() => setPoke((n) => (n + 1) % POKE_LINES.length)}>
          {poke < 0
            ? <>Grüessech! I'm <b>Berni</b>, the BearMiner. Give me a name, a website or a pitch deck and I'll start digging.</>
            : POKE_LINES[poke]}
        </Speech>
        <div className="legend" aria-label="How the coins work">
          <span><Coin size={22} /> possible <small>25+</small></span>
          <span><Coin size={22} /><Coin size={22} /> promising <small>50+</small></span>
          <span><Coin size={22} /><Coin size={22} /><Coin size={22} /> strong <small>70+</small></span>
        </div>
      </section>

      <form className="card entry__form" onSubmit={submit}>
        <div className="field-row">
          <label className="field">
            <span>Company name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name alone works — e.g. Mabwell" />
          </label>
          <label className="field">
            <span>Website</span>
            <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="URL alone works — https://…" inputMode="url" />
          </label>
        </div>
        <label className="field">
          <span>What does the company do? <em style={{fontWeight:400,color:"var(--ink-3)"}}>(optional if you gave a name or URL)</em></span>
          <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)}
            placeholder="Optional: paste a description, press release or pitch. Any language. Name, URL, or text alone is enough." />
        </label>

        <div
          className={`drop ${drag ? "is-drag" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
          onClick={() => fileRef.current?.click()}
          role="button" tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept=".pdf,.txt,application/pdf,text/plain" multiple hidden
            onChange={(e) => addFiles(e.target.files)} />
          <span className="drop__icon">📄</span>
          {files.length ? (
            <span>{files.map((f) => f.name).join(", ")} <button type="button" className="linkish"
              onClick={(e) => { e.stopPropagation(); setFiles([]); }}>remove</button></span>
          ) : (
            <span>Drop a pitch deck PDF here, or <u>browse</u></span>
          )}
        </div>

        <div className="samples">
          <span>Try a sample:</span>
          {SAMPLES.map((s) => (
            <button type="button" key={s.label} className="chip chip--btn" onClick={() => pickSample(s)}>
              {s.label} <small>{s.note}</small>
            </button>
          ))}
        </div>

        {error && (
          <div className="alert">
            <strong>That didn't work.</strong> {error}
            <button type="button" className="linkish" onClick={() => {
              onResult(mockAnalyze({ name, website, text, fileNames: files.map((f) => f.name) }));
            }}>Use demo data instead</button>
          </div>
        )}

        <div className="actions">
          <span className="muted">{live
            ? "Live API — name, URL, or text (any one is enough)"
            : "Demo mode: scored in your browser"}</span>
          <button className="btn btn--primary" disabled={!ready}>Find my Bern match →</button>
        </div>
      </form>
    </div>
  );
}

/* ---------- 2. Score ---------- */

function useCountUp(target, ms = 1100) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (reducedMotion()) { setV(target); return undefined; }
    let raf; const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / ms);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

function verdictTone(rate) {
  if (rate >= 70) return "strong";
  if (rate >= 50) return "promising";
  if (rate >= 30) return "possible";
  return "weak";
}

function ScoreRing({ rate }) {
  const v = useCountUp(rate);
  const R = 84; const C = 2 * Math.PI * R;
  return (
    <div className={`ring ring--${verdictTone(rate)}`}>
      <svg viewBox="0 0 200 200" width="200" height="200" aria-hidden="true">
        <circle cx="100" cy="100" r={R} className="ring__track" />
        <circle cx="100" cy="100" r={R} className="ring__fill"
          strokeDasharray={C} strokeDashoffset={C * (1 - v / 100)} transform="rotate(-90 100 100)" />
      </svg>
      <div className="ring__label">
        <strong>{Math.round(v)}</strong>
        <span>of 100</span>
      </div>
    </div>
  );
}

function CountNum({ value, delay = 0 }) {
  const [go, setGo] = useState(false);
  useEffect(() => { const t = setTimeout(() => setGo(true), delay); return () => clearTimeout(t); }, [delay]);
  const v = useCountUp(go ? value : 0, 900);
  return <>{v.toFixed(1)}</>;
}

function ScoreStep({ card, onNext, onBack, onMined }) {
  const m = card.match || {};
  const sb = m.score_breakdown || {};
  const comps = sb.components || {};
  const maxes = { ...DEFAULT_MAX, ...(sb.component_max || {}) };
  const rate = m.match_rate ?? 0;
  const info = card.main_info || {};
  const tips = sb.why_not_higher || [];
  const partners = partnersFrom(card);
  const tone = verdictTone(rate);
  const kw = card.keywords?.all || [];
  const out = card.in_scope === false;
  // Backend notes, minus LLM-setup hints that only matter to developers.
  const notes = (card.warnings || []).filter((w) => !/LLM profile skipped|Web enrich disabled/i.test(w));
  const thin = out && notes.some((w) => /no usable public results|found no public results|Could not read source/i.test(w));
  const recordsLoaded = sb.bern_records_loaded;
  const coins = coinsFor(rate, !out);

  const bearSays = thin
    ? "I couldn't find enough about this company to judge it. Add its website, a short description or a PDF and try again."
    : out
    ? "Hmm, this one isn't a life-science company, so Bern's health ecosystem isn't the right fit. Try another?"
    : coins === 3 ? "Three gold coins! Strong collaboration potential — Bern has real partners waiting for this one."
    : coins === 2 ? "Two gold coins — promising potential. A few Bern teams line up well. Let's pick who to introduce."
    : coins === 1 ? "One gold coin — there's possible potential here, and a focused proposal can still win them over."
    : "No gold this time — the fit with Bern is very weak. You can still send a short hello, or try another company.";
  const mood = thin ? "think" : out ? "shrug" : coins === 3 ? "gold" : coins === 2 ? "cheer" : coins === 1 ? "happy" : "shrug";
  const coinLabel = coins === 0 ? zeroCoinLabel(!out) : COIN_LABELS[coins];

  return (
    <div className="score">
      <section className={`card score__hero score__hero--c${coins}`}>
        {coins >= 2 && <CoinShower n={coins === 3 ? 30 : 12} />}
        <div className="score__left">
          <ScoreRing rate={rate} />
          <CoinRating count={coins} delay={1000} onLanded={() => onMined?.(coins)} />
          <div className="coins__label">{coinLabel}</div>
          <div className={`verdict verdict--${tone}`}>{m.verdict_label || m.tier || "Scored"}</div>
        </div>
        <div className="score__right">
          <p className="eyebrow">Match result</p>
          <h1>{card.company_name || info.name}</h1>
          <div className="facts">
            {info.sector && <span className="chip">{info.sector}</span>}
            {info.subsector && <span className="chip">{info.subsector}</span>}
            {(info.hq_city || info.hq_country) && (
              <span className="chip">📍 {[info.hq_city, info.hq_country].filter(Boolean).join(", ")}</span>
            )}
            {info.canton_bern_presence && <span className="chip chip--red">Already in Canton Bern</span>}
            {card._demo ? <span className="chip chip--ghost">Demo data</span>
              : <span className="chip chip--live">Live match</span>}
            {!card._demo && recordsLoaded != null && (
              <span className="chip" title="Crawled Bern records the matcher used">
                {recordsLoaded ? `${recordsLoaded} crawled Bern records` : "No crawled Bern records yet"}
              </span>
            )}
          </div>
          {(info.what_they_do || info.description) && <p className="score__about">{info.what_they_do || info.description}</p>}
          <Speech mood={mood} size={110}>{bearSays}</Speech>
        </div>
      </section>

      <div className="score__grid">
        <section className="card">
          <h2>Six parts of the score</h2>
          <ul className="bars">
            {COMPONENTS.map((c, i) => {
              const val = comps[c.key] ?? 0; const max = maxes[c.key] || 1;
              return (
                <li key={c.key}>
                  <div className="bars__top">
                    <span className="bars__label">{c.label}</span>
                    <span className="bars__val"><CountNum value={val} delay={i * 80} /><small> / {max}</small></span>
                  </div>
                  <div className="bars__track">
                    <i style={{ width: `${Math.min(100, (val / max) * 100)}%`, animationDelay: `${i * 80}ms` }} />
                  </div>
                  <p className="bars__hint">{c.hint}</p>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="score__side">
          <section className="card">
            <h2>Bern counterparts</h2>
            {partners.length ? (
              <ul className="mini-partners">
                {partners.slice(0, 4).map((p) => (
                  <li key={p.id}>
                    <strong>{p.name}</strong>
                    <span>{p.detail}</span>
                    {p.verified && <em className="chip chip--red">verified record</em>}
                  </li>
                ))}
              </ul>
            ) : <p className="muted">No specific Bern counterparts found yet.</p>}
          </section>

          {tips.length > 0 && (
            <section className="card">
              <h2>What would raise it</h2>
              <ul className="tips">{tips.map((t) => <li key={t}>{t}</li>)}</ul>
            </section>
          )}

          {notes.length > 0 && (
            <section className="card">
              <h2>Notes from the matcher</h2>
              <ul className="tips">{notes.map((t) => <li key={t}>{t}</li>)}</ul>
            </section>
          )}

          {kw.length > 0 && (
            <section className="card">
              <h2>Keywords we picked up</h2>
              <div className="facts">{kw.slice(0, 14).map((k) => <span key={k} className="chip">{k}</span>)}</div>
            </section>
          )}
        </div>
      </div>

      <div className="actions actions--bar">
        <button className="btn" onClick={onBack}>← Another company</button>
        <button className="btn btn--primary" onClick={onNext} disabled={out}>Choose what to offer →</button>
      </div>
    </div>
  );
}

/* ---------- 3. Choice session ---------- */

export function defaultChoice(card) {
  const info = card.main_info || {};
  const needs = (info.needs || []).join(" ").toLowerCase();
  const capIds = (card.match?.capability_matches || []).map((c) => c.id);
  const offers = [];
  if (/clinical|hospital|trial|validation/.test(needs) || capIds.includes("translational_medicine") || info.sector === "medtech") offers.push("clinical");
  if (/universit|co-develop|research/.test(needs) || capIds.some((id) => ["biomed_eng", "surgical_robotics", "medical_imaging_ai"].includes(id))) offers.push("rnd");
  if (capIds.includes("diabetes_cgm")) offers.push("diabetes");
  if (!info.canton_bern_presence) offers.push("site");
  if (/talent/.test(needs)) offers.push("talent");
  if (/pharma|biotech/.test(info.sector || "")) offers.push("clinical", "talent", "regulatory");
  if (!offers.length) offers.push("rnd", "site");
  return {
    partners: partnersFrom(card).slice(0, 2).map((p) => p.id),
    offers: [...new Set(offers)].slice(0, 4),
    tone: "warm",
    recipient: "",
    senderName: "",
    senderOrg: "Invest in Bern",
    senderEmail: "",
    message: "",
    // Opt-in: score stays off unless the user explicitly enables it for the letter/PDF
    includeScore: false,
  };
}

function toggle(list, id) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

function ChoiceStep({ card, choice, setChoice, onNext, onBack }) {
  const partners = partnersFrom(card);
  const capIds = (card.match?.capability_matches || []).map((c) => c.id);
  const offers = OFFERS.filter((o) => !o.needsCap || capIds.includes(o.needsCap));
  const set = (k) => (e) => setChoice({ ...choice, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  return (
    <div className="choice">
      <Speech mood="happy" size={110}>
        Now you choose! Pick the Bern partners to introduce and what Bern should offer
        <b> {card.company_name}</b>. I've ticked my favourites already.
      </Speech>

      <section className="card">
        <div className="section-head">
          <h2>1 · Who should they meet?</h2>
          <span className="muted">{choice.partners.length} selected</span>
        </div>
        {partners.length ? (
          <div className="pick-grid">
            {partners.map((p) => {
              const on = choice.partners.includes(p.id);
              return (
                <button type="button" key={p.id} className={`pick ${on ? "is-on" : ""}`} aria-pressed={on}
                  onClick={() => setChoice({ ...choice, partners: toggle(choice.partners, p.id) })}>
                  <span className="pick__check">{on ? "✓" : ""}</span>
                  <strong>{p.name}</strong>
                  <span className="pick__detail">{p.detail}</span>
                  {p.terms.length > 0 && (
                    <span className="pick__terms">{p.terms.slice(0, 4).map((t) => <i key={t}>{t}</i>)}</span>
                  )}
                </button>
              );
            })}
          </div>
        ) : <p className="muted">No matched partners yet; the proposal will focus on what Bern offers.</p>}
      </section>

      <section className="card">
        <div className="section-head">
          <h2>2 · What should Bern offer?</h2>
          <span className="muted">{choice.offers.length} selected</span>
        </div>
        <div className="offer-grid">
          {offers.map((o) => {
            const on = choice.offers.includes(o.id);
            return (
              <button type="button" key={o.id} className={`offer ${on ? "is-on" : ""}`} aria-pressed={on}
                onClick={() => setChoice({ ...choice, offers: toggle(choice.offers, o.id) })}>
                <span className="offer__icon">{o.icon}</span>
                <strong>{o.title}</strong>
                <span>{o.blurb}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="card">
        <h2>3 · Letter details</h2>
        <div className="tone">
          {[["warm", "Warm & friendly"], ["formal", "Formal"]].map(([id, label]) => (
            <label key={id} className={`tone__opt ${choice.tone === id ? "is-on" : ""}`}>
              <input type="radio" name="tone" value={id} checked={choice.tone === id} onChange={set("tone")} />
              {label}
            </label>
          ))}
        </div>
        <label className={`score-toggle ${choice.includeScore ? "is-on" : ""}`}>
          <input
            type="checkbox"
            checked={choice.includeScore === true}
            onChange={(e) => setChoice({ ...choice, includeScore: e.target.checked })}
          />
          <span>
            <strong>Show collaboration score on the letter / PDF</strong>
            <small>
              {choice.includeScore
                ? `On — ${Math.round(card.match?.match_rate ?? 0)}/100 appears in the hero and breakdown.`
                : "Off — score stays in BearMiner only (good when the number is not strong yet)."}
            </small>
          </span>
        </label>
        <div className="field-row">
          <label className="field"><span>Addressed to</span>
            <input value={choice.recipient} onChange={set("recipient")} placeholder={`e.g. Dr. Anna Muster, CEO of ${card.company_name}`} /></label>
          <label className="field"><span>Your name</span>
            <input value={choice.senderName} onChange={set("senderName")} placeholder="Who signs the letter" /></label>
        </div>
        <div className="field-row">
          <label className="field"><span>Organisation</span>
            <input value={choice.senderOrg} onChange={set("senderOrg")} /></label>
          <label className="field"><span>Contact email</span>
            <input value={choice.senderEmail} onChange={set("senderEmail")} placeholder="optional" /></label>
        </div>
        <label className="field"><span>Personal note (optional)</span>
          <textarea rows={3} value={choice.message} onChange={set("message")}
            placeholder="Anything you want to add in your own words" /></label>
      </section>

      <div className="actions actions--bar">
        <button className="btn" onClick={onBack}>← Back to score</button>
        <button className="btn btn--primary" onClick={onNext}
          disabled={!choice.offers.length && !choice.partners.length}>Generate proposal PDF →</button>
      </div>
    </div>
  );
}

/* ---------- 4. Proposal PDF ---------- */

function ProposalStep({ card, choice, onBack, onRestart, setChoice }) {
  const partners = partnersFrom(card);
  const [writing, setWriting] = useState(true);
  useEffect(() => { const t = setTimeout(() => setWriting(false), 1300); return () => clearTimeout(t); }, []);

  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const showScore = choice?.includeScore === true;

  async function download() {
    setSaving(true); setNote("");
    const safe = (card.company_name || "proposal").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-");
    try {
      // Pass data (not a DOM screenshot) so includeScore is authoritative
      const r = await downloadLetter(
        {
          card,
          choice: { ...choice, includeScore: showScore },
          partners,
          offers: OFFERS,
        },
        `BearMiner-proposal-${safe}.pdf`
      );
      setNote(
        r === "saved"
          ? (showScore ? "PDF saved (with score)." : "PDF saved (score hidden).")
          : "Download cancelled."
      );
    } catch (e) {
      setNote(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (writing) {
    return (
      <div className="loading card">
        <Bear mood="letter" size={150} className="bob" />
        <h2>Berni is writing to {card.company_name}…</h2>
        <div className="loading__bar"><i /></div>
      </div>
    );
  }

  return (
    <div className="proposal">
      <aside className="proposal__side no-print">
        <Speech mood="cheer" size={120}>Your proposal is ready! Save it as a PDF and send it off.</Speech>
        <label className={`score-toggle ${showScore ? "is-on" : ""}`}>
          <input
            type="checkbox"
            checked={showScore}
            onChange={(e) => setChoice({ ...choice, includeScore: e.target.checked })}
          />
          <span>
            <strong>Include score in PDF</strong>
            <small>{showScore ? "Score is visible on the letter" : "Score hidden from the letter & PDF"}</small>
          </span>
        </label>
        <button className="btn btn--primary btn--block" onClick={download} disabled={saving}>
          {saving ? "Making your PDF…" : "⬇ Download PDF"}
        </button>
        <p className="muted small" role="status">{note || "An A4 PDF of the letter on the right."}</p>
        <button className="btn btn--block" onClick={onBack}>✎ Change choices</button>
        <button className="btn btn--ghost btn--block" onClick={onRestart}>Start with another company</button>
      </aside>
      <div className="proposal__paper">
        <Letter card={card} choice={choice} partners={partners} />
      </div>
    </div>
  );
}

/* ---------- App ---------- */

export default function BernApp() {
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [card, setCard] = useState(null);
  const [choice, setChoice] = useState(null);
  const [apiUp, setApiUp] = useState(false);
  const [live, setLive] = useState(false);
  // Coins mined, kept in this browser between visits when storage is allowed.
  const [mined, setMined] = useState(() => {
    try { return Number(localStorage.getItem("bearminer.mined")) || 0; } catch { return 0; }
  });
  useEffect(() => { try { localStorage.setItem("bearminer.mined", String(mined)); } catch { /* private mode */ } }, [mined]);
  const counted = useRef(null);
  const addMined = (n) => { if (counted.current !== card && n) { counted.current = card; setMined((x) => x + n); } };

  useEffect(() => { checkHealth().then((ok) => { setApiUp(ok); setLive(ok); }); }, []);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [step]);

  const go = (i) => { setStep(i); setMaxStep((m) => Math.max(m, i)); };
  const restart = () => { setCard(null); setChoice(null); setStep(0); setMaxStep(0); };

  const view = useMemo(() => {
    if (step === 0 || !card) {
      return <EntryStep live={live} onResult={(c) => { setCard(c); setChoice(defaultChoice(c)); setMaxStep(1); setStep(1); }} />;
    }
    if (step === 1) return <ScoreStep card={card} onBack={restart} onNext={() => go(2)} onMined={addMined} />;
    if (step === 2) return <ChoiceStep card={card} choice={choice} setChoice={setChoice} onBack={() => go(1)} onNext={() => go(3)} />;
    return <ProposalStep card={card} choice={choice} setChoice={setChoice} onBack={() => go(2)} onRestart={restart} />;
  }, [step, card, choice, live]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="app">
      <header className="topbar no-print">
        <button className="brand" onClick={restart} aria-label="Start over">
          <BearMark size={38} />
          <span className="brand__text"><span>Bear<b>Miner</b></span><span className="brand__slogan">Dig Bern gold from life-science partners</span></span>
        </button>
        <Stepper step={step} maxStep={card ? maxStep : 0} onGo={(i) => card && setStep(i)} />
        <div className="topbar__right">
        <span className="purse" key={mined} title="Gold coins mined so far" aria-label={`${mined} gold coins mined so far`}>
          <Coin size={24} /><b className={mined ? "is-bump" : ""}>{mined}</b>
        </span>
        <label className={`mode ${live ? "is-live" : ""}`} title={apiUp ? "Matching API reachable" : "API not reachable; using demo data"}>
          <input type="checkbox" checked={live} disabled={!apiUp} onChange={(e) => setLive(e.target.checked)} />
          <span className="mode__dot" />
          <span className="mode__text">{live ? "Live API" : "Demo data"}</span>
        </label>
        </div>
      </header>
      <main className="main" key={step}>{view}</main>
      <footer className="foot no-print">
        <span>BearMiner · Dig Bern gold from life-science partners · built with Apertus</span>
        <a href="?classic">Classic analyst view</a>
      </footer>
    </div>
  );
}
