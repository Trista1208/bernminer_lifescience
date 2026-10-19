// "Berni", the Bern bear mascot: an original flat, outlined SVG drawing.
// mood: "wave" | "happy" | "think" | "cheer" | "gold" | "dig" | "shrug" | "letter" | "sleep"
import Coin from "./Coin.jsx";

const INK = "#2E2F36";
const FUR = "#FBFAF7";
const SHADE = "#D9DCE2";
const CHEEK = "#F4A6AC";
const RED = "#D52B1E";

function Arm({ cx, cy, rot }) {
  return (
    <ellipse cx={cx} cy={cy} rx="23" ry="14" transform={`rotate(${rot} ${cx} ${cy})`}
      fill={FUR} stroke={INK} strokeWidth="5" />
  );
}

export default function Bear({ mood = "happy", size = 120, className = "", title = "Berni the Bern bear" }) {
  const up = mood === "cheer" || mood === "gold";
  const closedEyes = up || mood === "sleep";
  const leftArm = up ? <Arm cx={44} cy={112} rot={-60} />
    : mood === "think" ? <Arm cx={76} cy={128} rot={-55} />
    : mood === "shrug" ? <Arm cx={38} cy={124} rot={-12} />
    : mood === "dig" ? <Arm cx={120} cy={146} rot={-20} />
    : <Arm cx={52} cy={152} rot={-25} />;
  const rightArm = up || mood === "wave" ? <Arm cx={156} cy={112} rot={60} />
    : mood === "shrug" ? <Arm cx={162} cy={124} rot={12} />
    : mood === "dig" ? <Arm cx={146} cy={136} rot={-30} />
    : <Arm cx={148} cy={152} rot={25} />;

  return (
    <svg className={`bear bear--${mood} ${className}`} width={size} height={size * 1.1}
      viewBox="0 0 200 220" role="img" aria-label={title}>
      <title>{title}</title>
      <ellipse cx="100" cy="212" rx="62" ry="6" fill={INK} opacity="0.08" />

      {/* ears */}
      <g stroke={INK} strokeWidth="5">
        <circle cx="54" cy="46" r="22" fill={FUR} />
        <circle cx="146" cy="46" r="22" fill={FUR} />
        <circle cx="58" cy="50" r="10" fill={SHADE} strokeWidth="4" />
        <circle cx="142" cy="50" r="10" fill={SHADE} strokeWidth="4" />
      </g>

      {/* body + belly */}
      <ellipse cx="100" cy="160" rx="50" ry="44" fill={FUR} stroke={INK} strokeWidth="5" />
      <ellipse cx="100" cy="164" rx="29" ry="26" fill={SHADE} />

      {/* feet */}
      <g stroke={INK} strokeWidth="5">
        <ellipse cx="64" cy="190" rx="26" ry="20" fill={FUR} />
        <ellipse cx="136" cy="190" rx="26" ry="20" fill={FUR} />
      </g>
      <ellipse cx="62" cy="192" rx="13" ry="10" fill={SHADE} />
      <ellipse cx="138" cy="192" rx="13" ry="10" fill={SHADE} />

      {mood === "dig" && (
        <g className="bear__pick">
          <path d="M112 158 L176 70" stroke={INK} strokeWidth="11" strokeLinecap="round" />
          <path d="M112 158 L176 70" stroke="#B9783A" strokeWidth="5" strokeLinecap="round" />
          <path d="M146 52 Q178 56 198 84 Q176 70 152 66 Z" fill="#C9CED6" stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
        </g>
      )}

      {mood !== "letter" && leftArm}
      {mood !== "letter" && <g className="bear__right-arm">{rightArm}</g>}

      {/* Bern-red scarf with a tiny Swiss cross */}
      <path d="M58 116 Q100 134 142 116 L144 128 Q100 146 56 128 Z" fill={RED} stroke={INK}
        strokeWidth="4" strokeLinejoin="round" />
      <path d="M118 132 L128 160 L114 158 L108 136 Z" fill={RED} stroke={INK} strokeWidth="4"
        strokeLinejoin="round" />
      <path d="M122 142 h6 M125 139 v6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />

      {/* head */}
      <ellipse cx="100" cy="80" rx="58" ry="48" fill={FUR} stroke={INK} strokeWidth="5" />

      {/* eyes */}
      {closedEyes ? (
        <g stroke={INK} strokeWidth="4.5" fill="none" strokeLinecap="round">
          {mood === "sleep" ? (
            <>
              <path d="M72 76 q6 5 12 0" />
              <path d="M116 76 q6 5 12 0" />
            </>
          ) : (
            <>
              <path d="M72 78 q6 -9 12 0" />
              <path d="M116 78 q6 -9 12 0" />
            </>
          )}
        </g>
      ) : (
        <g fill={INK}>
          <rect x="73" y={mood === "think" ? 64 : 68} width="9" height="15" rx="4.5" />
          <rect x="118" y={mood === "think" ? 64 : 68} width="9" height="15" rx="4.5" />
          <circle cx="79" cy={mood === "think" ? 68 : 72} r="1.8" fill="#fff" />
          <circle cx="124" cy={mood === "think" ? 68 : 72} r="1.8" fill="#fff" />
        </g>
      )}

      {/* cheeks */}
      <ellipse cx="66" cy="94" rx="9" ry="5" fill={CHEEK} />
      <ellipse cx="134" cy="94" rx="9" ry="5" fill={CHEEK} />

      {/* muzzle, nose, mouth */}
      <ellipse cx="100" cy="98" rx="21" ry="17" fill={SHADE} stroke={INK} strokeWidth="4.5" />
      <path d="M93 90 Q100 86 107 90 Q104 97 100 97 Q96 97 93 90 Z" fill={INK} />
      {mood === "cheer" ? (
        <path d="M92 101 Q100 112 108 101 Z" fill="#E86B74" stroke={INK} strokeWidth="3"
          strokeLinejoin="round" />
      ) : mood === "shrug" ? (
        <path d="M92 106 q4 -3 8 0 q4 3 8 0" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
      ) : mood === "think" ? (
        <path d="M94 105 q6 -3 12 0" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M100 97 v4 M92 102 q4 5 8 0 q4 5 8 0" stroke={INK} strokeWidth="3" fill="none"
          strokeLinecap="round" />
      )}

      {/* extras */}
      {mood === "letter" && (
        <g>
          <rect x="70" y="138" width="60" height="44" rx="4" fill="#fff" stroke={INK} strokeWidth="4" />
          <path d="M70 142 L100 162 L130 142" fill="none" stroke={INK} strokeWidth="3.5"
            strokeLinejoin="round" />
          <circle cx="100" cy="166" r="6" fill={RED} />
          <Arm cx={68} cy={160} rot={-35} />
          <Arm cx={132} cy={160} rot={35} />
        </g>
      )}
      {mood === "think" && (
        <g fill={FUR} stroke={INK} strokeWidth="3.5">
          <circle cx="166" cy="30" r="5" />
          <circle cx="180" cy="14" r="8" />
        </g>
      )}
      {mood === "shrug" && (
        <g stroke={INK} strokeWidth="3.5" strokeLinecap="round">
          <path d="M70 58 l12 -4 M118 54 l12 4" />
        </g>
      )}
      {mood === "gold" && <Coin size={56} x={144} y={42} />}
      {mood === "dig" && (
        <g className="bear__dirt">
          <path d="M150 210 Q172 186 196 210 Z" fill="#B9783A" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          <Coin size={22} x={163} y={170} className="bear__nugget" />
        </g>
      )}
      {mood === "sleep" && (
        <text x="160" y="28" fontFamily="inherit" fontWeight="700" fontSize="22" fill={INK}>z</text>
      )}
      {up && (
        <g stroke="#F2B705" strokeWidth="4" strokeLinecap="round">
          <path d="M22 70 l-10 -6 M24 54 l-8 -12 M178 70 l10 -6 M176 54 l8 -12" />
        </g>
      )}
    </svg>
  );
}

// Small round badge version for headers and the PDF.
export function BearMark({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="48" fill={RED} />
      <g stroke={INK} strokeWidth="3.5">
        <circle cx="27" cy="34" r="11" fill={FUR} />
        <circle cx="73" cy="34" r="11" fill={FUR} />
        <ellipse cx="50" cy="55" rx="30" ry="25" fill={FUR} />
        <ellipse cx="50" cy="64" rx="11" ry="9" fill={SHADE} strokeWidth="3" />
      </g>
      <rect x="37" y="48" width="5" height="8" rx="2.5" fill={INK} />
      <rect x="58" y="48" width="5" height="8" rx="2.5" fill={INK} />
      <ellipse cx="50" cy="60" rx="4" ry="3" fill={INK} />
      <ellipse cx="32" cy="62" rx="4.5" ry="2.6" fill={CHEEK} />
      <ellipse cx="68" cy="62" rx="4.5" ry="2.6" fill={CHEEK} />
    </svg>
  );
}
