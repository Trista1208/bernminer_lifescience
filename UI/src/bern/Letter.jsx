import { BearMark } from "./Bear.jsx";
import { COMPONENTS, DEFAULT_MAX } from "./data.js";
import Coin, { COIN_LABELS, coinsFor } from "./Coin.jsx";

export const OFFERS = [
  { id: "clinical", icon: "🩺", title: "Clinical validation",
    blurb: "Run studies with Inselspital and sitem-insel on the Insel campus.",
    pitch: "Inselspital, Bern University Hospital, is one of Switzerland's largest university hospitals. Together with sitem-insel, the Swiss Institute for Translational and Entrepreneurial Medicine on the same campus, it gives your team a direct route from prototype to clinical evidence.",
    step: "Scope a validation study with Inselspital clinicians and sitem-insel" },
  { id: "rnd", icon: "🔬", title: "R&D co-development",
    blurb: "Joint projects with ARTORG and University of Bern research groups.",
    pitch: "University of Bern research groups, including the Faculty of Medicine and the ARTORG Center for Biomedical Engineering Research, work closely with clinicians at Inselspital and run joint projects with industry.",
    step: "Hold a technical workshop with the matched University of Bern groups" },
  { id: "site", icon: "🏢", title: "Open a Bern site",
    blurb: "Office, lab or production space in the Canton of Bern.",
    pitch: "The Canton of Bern offers sites from the capital to the Switzerland Innovation Park Biel/Bienne, a bilingual German and French workforce, and central rail links, with Zurich and Basel each about an hour away by train.",
    step: "Visit candidate locations with the cantonal economic development team" },
  { id: "talent", icon: "🎓", title: "Talent pipeline",
    blurb: "Hire graduates from the University of Bern and BFH.",
    pitch: "The University of Bern and the Bern University of Applied Sciences (BFH) train medical, engineering and data talent every year, and both run industry projects and internships.",
    step: "Set up a student project or internship track with UniBE / BFH" },
  { id: "regulatory", icon: "🏛️", title: "Regulatory proximity",
    blurb: "Swissmedic and the federal administration are based in Bern.",
    pitch: "Bern is Switzerland's federal city and home to Swissmedic, the Swiss agency for therapeutic products, so regulatory conversations can happen close to your team.",
    step: "Prepare an early regulatory orientation meeting in Bern" },
  { id: "diabetes", icon: "💧", title: "Diabetes technology pilot",
    blurb: "Pilot with Diabetes Center Berne's technology programme.",
    pitch: "Diabetes Center Berne focuses on diabetes technology and connects device makers with clinicians and patients, which suits pilots for sensors, pumps and connected care.",
    step: "Propose a pilot with Diabetes Center Berne", needsCap: "diabetes_cgm" },
];

