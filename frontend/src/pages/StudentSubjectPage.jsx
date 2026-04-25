import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import ProgressBar from "../components/ProgressBar";
import SkillTree from "../components/SkillTree";
import QuestModal from "../components/QuestModal";
import TopicSkillGraph from "../components/TopicSkillGraph";
import { formatTopicLabel } from "../lib/topicLabel";

const slugLabels = {
  science: "Science",
  history: "History",
  maths: "Maths"
};

const StudentSubjectPage = ({ user, onLogout }) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [topicMeta, setTopicMeta] = useState(null);
  const [questMap, setQuestMap] = useState(null);
  const [error, setError] = useState("");
  const [activeNode, setActiveNode] = useState(null);
  const [liveEvent, setLiveEvent] = useState("");

  const subjectLabel = slugLabels[slug] || slug;

  const refetchQuestMap = useCallback(async () => {
    const q = await apiFetch(`/student/${user.id}/subject/${slug}/quest-map`);
    setQuestMap(q);
  }, [user.id, slug]);

  useEffect(() => {
    if (!slug || !slugLabels[slug]) {
      navigate("/student", { replace: true });
      return;
    }
    const load = async () => {
      try {
        setError("");
        const meta = await apiFetch(`/meta/subjects/${slug}/topics`);
        setTopicMeta(meta);
        await refetchQuestMap();
      } catch (err) {
        setError(err.message || "Failed to load subject");
      }
    };
    load();
  }, [slug, navigate, refetchQuestMap]);

  const completedNodes = useMemo(
    () => (questMap?.curriculum || []).filter((node) => node.status === "DONE").length,
    [questMap]
  );

  const activeQuestChapter = questMap?.active_quest?.chapter;

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

  const startActiveQuest = () => {
    const ch = questMap?.active_quest?.chapter;
    if (!ch || !questMap?.curriculum) return;
    const node = questMap.curriculum.find((n) => n.chapter === ch && n.status === "UNLOCKED");
    if (node) setActiveNode(node);
  };

  if (!slugLabels[slug]) return null;

  return (
    <div className="student-arena min-h-screen px-3 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/student"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800/80 px-3 py-2 text-sm font-bold text-slate-200 transition hover:border-cyan-500/50"
          >
            ← Hub
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-xl border border-cyan-500/30 bg-cyan-950/50 px-3 py-1.5 text-sm font-bold text-cyan-200">
              Lv {questMap?.level ?? "—"}
            </span>
            <span className="rounded-xl border border-amber-500/30 bg-amber-950/40 px-3 py-1.5 text-sm font-bold text-amber-200">
              {questMap?.total_xp ?? 0} XP
            </span>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm font-bold text-slate-200"
            >
              Logout
            </button>
          </div>
        </div>

        <header className="mb-5 rounded-2xl border border-amber-500/20 bg-slate-900/60 p-4 shadow-[0_0_40px_rgba(251,191,36,0.12)] backdrop-blur">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-amber-300/80">Subject run</p>
          <h1 className="font-['Nunito'] text-2xl font-extrabold text-amber-100 sm:text-3xl">{subjectLabel}</h1>
          <p className="mt-1 text-sm text-cyan-200/80">Skill cycle · Spawned duels · Topic map</p>
        </header>

        {error ? <p className="mb-3 rounded-xl border border-rose-500/40 bg-rose-950/50 p-3 text-rose-200">{error}</p> : null}
        {liveEvent ? (
          <div className="mb-3 rounded-xl border border-amber-400/30 bg-amber-950/40 px-3 py-2 text-sm font-bold text-amber-200">{liveEvent}</div>
        ) : null}

        <div className="mb-5 grid gap-4 lg:grid-cols-2">
          <TopicSkillGraph topicGraph={topicMeta?.topicGraph} curriculum={questMap?.curriculum} />
          <div className="flex flex-col justify-between rounded-2xl border border-fuchsia-500/20 bg-slate-950/70 p-4">
            <div>
              <h2 className="font-['Nunito'] text-lg font-extrabold text-fuchsia-100">Skill cycle</h2>
              <p className="mt-1 text-xs text-slate-400">Clear nodes in order; optional branches unlock when prerequisites are met.</p>
            </div>
            <div className="mt-4 rounded-2xl border border-slate-600/50 bg-slate-900/50 p-3">
              <ProgressBar
                totalNodes={questMap?.curriculum?.length || 0}
                completedNodes={completedNodes}
                loading={!questMap}
                variant="game"
              />
            </div>
            <button
              type="button"
              onClick={startActiveQuest}
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 py-2.5 text-sm font-extrabold text-slate-900 shadow-lg transition hover:brightness-110"
            >
              {activeQuestChapter ? `Engage: ${formatTopicLabel(activeQuestChapter)}` : "Path locked or complete"}
            </button>
          </div>
        </div>

        <section className="relative overflow-hidden rounded-3xl border border-fuchsia-500/20 bg-slate-950/70 p-4 shadow-[0_0_60px_rgba(99,102,241,0.15)] backdrop-blur-md sm:p-6">
          <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-violet-600/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="relative">
            <h2 className="font-['Nunito'] text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-cyan-200">
              Quest constellation
            </h2>
            <p className="mt-1 text-sm text-slate-400">Questions are generated for this subject path.</p>
            <div className="mt-4 animate-floatSlow min-h-[200px]">
              <SkillTree
                curriculum={questMap?.curriculum || []}
                onNodeClick={setActiveNode}
                activeQuestChapter={activeQuestChapter}
              />
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
        defaultSubject={subjectLabel}
        useGroqQuestions
        battleVariant={slug === "science" ? "science" : "sword"}
        questionsPerTopic={3}
      />
    </div>
  );
};

export default StudentSubjectPage;
