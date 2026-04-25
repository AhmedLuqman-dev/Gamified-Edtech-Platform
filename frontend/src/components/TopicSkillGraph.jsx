/**
 * InterviewBit-style topic DAG: positioned nodes + edges in SVG (percent coords).
 */
const statusFill = (status) => {
  if (status === "DONE") return "#34d399";
  if (status === "UNLOCKED") return "#38bdf8";
  return "#64748b";
};

const TopicSkillGraph = ({ topicGraph, curriculum }) => {
  const statusByChapter = Object.fromEntries((curriculum || []).map((n) => [n.chapter, n.status || "LOCKED"]));
  const { nodes = [], edges = [] } = topicGraph || {};

  if (!nodes.length) {
    return (
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-6 text-center text-sm text-slate-500">
        No topic graph for this subject.
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-500/25 bg-slate-950/70 p-4 shadow-[0_0_40px_rgba(139,92,246,0.12)]">
      <p className="mb-2 font-['Nunito'] text-xs font-extrabold uppercase tracking-[0.18em] text-violet-300/90">
        Skill flow map
      </p>
      <svg viewBox="0 0 100 100" className="aspect-[5/4] w-full max-h-[min(22rem,55vh)]" role="img" aria-label="Topic dependency graph">
        <defs>
          <linearGradient id="topic-edge" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(56,189,248,0.5)" />
            <stop offset="100%" stopColor="rgba(167,139,250,0.6)" />
          </linearGradient>
        </defs>
        {edges.map((e, i) => {
          const a = nodes.find((n) => n.id === e.from);
          const b = nodes.find((n) => n.id === e.to);
          if (!a || !b) return null;
          const active = statusByChapter[e.from] === "DONE";
          return (
            <line
              key={`${e.from}-${e.to}-${i}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={active ? "url(#topic-edge)" : "rgba(71,85,105,0.45)"}
              strokeWidth={active ? 0.9 : 0.55}
              strokeLinecap="round"
            />
          );
        })}
        {nodes.map((n) => {
          const st = statusByChapter[n.id] || "LOCKED";
          const r = st === "UNLOCKED" ? 5.2 : 4.6;
          return (
            <g key={n.id}>
              <circle cx={n.x} cy={n.y} r={r + 1.2} fill="rgba(15,23,42,0.85)" />
              <circle cx={n.x} cy={n.y} r={r} fill={statusFill(st)} stroke="rgba(255,255,255,0.25)" strokeWidth="0.35" />
              <text
                x={n.x}
                y={n.y + r + 5}
                textAnchor="middle"
                fill="#e2e8f0"
                style={{ fontSize: "3.2px", fontWeight: 800, fontFamily: "Nunito, system-ui, sans-serif" }}
              >
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-1 text-[10px] text-slate-500">Gray = locked · Cyan = active · Green = cleared</p>
    </div>
  );
};

export default TopicSkillGraph;
