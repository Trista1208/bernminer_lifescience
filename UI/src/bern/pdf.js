// Native A4 PDF for the proposal letter (jsPDF text — no html2canvas).
// Score content is included only when choice.includeScore === true.

import { COMPONENTS, DEFAULT_MAX } from "./data.js";

const JSPDF_SRC = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";

const RED = [180, 35, 24];
const INK = [26, 26, 26];
const MUTED = [100, 100, 100];
const LINE = [220, 220, 220];

function loadScript(src) {
  if (document.querySelector(`script[src="${src}"]`)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error("Could not load the PDF library. Check your internet connection."));
    document.head.appendChild(s);
  });
}

function fmtDate(d) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/** Build plain-text sections used by the PDF writer. */
export function buildLetterModel(card, choice, partners, offersCatalog) {
  const info = card.main_info || {};
  const m = card.match || {};
  const company = card.company_name || info.name || "your company";
  const offers = (offersCatalog || []).filter((o) => (choice.offers || []).includes(o.id));
  const chosen = (partners || []).filter((p) => (choice.partners || []).includes(p.id));
  const warm = choice.tone === "warm";
  const recipient = choice.recipient?.trim() || `the ${company} leadership team`;
  const greeting = choice.recipient?.trim()
    ? `Dear ${choice.recipient.trim()},`
    : `Dear ${company} team,`;
  const focus =
    (info.subsector || "").replace(/ & [^&]*Talent$/, "") ||
    (card.keywords?.all || []).slice(0, 3).join(", ") ||
    info.sector ||
    "life science";
  const showScore = choice?.includeScore === true;
  const rate = Math.round(m.match_rate ?? 0);
  const sb = m.score_breakdown || {};
  const comps = sb.components || {};
  const maxes = { ...DEFAULT_MAX, ...(sb.component_max || {}) };

  const introWarm = `We have been following ${company}'s work in ${focus} with real interest, and we believe Bern is a place where it can grow faster. `;
  const introFormal = `We are writing on behalf of the Canton of Bern to propose a collaboration with ${company} in ${focus}. `;
  const scoreLine = showScore
    ? "Our matching model compared your profile with Bern's research groups, hospitals and support programmes, and it points to concrete partners and a short path to working together."
    : "Based on your profile and Bern's research groups, hospitals and support programmes, we see concrete partners and a short path to working together.";

  let footer = "Prepared with BearMiner, the Apertus-powered Bern life-science matching tool.";
  if (showScore) footer += " Scores are indicative and based on public information.";
  if (card._demo) footer += " Generated in demo mode.";

  return {
    company,
    showScore,
    rate,
    verdict: m.verdict_label || m.tier || "",
    comps,
    maxes,
    matchRate: m.match_rate ?? rate,
    date: fmtDate(new Date()),
    org: choice.senderOrg || "Invest in Bern",
    recipient,
    greeting,
    intro: (warm ? introWarm : introFormal) + scoreLine,
    chosen,
    offers,
    message: (choice.message || "").trim(),
    closing: (warm ? "We would love to welcome you to Bern. " : "") +
      "We would be glad to arrange a first conversation at a time that suits you.",
    senderName: choice.senderName || "The Invest in Bern team",
    senderOrg: choice.senderOrg || "Invest in Bern",
    senderEmail: choice.senderEmail || "",
    footer,
  };
}

/** Rasterize the BearMiner mark (same SVG as BearMark / favicon) for jsPDF. */
function bearMarkDataUrl(px = 128) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="48" fill="#D52B1E"/>
  <g stroke="#2E2F36" stroke-width="3.5">
    <circle cx="27" cy="34" r="11" fill="#FBFAF7"/>
    <circle cx="73" cy="34" r="11" fill="#FBFAF7"/>
    <ellipse cx="50" cy="55" rx="30" ry="25" fill="#FBFAF7"/>
    <ellipse cx="50" cy="64" rx="11" ry="9" fill="#D9DCE2" stroke-width="3"/>
  </g>
  <rect x="37" y="48" width="5" height="8" rx="2.5" fill="#2E2F36"/>
  <rect x="58" y="48" width="5" height="8" rx="2.5" fill="#2E2F36"/>
  <ellipse cx="50" cy="60" rx="4" ry="3" fill="#2E2F36"/>
  <ellipse cx="32" cy="62" rx="4.5" ry="2.6" fill="#F4A6AC"/>
  <ellipse cx="68" cy="62" rx="4.5" ry="2.6" fill="#F4A6AC"/>
