import { useEffect, useState } from "react";

/* ─── Shared particles ─── */
const VictoryParticles = ({ palette }) => {
  const colors = palette || ["#fbbf24", "#f59e0b", "#38bdf8", "#a78bfa", "#fb923c", "#34d399"];
  const particles = Array.from({ length: 18 }, (_, i) => {
    const angle = (i / 18) * 360;
    const distance = 60 + (i % 3) * 30;
    const size = 4 + (i % 4) * 2;
    const delay = (i % 5) * 0.08;
    const color = colors[i % colors.length];
    return { angle, distance, size, delay, color, id: i };
  });

  return (
    <div className="battle-victory-particles">
      {particles.map((p) => (
        <span
          key={p.id}
          className="battle-particle"
          style={{
            "--angle": `${p.angle}deg`,
            "--distance": `${p.distance}px`,
            "--size": `${p.size}px`,
            "--delay": `${p.delay}s`,
            backgroundColor: p.color
          }}
        />
      ))}
    </div>
  );
};

/* ═══ SWORD / MATHS (original duel) ═══ */
const HERO_SVG = (
  <svg viewBox="0 0 120 160" className="battle-hero-sprite" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="60" cy="30" rx="22" ry="24" fill="#4a90d9" stroke="#2563eb" strokeWidth="2" />
    <rect x="38" y="22" width="44" height="6" rx="2" fill="#60a5fa" />
    <rect x="50" y="10" width="20" height="8" rx="4" fill="#fbbf24" />
    <rect x="44" y="30" width="32" height="8" rx="2" fill="#1e293b" />
    <circle cx="52" cy="33" r="2" fill="#38bdf8" />
    <circle cx="68" cy="33" r="2" fill="#38bdf8" />
    <path d="M40 54 L80 54 L85 100 L35 100 Z" fill="#3b82f6" stroke="#2563eb" strokeWidth="2" />
    <path d="M50 54 L70 54 L68 100 L52 100 Z" fill="#60a5fa" />
    <rect x="48" y="60" width="24" height="4" rx="2" fill="#fbbf24" />
    <rect x="35" y="96" width="50" height="8" rx="3" fill="#92400e" stroke="#78350f" strokeWidth="1" />
    <rect x="55" y="95" width="10" height="10" rx="2" fill="#fbbf24" />
    <rect x="22" y="56" width="16" height="40" rx="6" fill="#3b82f6" stroke="#2563eb" strokeWidth="1.5" />
    <rect x="82" y="56" width="16" height="40" rx="6" fill="#3b82f6" stroke="#2563eb" strokeWidth="1.5" />
    <circle cx="30" cy="98" r="6" fill="#fde68a" />
    <circle cx="90" cy="98" r="6" fill="#fde68a" />
    <rect x="40" y="104" width="14" height="36" rx="5" fill="#1e40af" />
    <rect x="66" y="104" width="14" height="36" rx="5" fill="#1e40af" />
    <path d="M38 136 L56 136 L58 150 L36 150 Z" fill="#92400e" stroke="#78350f" strokeWidth="1" />
    <path d="M64 136 L82 136 L84 150 L62 150 Z" fill="#92400e" stroke="#78350f" strokeWidth="1" />
    <path d="M40 54 Q30 80 25 110 Q35 105 40 100" fill="#dc2626" opacity="0.8" />
    <path d="M80 54 Q90 80 95 110 Q85 105 80 100" fill="#dc2626" opacity="0.8" />
  </svg>
);

const SWORD_SVG = (
  <svg viewBox="0 0 140 30" className="battle-sword" xmlns="http://www.w3.org/2000/svg">
    <polygon points="0,15 110,5 115,15 110,25" fill="url(#swordGrad)" stroke="#94a3b8" strokeWidth="1" />
    <polygon points="0,15 110,5 110,25" fill="none" stroke="#e2e8f0" strokeWidth="0.5" opacity="0.5" />
    <rect x="110" y="0" width="6" height="30" rx="2" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1" />
    <rect x="116" y="8" width="18" height="14" rx="3" fill="#92400e" stroke="#78350f" strokeWidth="1" />
    <rect x="118" y="10" width="3" height="10" rx="1" fill="#a16207" opacity="0.6" />
    <rect x="124" y="10" width="3" height="10" rx="1" fill="#a16207" opacity="0.6" />
    <circle cx="137" cy="15" r="5" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1" />
    <defs>
      <linearGradient id="swordGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#e2e8f0" />
        <stop offset="60%" stopColor="#cbd5e1" />
        <stop offset="100%" stopColor="#f8fafc" />
      </linearGradient>
    </defs>
  </svg>
);

