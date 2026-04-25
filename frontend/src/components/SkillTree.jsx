import SkillNode from "./SkillNode";

const ParticleField = () => {
  const particles = Array.from({ length: 20 }, (_, index) => {
    const left = (index * 37) % 100;
    const top = (index * 53) % 100;
    const size = 2 + (index % 4);
    const delay = (index % 7) * 0.5;
    const duration = 5 + (index % 5);
    return { id: index, left, top, size, delay, duration };
  });

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl" aria-hidden="true">
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="skillmap-particle"
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`
          }}
        />
      ))}
    </div>
  );
};

const SkillTree = ({ curriculum, onNodeClick, activeQuestChapter }) => {
  const sortedNodes = [...curriculum].sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="relative rounded-3xl border border-white/50 bg-white/40 p-5 shadow-soft backdrop-blur-xl">
      <ParticleField />
      <h2 className="relative font-['Nunito'] text-2xl font-extrabold text-brand-ink">Quest Constellation</h2>
      <div className="relative mt-5 space-y-0">
        {sortedNodes.map((node, index) => {
          const status = node.status || "LOCKED";
          const branchShift = (node.branch || 0) * 26;
          const nextNode = sortedNodes[index + 1];
          const nextStatus = nextNode?.status || "LOCKED";
          const connectorActive = status === "DONE" && (nextStatus === "DONE" || nextStatus === "UNLOCKED");
          const hasNext = index < sortedNodes.length - 1;

          return (
            <div
              key={node.id ?? node.chapter}
              className="relative flex gap-4"
              style={{ marginLeft: branchShift ? `${branchShift}px` : undefined }}
            >
              {/* Timeline rail: line and dot share horizontal center */}
              <div className="relative flex w-11 shrink-0 flex-col items-center self-stretch pt-2">
                {hasNext ? (
                  <>
                    <span
                      className="absolute left-1/2 top-4 bottom-0 w-0.5 -translate-x-1/2 rounded-full bg-slate-200/90"
                      aria-hidden="true"
                    />
                    <span
                      className={`absolute left-1/2 top-4 bottom-0 w-0.5 -translate-x-1/2 origin-top rounded-full bg-gradient-to-b from-brand-ocean to-brand-coral transition-transform duration-700 ${
                        connectorActive ? "scale-y-100" : "scale-y-0"
                      }`}
                      aria-hidden="true"
                    />
                  </>
                ) : null}
                <span
                  className={`relative z-10 mt-0 h-4 w-4 shrink-0 rounded-full border-2 bg-white shadow-sm ${
                    status === "DONE"
                      ? "border-emerald-500 bg-emerald-500"
                      : status === "UNLOCKED"
                        ? "border-brand-ocean bg-brand-ocean skillmap-node-unlock"
                        : "border-slate-400 bg-slate-300"
                  }`}
                  aria-hidden="true"
                />
              </div>

              <div className={`min-w-0 flex-1 ${index === sortedNodes.length - 1 ? "pb-2" : "pb-10"}`}>
                <SkillNode
                  node={node}
                  status={status}
                  isActive={Boolean(activeQuestChapter && activeQuestChapter === node.chapter)}
                  onClick={onNodeClick}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SkillTree;
