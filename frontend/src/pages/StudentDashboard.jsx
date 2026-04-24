import { useEffect, useMemo, useState, useCallback } from "react";
import { apiFetch } from "../lib/api";
import ProgressBar from "../components/ProgressBar";
import SkillTree from "../components/SkillTree";
import QuestModal from "../components/QuestModal";

const defaultSubject = import.meta.env.VITE_DEFAULT_SUBJECT || "";

const StudentDashboard = ({ user, onLogout }) => {
  const [overview, setOverview] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [questMap, setQuestMap] = useState(null);
  const [error, setError] = useState("");
  const [activeNode, setActiveNode] = useState(null);
  const [liveEvent, setLiveEvent] = useState("");

  const refetchQuestMap = useCallback(async () => {
    const q = await apiFetch(`/student/${user.id}/quest-map`);
    setQuestMap(q);
    if (q?.total_xp != null || q?.level != null) {
      setOverview((prev) =>
        prev
          ? {
              ...prev,
              stats: {
                ...prev.stats,
                xp: q.total_xp ?? prev.stats?.xp,
                level: q.level ?? prev.stats?.level
              }
            }
          : prev
      );
    }
  }, [user.id]);

  useEffect(() => {
    const load = async () => {
      try {
        setError("");
        const [o, r] = await Promise.all([apiFetch(`/student/${user.id}/overview`), apiFetch(`/student/${user.id}/recommendation`)]);
        setOverview(o);
        setRecommendation(r);
        await refetchQuestMap();
      } catch (err) {
        setError(err.message);
      }
    };
    load();
  }, [user.id, refetchQuestMap]);

  const completedNodes = useMemo(
    () => (questMap?.curriculum || []).filter((node) => node.status === "DONE").length,
    [questMap]
  );

  const activeQuestChapter = questMap?.active_quest?.chapter || recommendation?.recommendation;

  const handleQuestResolved = async (xpEarned) => {
    setLiveEvent(`Quest cleared! +${xpEarned || 0} XP`);
    setActiveNode(null);
    try {
      await refetchQuestMap();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRefresherQuest = async () => {
    setLiveEvent("Adaptive path updated — refresher quest added!");
    try {
      await refetchQuestMap();
    } catch (err) {
      setError(err.message);
    }
  };

  const startRecommended = () => {
    const rec = questMap?.active_quest?.chapter || recommendation?.recommendation;
    if (!rec || !questMap?.curriculum) return;
    const node = questMap.curriculum.find((n) => n.chapter === rec && n.status === "UNLOCKED");
    if (node) setActiveNode(node);
  };

  const totalXp = questMap?.total_xp ?? overview?.stats?.xp ?? 0;
  const level = questMap?.level ?? overview?.stats?.level ?? 1;

  return (
    <div className="student-arena min-h-screen px-3 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-2 flex h-1 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-amber-400 via-fuchsia-500 to-cyan-400 transition-all duration-700"
            style={{ width: `${Math.min(100, (completedNodes / Math.max(1, questMap?.curriculum?.length || 1)) * 100)}%` }}
          />
        </div>

        <header className="mb-5 flex flex-col justify-between gap-3 rounded-2xl border border-amber-500/20 bg-slate-900/60 p-4 shadow-[0_0_40px_rgba(251,191,36,0.12)] backdrop-blur sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-amber-300/80">Player One</p>
            <h1 className="font-['Nunito'] text-2xl font-extrabold text-amber-100 sm:text-3xl">Welcome, {user.username}</h1>
            <p className="mt-1 text-sm text-cyan-200/80">Climb the quest line — one battle at a time.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/50 px-3 py-1.5 text-sm font-bold text-cyan-200">Lv {level}</div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/40 px-3 py-1.5 text-sm font-bold text-amber-200">{totalXp} XP</div>
            <div className="rounded-xl border border-fuchsia-500/30 bg-fuchsia-950/40 px-3 py-1.5 text-sm font-bold text-fuchsia-200">
              Streak {overview?.stats?.streak ?? 0}
            </div>
            <button
              onClick={onLogout}
              className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm font-bold text-slate-200"
            >
              Logout
            </button>
          </div>
        </header>

        {error ? <p className="mb-3 rounded-xl border border-rose-500/40 bg-rose-950/50 p-3 text-rose-200">{error}</p> : null}
        {liveEvent ? (
          <div className="mb-3 rounded-xl border border-amber-400/30 bg-amber-950/40 px-3 py-2 text-sm font-bold text-amber-200">{liveEvent}</div>
        ) : null}

        <div className="mb-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-slate-900/80 to-slate-950/90 p-4 shadow-[0_0_32px_rgba(168,85,247,0.12)]">
            <h2 className="font-['Nunito'] text-lg font-extrabold text-amber-100">Intel brief</h2>
            <p className="mt-1 text-sm text-cyan-100/80">
              Next: <span className="font-bold text-white">{recommendation?.recommendation || "…"}</span>
            </p>
            <p className="text-xs text-slate-400">Profile: {recommendation?.student_profile || "—"}</p>
            <button
              type="button"
              onClick={startRecommended}
              className="mt-3 w-full rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 py-2.5 text-sm font-extrabold text-slate-900 shadow-lg transition hover:brightness-110"
            >
              {activeQuestChapter ? "Engage current quest" : "Waiting for path…"}
            </button>
          </div>
          <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/60 p-4">
            <h2 className="font-['Nunito'] text-lg font-extrabold text-cyan-100">Roster (assignments)</h2>
            <div className="mt-2 max-h-32 space-y-1 overflow-y-auto pr-1 text-sm">
              {(overview?.submissions || []).length ? (
                (overview?.submissions || []).map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-700/80 bg-slate-800/50 px-2 py-1.5">
                    <span className="font-semibold text-slate-200">{item.title}</span>
                    <span className="font-bold text-cyan-300">{Number(item.percentage).toFixed(0)}%</span>
                  </div>
                ))
              ) : (
                <p className="text-slate-500">No assignment runs yet. Focus on the quest line.</p>
              )}
            </div>
          </div>
        </div>

        <section className="relative overflow-hidden rounded-3xl border border-fuchsia-500/20 bg-slate-950/70 p-4 shadow-[0_0_60px_rgba(99,102,241,0.15)] backdrop-blur-md sm:p-6">
          <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-violet-600/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="relative">
            <h2 className="font-['Nunito'] text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-cyan-200">
              Quest map
            </h2>
            <p className="mt-1 text-sm text-slate-400">Gold ring = your active mission. Defeat the quiz to move forward.</p>
            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,16rem),1fr]">
              <div className="rounded-2xl border border-slate-600/50 bg-slate-900/50 p-3">
                <ProgressBar
                  totalNodes={questMap?.curriculum?.length || 0}
                  completedNodes={completedNodes}
                  loading={!questMap}
                  variant="game"
                />
              </div>
              <div className="animate-floatSlow min-h-[200px]">
                <SkillTree
                  curriculum={questMap?.curriculum || []}
                  onNodeClick={setActiveNode}
                  activeQuestChapter={activeQuestChapter}
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      <QuestModal
        isOpen={Boolean(activeNode)}
        onClose={() => setActiveNode(null)}
        onQuestResolved={handleQuestResolved}
        onRefresherQuest={handleRefresherQuest}
        node={activeNode}
        selectedStudentId={user.id}
        defaultSubject={defaultSubject}
      />
    </div>
  );
};

export default StudentDashboard;