const VILLAIN_SVG = (
  <svg viewBox="0 0 120 160" className="battle-villain-sprite" xmlns="http://www.w3.org/2000/svg">
    <polygon points="30,35 20,5 40,25" fill="#991b1b" />
    <polygon points="90,35 100,5 80,25" fill="#991b1b" />
    <ellipse cx="60" cy="38" rx="26" ry="28" fill="#7f1d1d" stroke="#450a0a" strokeWidth="2" />
    <ellipse cx="48" cy="34" rx="6" ry="5" fill="#fef08a" />
    <ellipse cx="72" cy="34" rx="6" ry="5" fill="#fef08a" />
    <circle cx="48" cy="34" r="3" fill="#dc2626" />
    <circle cx="72" cy="34" r="3" fill="#dc2626" />
    <path d="M42 50 Q50 58 60 50 Q70 58 78 50" fill="none" stroke="#450a0a" strokeWidth="2" />
    <rect x="48" y="48" width="4" height="6" rx="1" fill="#fef9c3" />
    <rect x="58" y="48" width="4" height="6" rx="1" fill="#fef9c3" />
    <rect x="68" y="48" width="4" height="6" rx="1" fill="#fef9c3" />
    <path d="M34 66 L86 66 L92 115 L28 115 Z" fill="#581c87" stroke="#3b0764" strokeWidth="2" />
    <path d="M50 66 L70 66 L68 115 L52 115 Z" fill="#6b21a8" opacity="0.5" />
    <circle cx="60" cy="85" r="8" fill="#1e1b4b" opacity="0.6" />
    <circle cx="57" cy="83" r="2" fill="#dc2626" />
    <circle cx="63" cy="83" r="2" fill="#dc2626" />
    <rect x="16" y="68" width="18" height="44" rx="7" fill="#581c87" stroke="#3b0764" strokeWidth="1.5" />
    <rect x="86" y="68" width="18" height="44" rx="7" fill="#581c87" stroke="#3b0764" strokeWidth="1.5" />
    <polygon points="16,112 12,126 18,118" fill="#991b1b" />
    <polygon points="22,112 18,126 24,118" fill="#991b1b" />
    <polygon points="28,112 24,126 30,118" fill="#991b1b" />
    <polygon points="98,112 94,126 100,118" fill="#991b1b" />
    <polygon points="92,112 88,126 94,118" fill="#991b1b" />
    <rect x="34" y="115" width="18" height="30" rx="6" fill="#3b0764" />
    <rect x="68" y="115" width="18" height="30" rx="6" fill="#3b0764" />
    <ellipse cx="43" cy="148" rx="14" ry="6" fill="#1e1b4b" />
    <ellipse cx="77" cy="148" rx="14" ry="6" fill="#1e1b4b" />
  </svg>
);

const SlashEffect = () => (
  <svg viewBox="0 0 200 200" className="battle-slash-effect" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="slashGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fbbf24" stopOpacity="0" />
        <stop offset="30%" stopColor="#fbbf24" stopOpacity="1" />
        <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
        <stop offset="70%" stopColor="#f59e0b" stopOpacity="1" />
        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
      </linearGradient>
      <filter id="slashGlow">
        <feGaussianBlur stdDeviation="3" result="glow" />
        <feMerge>
          <feMergeNode in="glow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <path
      d="M10 190 Q60 120 100 100 Q140 80 190 10"
      fill="none"
      stroke="url(#slashGrad)"
      strokeWidth="6"
      strokeLinecap="round"
      filter="url(#slashGlow)"
    />
    <path
      d="M20 180 Q70 130 100 100 Q130 70 180 20"
      fill="none"
      stroke="#fef3c7"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.7"
    />
  </svg>
);

