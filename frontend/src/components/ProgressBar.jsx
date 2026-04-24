const ProgressBar = ({ totalNodes, completedNodes, loading = false, variant = "default" }) => {
  const percentage = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;
  const isGame = variant === "game";

  return (
    <div
      className={`animate-revealUp rounded-2xl p-4 backdrop-blur ${
        isGame ? "border border-amber-500/20 bg-slate-900/60" : "bg-white/85 shadow-soft"
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <p className={`text-sm font-bold ${isGame ? "text-amber-200/90" : "font-semibold text-slate-700"}`}>
          {isGame ? "World completion" : "Curriculum Progress"}
        </p>
        <p className={`text-sm font-bold ${isGame ? "text-cyan-300" : "text-brand-ocean"}`}>{loading ? "..." : `${percentage}%`}</p>
      </div>
      <div className={`h-3 overflow-hidden rounded-full ${isGame ? "bg-slate-800" : "bg-slate-200"}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isGame ? "bg-gradient-to-r from-amber-500 via-fuchsia-500 to-cyan-400" : "bg-gradient-to-r from-brand-mint to-brand-ocean"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
