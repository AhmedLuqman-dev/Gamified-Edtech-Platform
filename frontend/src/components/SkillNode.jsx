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
  DONE: "bg-emerald-50 border-emerald-200 text-emerald-900",
  UNLOCKED: "bg-blue-50 border-blue-200 text-blue-900 hover:-translate-y-0.5 hover:shadow-lg",
  LOCKED: "bg-slate-100 border-slate-200 text-slate-500"
};

const SkillNode = ({ node, status, onClick }) => {
  const isUnlocked = status === "UNLOCKED";
  const isBoss = node.type === "boss";

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
      className={`w-full rounded-2xl border p-4 text-left transition-all duration-300 ${STATUS_STYLE[status]} ${
        !isUnlocked ? "cursor-not-allowed opacity-85" : "cursor-pointer"
      } ${isBoss ? "border-2 border-brand-coral shadow-boss" : ""}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-2xl" aria-hidden="true">
          {TYPE_ICON[node.type] || "📘"}
        </span>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${DIFFICULTY_STYLE[node.difficulty]}`}>
          {node.difficulty}
        </span>
      </div>

      <h3 className="font-['Nunito'] text-xl font-extrabold">{node.chapter}</h3>
      <p className="mt-2 text-sm font-semibold">XP Reward: {node.xp}</p>

      <div className="mt-3 inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-bold tracking-wide">
        {status}
      </div>
    </button>
  );
};

export default SkillNode;
