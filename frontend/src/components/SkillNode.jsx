const TYPE_ICON = {
  boss: "⚔️",
  lesson: "📘",
  challenge: "🔥"
};

const DIFFICULTY_STYLE = {
  easy: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  hard: "bg-rose-100 text-rose-700"
};

const STATUS_STYLE = {
  DONE: "bg-emerald-50/90 border-emerald-200 text-emerald-900",
  UNLOCKED: "bg-blue-50/90 border-blue-200 text-blue-900 hover:-translate-y-1 hover:shadow-lg",
  LOCKED: "bg-slate-100/80 border-slate-200 text-slate-500"
};

const SkillNode = ({ node, status, isActive, onClick }) => {
  const isUnlocked = status === "UNLOCKED";
  const isBoss = node.type === "boss";
  const isDone = status === "DONE";

  const handleClick = () => {
    if (isUnlocked) {
      onClick(node);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!isUnlocked}
      className={`quest-node relative w-full overflow-hidden rounded-2xl border-2 p-4 text-left backdrop-blur transition-all duration-300 ${STATUS_STYLE[status]} ${
        !isUnlocked ? "cursor-not-allowed opacity-85" : "cursor-pointer"
      } ${isBoss ? "border-brand-coral shadow-boss" : ""} ${
        isActive && isUnlocked
          ? "z-[1] ring-4 ring-amber-400/80 ring-offset-2 ring-offset-transparent shadow-[0_0_24px_rgba(251,191,36,0.45)]"
          : ""
      } ${isDone ? "grayscale-[0.2]" : ""}`}
    >
      {isUnlocked && !isDone ? (
        <div className="absolute inset-0 -z-0 bg-gradient-to-r from-cyan-500/10 via-fuchsia-500/10 to-amber-500/10" aria-hidden="true" />
      ) : null}
      {isActive && isUnlocked ? (
        <div className="absolute right-2 top-2 z-10 rounded-md bg-amber-400/90 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-900 shadow">
          Now
        </div>
      ) : null}
      <div className="relative z-[1] mb-3 flex items-center justify-between">
        <span className="text-2xl" aria-hidden="true">
          {TYPE_ICON[node.type] || "📘"}
        </span>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${DIFFICULTY_STYLE[node.difficulty] || "bg-slate-100 text-slate-700"}`}>
          {node.difficulty}
        </span>
      </div>

      <h3 className="relative z-[1] font-['Nunito'] text-lg font-extrabold leading-tight">{node.chapter}</h3>
      <p className="relative z-[1] mt-1 text-xs text-slate-500">{node.type || "quest"}</p>
      <p className="relative z-[1] mt-2 text-sm font-bold text-amber-600">+{node.xp ?? 0} XP</p>

      <div className="relative z-[1] mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex rounded-md bg-slate-900/80 px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest text-amber-200">
          {isDone ? "Cleared" : isUnlocked ? "Play" : "Locked"}
        </span>
      </div>
    </button>
  );
};

export default SkillNode;
