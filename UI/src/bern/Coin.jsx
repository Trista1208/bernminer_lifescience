import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import coinUrl from "../assets/coin.png";

// BearMiner gold coins, drawn with the team's coin picture (src/assets/coin.png).

// Coin count for a match score: 85+ → 3 coins, 70–84 → 2, 50–69 → 1, under 50 → none.
export const COIN_THRESHOLDS = [50, 70, 85];
export function coinsFor(rate, inScope = true) {
  if (!inScope) return 0;
  return COIN_THRESHOLDS.filter((t) => rate >= t).length;
}

export const COIN_LABELS = [
  "No gold yet",
  "1 gold coin · a match",
  "2 gold coins · a gold match",
  "3 gold coins · a very strong match",
];

// A short "ching" made with Web Audio, so no sound file is needed. Only played after a click.
let audioCtx;
export function ching() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;
    [1318, 1976].forEach((f, i) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      const t = now + i * 0.07;
      o.type = "triangle";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g).connect(audioCtx.destination);
      o.start(t);
      o.stop(t + 0.4);
    });
  } catch {
    /* sound is optional */
  }
}

export function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export default function Coin({ size = 56, className = "", title, x, y }) {
  const w = Math.round(size * 0.93); // the picture is slightly taller than wide
  // Inside another SVG (Berni's drawings pass x/y) use <image>; elsewhere a plain <img>,
  // which html2canvas also draws into the proposal PDF.
  if (x != null || y != null) {
    return <image href={coinUrl} x={x} y={y} width={w} height={size} className={`coin ${className}`} />;
  }
  return (
    <img src={coinUrl} width={w} height={size} draggable="false" className={`coin ${className}`}
      alt={title || ""} aria-hidden={title ? undefined : "true"} />
  );
}

// The coin rating: earned coins drop in one after another, unearned ones show as empty dig spots.
export function CoinRating({ count, max = 3, size = 54, delay = 0, animate = true, onLanded }) {
  const [spin, setSpin] = useState(-1);
  useEffect(() => {
    if (!onLanded) return undefined;
    const t = setTimeout(onLanded, animate && !reducedMotion() ? delay + count * 260 + 300 : 0);
    return () => clearTimeout(t);
  }, [count]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`coins ${animate ? "coins--animate" : ""}`} role="img" aria-label={COIN_LABELS[count]}>
      {Array.from({ length: max }, (_, i) => i < count ? (
        <button type="button" key={i} className={`coins__coin ${spin === i ? "is-spin" : ""}`}
          style={{ animationDelay: `${delay + i * 260}ms` }} aria-hidden="true" tabIndex={-1}
          onClick={() => { setSpin(i); ching(); setTimeout(() => setSpin(-1), 700); }}>
          <Coin size={size} />
        </button>
      ) : (
        <span key={i} className="coins__spot" style={{ width: size * 0.8, height: size * 0.9 }} />
      ))}
    </div>
  );
}

// A coin rain over the whole page: heavy for 3 coins, lighter for 2. Starts after the rating coins land.
export function CoinShower({ n = 16, delay = 1300 }) {
  const [on, setOn] = useState(!reducedMotion());
  const drops = useMemo(() => Array.from({ length: n }, (_, i) => ({
    left: 2 + ((i * 37) % 95), delay: delay + (i % 8) * 140 + Math.floor(i / 8) * 300,
    size: 24 + ((i * 7) % 26), turn: (i % 2 ? 1 : -1) * (180 + (i * 41) % 360),
  })), [n, delay]);
  useEffect(() => { const t = setTimeout(() => setOn(false), delay + 3600); return () => clearTimeout(t); }, [delay]);
  if (!on) return null;
  return createPortal(
    <div className="shower" aria-hidden="true">
      {drops.map((d, i) => (
        <span key={i} style={{ left: `${d.left}%`, animationDelay: `${d.delay}ms`, "--turn": `${d.turn}deg` }}>
          <Coin size={d.size} />
        </span>
      ))}
    </div>,
    document.body,
  );
}