const SwordBattle = ({ isCorrect, onComplete }) => {
  const [phase, setPhase] = useState("idle");

  useEffect(() => {
    const timers = [];
    setPhase("charge");
    timers.push(setTimeout(() => setPhase("slash"), 600));
    if (isCorrect) {
      timers.push(setTimeout(() => setPhase("hit"), 1000));
      timers.push(setTimeout(() => setPhase("victory"), 1600));
      timers.push(setTimeout(() => onComplete?.(), 3000));
    } else {
      timers.push(setTimeout(() => setPhase("blocked"), 1000));
      timers.push(setTimeout(() => setPhase("defeat"), 1600));
      timers.push(setTimeout(() => onComplete?.(), 2800));
    }
    return () => timers.forEach(clearTimeout);
  }, [isCorrect, onComplete]);

  return (
    <div className={`battle-arena ${phase === "hit" || phase === "blocked" ? "battle-screenshake" : ""}`}>
      <div className="battle-bg-effects">
        <div className="battle-bg-circle battle-bg-circle-1" />
        <div className="battle-bg-circle battle-bg-circle-2" />
      </div>
      <div className="battle-ground" />
      <div
        className={`battle-hero ${phase === "charge" ? "battle-hero-charge" : ""} ${phase === "slash" || phase === "hit" || phase === "blocked" ? "battle-hero-attack" : ""} ${phase === "victory" ? "battle-hero-victory" : ""} ${phase === "defeat" ? "battle-hero-defeat" : ""}`}
      >
        {HERO_SVG}
        <div className={`battle-sword-container ${phase === "slash" || phase === "hit" ? "battle-sword-swing" : ""}`}>{SWORD_SVG}</div>
      </div>
      {(phase === "slash" || phase === "hit") && (
        <div className="battle-slash-container">
          <SlashEffect />
        </div>
      )}
      <div
        className={`battle-villain ${phase === "hit" ? "battle-villain-hit" : ""} ${phase === "victory" ? "battle-villain-defeated" : ""} ${phase === "blocked" ? "battle-villain-taunt" : ""} ${phase === "defeat" ? "battle-villain-laugh" : ""}`}
      >
        {VILLAIN_SVG}
        {phase === "hit" && <div className="battle-damage-flash" />}
      </div>
      {(phase === "victory" || phase === "hit") && <VictoryParticles />}
      {phase === "victory" && (
        <div className="battle-result-text battle-result-victory">
          <span className="battle-result-icon">⚔️</span>
          <span>QUEST CLEARED!</span>
        </div>
      )}
      {phase === "defeat" && (
        <div className="battle-result-text battle-result-defeat">
          <span className="battle-result-icon">🛡️</span>
          <span>BLOCKED!</span>
        </div>
      )}
    </div>
  );
};

/* ═══ SCIENCE — lab vs bacteria ═══ */
const ScientistSvg = () => (
  <svg viewBox="0 0 100 130" className="battle-science-scientist-svg" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="22" rx="18" ry="20" fill="#fecdd3" stroke="#fb7185" strokeWidth="1.2" />
    <circle cx="44" cy="20" r="2.5" fill="#1e293b" />
    <circle cx="56" cy="20" r="2.5" fill="#1e293b" />
    <path d="M42 28 Q50 32 58 28" fill="none" stroke="#1e293b" strokeWidth="1.2" />
    <path d="M30 42 L70 42 L75 95 L25 95 Z" fill="#fff" stroke="#e2e8f0" strokeWidth="1.5" />
    <rect x="38" y="48" width="24" height="3" rx="1" fill="#22d3ee" opacity="0.5" />
    <path d="M32 95 L68 95 L62 125 L38 125 Z" fill="#64748b" />
    <rect x="28" y="50" width="8" height="36" rx="3" fill="#fff" stroke="#e2e8f0" />
    <rect x="64" y="50" width="8" height="36" rx="3" fill="#fff" stroke="#e2e8f0" />
    <rect x="48" y="68" width="14" height="22" rx="2" fill="#bae6fd" stroke="#0ea5e9" strokeWidth="1" opacity="0.9" />
  </svg>
);

const BacteriumSvg = () => (
  <svg viewBox="0 0 120 120" className="battle-science-bug-svg" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="60" cy="60" rx="38" ry="32" fill="#4ade80" stroke="#166534" strokeWidth="2" />
    <ellipse cx="60" cy="60" rx="28" ry="22" fill="#86efac" opacity="0.85" />
    <ellipse cx="48" cy="52" rx="8" ry="10" fill="#fff" />
    <ellipse cx="72" cy="52" rx="8" ry="10" fill="#fff" />
    <circle cx="48" cy="52" r="4" fill="#14532d" />
    <circle cx="72" cy="52" r="4" fill="#14532d" />
    <path d="M44 72 Q60 82 76 72" fill="none" stroke="#14532d" strokeWidth="2" strokeLinecap="round" />
    {Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2;
      const x1 = 60 + Math.cos(a) * 36;
      const y1 = 60 + Math.sin(a) * 30;
      const x2 = 60 + Math.cos(a) * 52;
      const y2 = 60 + Math.sin(a) * 44;
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#166534" strokeWidth="2.5" strokeLinecap="round" />;
    })}
  </svg>
);

