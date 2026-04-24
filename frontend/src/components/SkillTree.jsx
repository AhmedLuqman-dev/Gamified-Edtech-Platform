import SkillNode from "./SkillNode";

const doneCountByProfile = (profile, totalNodes) => {
  if (profile === "struggling") return Math.min(1, totalNodes);
  if (profile === "average") return Math.min(2, totalNodes);
  return Math.max(totalNodes - 1, 1);
};

const getNodeStatus = (index, doneCount, totalNodes) => {
  if (index < doneCount) return "DONE";
  if (index === doneCount && index < totalNodes) return "UNLOCKED";
  return "LOCKED";
};

const SkillTree = ({ curriculum, selectedStudentProfile, onNodeClick }) => {
  const sortedNodes = [...curriculum].sort((a, b) => a.order_index - b.order_index);
  const doneCount = doneCountByProfile(selectedStudentProfile, sortedNodes.length);

  return (
    <div className="rounded-3xl bg-white/85 p-5 shadow-soft backdrop-blur">
      <h2 className="font-['Nunito'] text-2xl font-extrabold text-brand-ink">Skill Tree</h2>
      <div className="mt-5">
        {sortedNodes.map((node, index) => {
          const status = getNodeStatus(index, doneCount, sortedNodes.length);
          const horizontalOffset = (node.branch || 0) * 26;

          return (
            <div key={node.chapter} className="relative pb-8" style={{ marginLeft: `${horizontalOffset}px` }}>
              {index < sortedNodes.length - 1 ? (
                <span className="absolute left-5 top-14 h-[calc(100%-1.4rem)] w-0.5 bg-slate-300" aria-hidden="true" />
              ) : null}

              <div className="relative z-10 pl-12">
                <span
                  className={`absolute left-0 top-5 h-4 w-4 rounded-full border-2 ${
                    status === "DONE"
                      ? "border-emerald-500 bg-emerald-500"
                      : status === "UNLOCKED"
                        ? "border-brand-ocean bg-brand-ocean"
                        : "border-slate-400 bg-slate-300"
                  }`}
                  aria-hidden="true"
                />
                <SkillNode node={node} status={status} onClick={onNodeClick} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SkillTree;
