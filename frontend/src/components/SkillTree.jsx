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
      <div className="relative mt-5">
        {sortedNodes.map((node, index) => {
          const status = node.status || "LOCKED";
          const horizontalOffset = (node.branch || 0) * 26;
          const nextNode = sortedNodes[index + 1];
          const nextStatus = nextNode?.status || "LOCKED";
          const connectorActive = status === "DONE" && (nextStatus === "DONE" || nextStatus === "UNLOCKED");

          return (
            <div
              key={node.id ?? node.chapter}
              className="relative pb-8"
              style={{ marginLeft: `${horizontalOffset}px` }}
            >
              {index < sortedNodes.length - 1 ? (
                <>
                  <span className="absolute left-5 top-14 h-[calc(100%-1.4rem)] w-0.5 bg-slate-200/90" aria-hidden="true" />
                  <span
                    className={`absolute left-5 top-14 h-[calc(100%-1.4rem)] w-0.5 origin-top bg-gradient-to-b from-brand-ocean to-brand-coral transition-transform duration-700 ${
                      connectorActive ? "scale-y-100" : "scale-y-0"
                    }`}
                    aria-hidden="true"
                  />
                </>
              ) : null}

              <div className="relative z-10 pl-12">
                <span
                  className={`absolute left-0 top-5 h-4 w-4 rounded-full border-2 ${
                    status === "DONE"
                      ? "border-emerald-500 bg-emerald-500"
                      : status === "UNLOCKED"
                        ? "border-brand-ocean bg-brand-ocean skillmap-node-unlock"
                        : "border-slate-400 bg-slate-300"
                  }`}
                  aria-hidden="true"
                />
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
