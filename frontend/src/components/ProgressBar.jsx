const ProgressBar = ({ totalNodes, completedNodes }) => {
  const percentage = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;

  return (
    <div className="animate-revealUp rounded-2xl bg-white/85 p-4 shadow-soft backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">Curriculum Progress</p>
        <p className="text-sm font-bold text-brand-ocean">{percentage}%</p>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-mint to-brand-ocean transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