const ScienceBeam = () => (
  <svg viewBox="0 0 200 120" className="battle-science-beam-svg" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="rxGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
        <stop offset="40%" stopColor="#67e8f9" stopOpacity="1" />
        <stop offset="100%" stopColor="#a5f3fc" stopOpacity="0.9" />
      </linearGradient>
    </defs>
    <path d="M10 60 L190 55 L190 65 Z" fill="url(#rxGrad)" opacity="0.85" />
    <circle cx="185" cy="60" r="12" fill="#ecfeff" opacity="0.5" />
  </svg>
);

const ScienceBattle = ({ isCorrect, onComplete }) => {
  const [phase, setPhase] = useState("idle");

  useEffect(() => {
    const timers = [];
    setPhase("aim");
    if (isCorrect) {
      timers.push(setTimeout(() => setPhase("treat"), 550));
      timers.push(setTimeout(() => setPhase("lyse"), 1000));
      timers.push(setTimeout(() => setPhase("cleared"), 1650));
      timers.push(setTimeout(() => onComplete?.(), 3000));
    } else {
      timers.push(setTimeout(() => setPhase("counter"), 650));
      timers.push(setTimeout(() => setPhase("infected"), 1350));
      timers.push(setTimeout(() => onComplete?.(), 2600));
    }
    return () => timers.forEach(clearTimeout);
  }, [isCorrect, onComplete]);

  return (
    <div className={`battle-science-arena ${phase === "counter" || phase === "lyse" ? "battle-screenshake" : ""}`}>
      <div className="battle-bg-effects">
        <div className="battle-bg-circle battle-bg-circle-1" style={{ background: "radial-gradient(circle, rgba(34,211,238,0.25), transparent 70%)" }} />
        <div className="battle-bg-circle battle-bg-circle-2" style={{ background: "radial-gradient(circle, rgba(74,222,128,0.2), transparent 70%)" }} />
      </div>
      <div className="battle-ground battle-science-ground" />

      {/* Scientist (left) */}
      <div
        className={`battle-science-scientist ${isCorrect && (phase === "treat" || phase === "lyse") ? "battle-science-scientist--treat" : ""} ${phase === "counter" || phase === "infected" ? "battle-science-scientist--hurt" : ""}`}
      >
        <ScientistSvg />
      </div>

      {isCorrect && (phase === "treat" || phase === "lyse") && (
        <div className="battle-science-beam-wrap">
          <ScienceBeam />
        </div>
      )}

      <div
        className={`battle-science-bug ${phase === "lyse" || phase === "cleared" ? "battle-science-bug--dead" : ""} ${phase === "counter" || phase === "infected" ? "battle-science-bug--attack" : ""}`}
      >
        <BacteriumSvg />
        {(phase === "lyse" || phase === "cleared") && <div className="battle-science-pop" />}
        {phase === "counter" && <div className="battle-science-infect-flash" />}
      </div>

      {(phase === "cleared" || phase === "lyse") && isCorrect && (
        <VictoryParticles palette={["#4ade80", "#22d3ee", "#a7f3d0", "#6ee7b7", "#34d399"]} />
      )}

      {phase === "cleared" && (
        <div className="battle-result-text battle-result-victory battle-science-result">
          <span className="battle-result-icon">🧫</span>
          <span>PATHOGEN NEUTRALIZED!</span>
        </div>
      )}
      {phase === "infected" && (
        <div className="battle-result-text battle-result-defeat battle-science-result">
          <span className="battle-result-icon">🦠</span>
          <span>CULTURE STRIKE — WRONG!</span>
        </div>
      )}
    </div>
  );
};

/**
 * @param {"sword" | "science"} variant — sword = maths/history duel; science = bacteria lab battle
 */
const BattleAnimation = ({ isCorrect, onComplete, variant = "sword" }) => {
  if (variant === "science") {
    return <ScienceBattle isCorrect={isCorrect} onComplete={onComplete} />;
  }
  return <SwordBattle isCorrect={isCorrect} onComplete={onComplete} />;
};

export default BattleAnimation;