const fmtDate = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export default function Letter({ card, choice, partners }) {
  const info = card.main_info || {};
  const m = card.match || {};
  const sb = m.score_breakdown || {};
  const comps = sb.components || {};
  const maxes = { ...DEFAULT_MAX, ...(sb.component_max || {}) };
  const company = card.company_name || info.name || "your company";
  const offers = OFFERS.filter((o) => choice.offers.includes(o.id));
  const chosen = partners.filter((p) => choice.partners.includes(p.id));
  const warm = choice.tone === "warm";
  const recipient = choice.recipient?.trim() || `the ${company} leadership team`;
  const greeting = choice.recipient?.trim() ? `Dear ${choice.recipient.trim()},` : `Dear ${company} team,`;
  const focus = (info.subsector || "").replace(/ & [^&]*Talent$/, "") || (card.keywords?.all || []).slice(0, 3).join(", ") || info.sector || "life science";
  const rate = Math.round(m.match_rate ?? 0);

  return (
    <article className="letter" id="bern-letter">
      <header className="letter__head">
        <div className="letter__brand">
          <BearMark size={46} />
          <div>
            <div className="letter__org">{choice.senderOrg || "Invest in Bern"}</div>
            <div className="letter__tag">Life science location · Canton of Bern, Switzerland</div>
          </div>
        </div>
        <div className="letter__meta">
          <div>{fmtDate(new Date())}</div>
          <div>To: {recipient}</div>
        </div>
      </header>

      <section className="letter__hero">
        <p className="letter__kicker">Proposal for {company}</p>
        <h1>Grow {company} in Bern, Switzerland</h1>
        <div className="letter__score">
          <div className="letter__score-num">{rate}<span>/100</span></div>
          <div>
            {coinsFor(rate) > 0 && (
              <div className="letter__coins">
                {Array.from({ length: coinsFor(rate) }, (_, i) => <Coin key={i} size={26} />)}
                <span>{COIN_LABELS[coinsFor(rate)].replace(/^\d+ gold coins? · /, "")}</span>
              </div>
            )}
            <strong>{m.verdict_label || m.tier}</strong>
            <p>Collaboration-potential score from our Bern life-science matching model.</p>
          </div>
        </div>
      </section>

      <p>{greeting}</p>
      <p>
        {warm
          ? `We have been following ${company}'s work in ${focus} with real interest, and we believe Bern is a place where it can grow faster. `
          : `We are writing on behalf of the Canton of Bern to propose a collaboration with ${company} in ${focus}. `}
        Our matching model compared your profile with Bern's research groups, hospitals and support programmes,
        and it points to concrete partners and a short path to working together.
      </p>

      {chosen.length > 0 && (
        <>
          <h2>Who you would work with</h2>
          <ul className="letter__partners">
            {chosen.map((p) => (
              <li key={p.id}>
                <strong>{p.name}</strong>
                {p.units?.length > 0 && <span> · {p.units.join(", ")}</span>}
                {p.terms?.length > 0 && <div className="letter__terms">Shared focus: {p.terms.slice(0, 6).join(", ")}</div>}
                {p.url && <div className="letter__terms">Source: {p.url}</div>}
              </li>
            ))}
          </ul>
        </>
      )}

      {offers.length > 0 && (
        <>
          <h2>What Bern offers {company}</h2>
          {offers.map((o) => (
            <div className="letter__offer" key={o.id}>
              <h3>{o.title}</h3>
              <p>{o.pitch}</p>
            </div>
          ))}
        </>
      )}

      <h2>Proposed next steps</h2>
      <ol className="letter__steps">
        <li><span>Week 1–2</span>Introductory call with {choice.senderOrg || "Invest in Bern"} and the partners above</li>
        {offers.slice(0, 3).map((o, i) => (
          <li key={o.id}><span>{["Month 1", "Month 2", "Month 3"][i]}</span>{o.step}</li>
        ))}
        <li><span>Next</span>Agree a joint plan and a Bern landing package for {company}</li>
      </ol>

      {choice.includeScore && (
        <>
          <h2>How we scored the match</h2>
          <table className="letter__table">
            <tbody>
              {COMPONENTS.map((c) => (
                <tr key={c.key}>
                  <td>{c.label}</td>
                  <td className="letter__bar"><i style={{ width: `${Math.min(100, ((comps[c.key] || 0) / (maxes[c.key] || 1)) * 100)}%` }} /></td>
                  <td className="num">{(comps[c.key] ?? 0).toFixed(1)} / {maxes[c.key]}</td>
                </tr>
              ))}
              <tr className="total"><td>Total</td><td /><td className="num">{(m.match_rate ?? 0).toFixed(1)} / 100</td></tr>
            </tbody>
          </table>
        </>
      )}

      {choice.message?.trim() && (
        <>
          <h2>A personal note</h2>
          <p>{choice.message.trim()}</p>
        </>
      )}

      <p>
        {warm ? "We would love to welcome you to Bern. " : ""}
        We would be glad to arrange a first conversation at a time that suits you.
      </p>
      <div className="letter__sign">
        <p>Kind regards,</p>
        <p className="letter__sender">{choice.senderName || "The Invest in Bern team"}</p>
        <p>{choice.senderOrg || "Invest in Bern"}{choice.senderEmail ? ` · ${choice.senderEmail}` : ""}</p>
      </div>

      <footer className="letter__foot">
        Prepared with BearMiner, the Apertus-powered Bern life-science matching tool. Scores are indicative and based on public information.
        {card._demo ? " Generated in demo mode." : ""}
      </footer>
    </article>
  );
}