</svg>`;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = px;
        canvas.height = px;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, px, px);
        resolve(canvas.toDataURL("image/png"));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error("Could not render BearMiner logo"));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

function makeWriter(pdf) {
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const left = 44;
  const right = 44;
  const top = 40;
  const bottom = 44;
  const width = pw - left - right;
  let y = top;

  const ensure = (need) => {
    if (y + need <= ph - bottom) return;
    pdf.addPage();
    y = top;
  };

  const gap = (n = 8) => {
    y += n;
  };

  const rule = (color = LINE, w = 0.6) => {
    ensure(10);
    pdf.setDrawColor(...color);
    pdf.setLineWidth(w);
    pdf.line(left, y, left + width, y);
    y += 8;
  };

  const text = (str, { size = 11, style = "normal", color = INK, align = "left", after = 4 } = {}) => {
    pdf.setFont("times", style);
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(String(str || ""), width);
    const lineH = size * 1.35;
    ensure(lines.length * lineH + 2);
    lines.forEach((line) => {
      ensure(lineH);
      const x = align === "right" ? left + width : left;
      pdf.text(line, x, y, { align });
      y += lineH;
    });
    y += after;
  };

  const heading = (str) => {
    gap(6);
    text(str, { size: 14, style: "bold", after: 2 });
    pdf.setDrawColor(...RED);
    pdf.setLineWidth(1.2);
    pdf.line(left, y, left + 36, y);
    y += 10;
  };

  return { pw, ph, left, right, top, bottom, width, ensure, gap, rule, text, heading, getY: () => y, setY: (v) => { y = v; } };
}

export async function letterToPdf({ card, choice, partners, offers }) {
  await loadScript(JSPDF_SRC);
  const { jsPDF } = window.jspdf;
  const model = buildLetterModel(card, choice, partners, offers);
  const pdf = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const w = makeWriter(pdf);

  // Brand header: BearMiner mark + org
  const logoSize = 36;
  try {
    const logo = await bearMarkDataUrl(128);
    pdf.addImage(logo, "PNG", w.left, w.getY() - 4, logoSize, logoSize);
  } catch {
    /* text-only header if canvas blocked */
  }
  const textLeft = w.left + logoSize + 12;
  const headerTop = w.getY() + 8;
  pdf.setFont("times", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(...INK);
  pdf.text(model.org, textLeft, headerTop);
  pdf.setFont("times", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...MUTED);
  pdf.text("Life science location · Canton of Bern, Switzerland", textLeft, headerTop + 14);
  pdf.text(model.date, textLeft, headerTop + 28);
  pdf.text(`To: ${model.recipient}`, textLeft, headerTop + 40);
  w.setY(Math.max(w.getY() + logoSize + 8, headerTop + 48));
  w.rule();

  // Hero
  w.text(`Proposal for ${model.company}`, { size: 10, color: RED, style: "bold", after: 2 });
  w.text(`Grow ${model.company} in Bern, Switzerland`, { size: 18, style: "bold", after: 5 });

  if (model.showScore) {
    w.text(`${model.rate} / 100`, { size: 22, style: "bold", color: RED, after: 1 });
    if (model.verdict) w.text(String(model.verdict), { size: 11, style: "bold", after: 1 });
    w.text("Collaboration-potential score from our Bern life-science matching model.", {
      size: 9,
      color: MUTED,
      after: 6,
    });
  } else {
    w.text("A collaboration proposal from the Canton of Bern life-science ecosystem.", {
      size: 10,
      color: MUTED,
      after: 6,
    });
  }

  w.text(model.greeting, { size: 11, after: 4 });
  w.text(model.intro, { size: 11, after: 6 });

  if (model.chosen.length) {
    w.heading("Who you would work with");
    model.chosen.forEach((p) => {
      const units = p.units?.length ? ` · ${p.units.join(", ")}` : "";
      w.text(`${p.name}${units}`, { size: 11, style: "bold", after: 1 });
      if (p.terms?.length) {
        w.text(`Shared focus: ${p.terms.slice(0, 6).join(", ")}`, { size: 9, color: MUTED, after: 1 });
      }
      if (p.url) w.text(`Source: ${p.url}`, { size: 8, color: MUTED, after: 4 });
      else w.gap(4);
    });
  }

  if (model.offers.length) {
    w.heading(`What Bern offers ${model.company}`);
    model.offers.forEach((o) => {
      w.text(o.title, { size: 11, style: "bold", after: 1 });
      const short = String(o.pitch || "").split(/(?<=\.)\s+/).slice(0, 2).join(" ");
      w.text(short, { size: 10, after: 5 });
    });
  }

  if (model.showScore) {
    w.heading("How we scored the match");
    COMPONENTS.forEach((c) => {
      const val = model.comps[c.key];
      const max = model.maxes[c.key] ?? "";
      w.text(
        `${c.label}: ${val != null ? Number(val).toFixed(1) : "—"} / ${max}`,
        { size: 10, after: 2 }
      );
    });
    w.text(`Total: ${Number(model.matchRate).toFixed(1)} / 100`, {
      size: 11,
      style: "bold",
      after: 6,
    });
  }

  if (model.message) {
    w.heading("A personal note");
    w.text(model.message, { size: 11, after: 6 });
  }

  // Keep closing block together
  const closeBlock = 90;
  w.ensure(closeBlock);
  w.gap(10);
  w.text(model.closing, { size: 11, after: 10 });
  w.text("Kind regards,", { size: 11, after: 8 });
  w.text(model.senderName, { size: 12, style: "bold", after: 1 });
  const signLine = model.senderEmail
    ? `${model.senderOrg} · ${model.senderEmail}`
    : model.senderOrg;
  w.text(signLine, { size: 10, after: 12 });
  w.rule(LINE, 0.5);
  w.text(model.footer, { size: 8, color: MUTED, after: 0 });

  return pdf;
}

export async function downloadLetter(payload, filename) {
  // Back-compat: old callers passed a DOM element — reject that path
  if (payload instanceof HTMLElement) {
    throw new Error("PDF export needs letter data (card/choice), not a DOM screenshot.");
  }
  const pdf = await letterToPdf(payload);
  pdf.save(filename);
  return "saved";
}
