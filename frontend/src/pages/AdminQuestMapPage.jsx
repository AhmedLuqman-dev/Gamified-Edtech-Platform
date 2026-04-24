import { useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import StudentSelector from "../components/StudentSelector";
import ProgressBar from "../components/ProgressBar";
import SkillTree from "../components/SkillTree";
import QuestModal from "../components/QuestModal";
import { apiFetch } from "../lib/api";

const defaultSubject = import.meta.env.VITE_DEFAULT_SUBJECT || "";

const MOCK_STUDENTS = [
  { id: 1, label: "The Struggling Student" },
  { id: 2, label: "The Average Student" },
  { id: 3, label: "The Advanced Student" }
];

const AdminQuestMapPage = ({ onLogout }) => {
  const [selectedStudentId, setSelectedStudentId] = useState(2);
  const [selectedStudentProfile, setSelectedStudentProfile] = useState("average");
  const [totalXP, setTotalXP] = useState(0);
  const [level, setLevel] = useState(1);
  const [curriculumData, setCurriculumData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeNode, setActiveNode] = useState(null);
  const [liveEvent, setLiveEvent] = useState("");

  const completedNodes = useMemo(
    () => curriculumData.filter((node) => node.status === "DONE").length,
    [curriculumData]
  );

  useEffect(() => {
    const loadQuestMap = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await apiFetch(`/student/${selectedStudentId}/quest-map`);
        setSelectedStudentProfile(data.student_profile || "average");
        setTotalXP(data.total_xp || 0);
        setLevel(data.level || 1);
        setCurriculumData(data.curriculum || []);
      } catch (err) {
        setError(err.message || "Unexpected error");
        setCurriculumData([]);
      } finally {
        setLoading(false);
      }
    };
    loadQuestMap();
  }, [selectedStudentId]);

  const refetchMap = async () => {
    const data = await apiFetch(`/student/${selectedStudentId}/quest-map`);
    setSelectedStudentProfile(data.student_profile || "average");
    setTotalXP(data.total_xp || 0);
    setLevel(data.level || 1);
    setCurriculumData(data.curriculum || []);
  };

  const handleQuestResolved = async (xpEarned) => {
    setLiveEvent("Quest cleared and XP granted!");
    setActiveNode(null);
    try {
      await refetchMap();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleRefresherQuest = async () => {
    setLiveEvent("Real-time AI adjustment: path refreshed from server");
    try {
      await refetchMap();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-3 flex justify-end">
        <button onClick={onLogout} className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-bold">Logout</button>
      </div>
      <Header totalXP={totalXP} selectedStudentProfile={selectedStudentProfile} level={level} />
      <main className="grid gap-5 lg:grid-cols-[280px,1fr]">
        <section className="space-y-5">
          <StudentSelector students={MOCK_STUDENTS} selectedStudentId={selectedStudentId} onProfileChange={setSelectedStudentId} />
          <ProgressBar totalNodes={curriculumData.length} completedNodes={completedNodes} loading={loading} />
        </section>
        <section>
          {liveEvent ? (
            <div className="mb-4 animate-revealUp rounded-2xl border border-brand-ocean/20 bg-brand-haze px-4 py-3 text-sm font-bold text-brand-ocean">
              {liveEvent}
            </div>
          ) : null}
          {loading ? (
            <div className="rounded-3xl bg-white/85 p-8 text-center font-semibold text-slate-600 shadow-soft">Loading quest map...</div>
          ) : error ? (
            <div className="rounded-3xl bg-rose-50 p-6 text-sm font-semibold text-rose-700 shadow-soft">{error}</div>
          ) : (
            <SkillTree
              curriculum={curriculumData}
              onNodeClick={setActiveNode}
              activeQuestChapter={curriculumData.find((n) => n.status === "UNLOCKED")?.chapter}
            />
          )}
        </section>
      </main>
      <QuestModal
        isOpen={Boolean(activeNode)}
        onClose={() => setActiveNode(null)}
        onQuestResolved={handleQuestResolved}
        onRefresherQuest={handleRefresherQuest}
        node={activeNode}
        selectedStudentId={selectedStudentId}
        defaultSubject={defaultSubject}
      />
    </div>
  );
};

export default AdminQuestMapPage;
