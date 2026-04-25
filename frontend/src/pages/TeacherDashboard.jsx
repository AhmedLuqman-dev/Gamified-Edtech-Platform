import { useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import ProgressBar from "../components/ProgressBar";
import SkillTree from "../components/SkillTree";
import { apiFetch } from "../lib/api";

const SUBJECT_OPTIONS = [
  { slug: "maths", label: "Maths" },
  { slug: "science", label: "Science" },
  { slug: "history", label: "History" }
];

const TeacherDashboard = ({ onLogout }) => {
  const [students, setStudents] = useState([]);
  const [filterProfile, setFilterProfile] = useState("struggling");
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [subjectSlug, setSubjectSlug] = useState("maths");

  const [selectedStudentProfile, setSelectedStudentProfile] = useState("average");
  const [totalXP, setTotalXP] = useState(0);
  const [level, setLevel] = useState(1);
  const [curriculumData, setCurriculumData] = useState([]);
  
  const [loadingMap, setLoadingMap] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [error, setError] = useState("");

  const completedNodes = useMemo(
    () => curriculumData.filter((node) => node.status === "DONE").length,
    [curriculumData]
  );

  const filteredStudents = useMemo(
    () => students.filter((s) => s.profile === filterProfile),
    [students, filterProfile]
  );

  useEffect(() => {
    const fetchStudents = async () => {
      setLoadingStudents(true);
      try {
        const data = await apiFetch("/teacher/students");
        setStudents(data.students || []);
      } catch (err) {
        setError(err.message || "Failed to load students");
      } finally {
        setLoadingStudents(false);
      }
    };
    fetchStudents();
  }, []);

  useEffect(() => {
    if (filteredStudents.length > 0) {
      if (!filteredStudents.find(s => s.id === selectedStudentId)) {
        setSelectedStudentId(filteredStudents[0].id);
      }
    } else {
      setSelectedStudentId(null);
      setCurriculumData([]);
    }
  }, [filterProfile, filteredStudents]);

  useEffect(() => {
    if (!selectedStudentId) return;

    const loadQuestMap = async () => {
      setLoadingMap(true);
      setError("");
      try {
        const data = await apiFetch(`/student/${selectedStudentId}/subject/${subjectSlug}/quest-map`);
        setSelectedStudentProfile(data.student_profile || "average");
        setTotalXP(data.total_xp || 0);
        setLevel(data.level || 1);
        setCurriculumData(data.curriculum || []);
      } catch (err) {
        setError(err.message || "Unexpected error");
        setCurriculumData([]);
      } finally {
        setLoadingMap(false);
      }
    };
    loadQuestMap();
  }, [selectedStudentId, subjectSlug]);

  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-3 flex justify-end">
        <button onClick={onLogout} className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-bold hover:bg-slate-300">Logout</button>
      </div>
      
      {selectedStudentId ? (
        <Header totalXP={totalXP} selectedStudentProfile={selectedStudentProfile} level={level} />
      ) : (
        <header className="mb-6 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-soft backdrop-blur">
          <h1 className="font-['Nunito'] text-2xl font-extrabold text-brand-ink">Teacher Console</h1>
          <p className="text-sm text-slate-500">Select a student to view their progress.</p>
        </header>
      )}

      <main className="grid gap-5 lg:grid-cols-[280px,1fr]">
        <section className="space-y-5">
          <div className="animate-revealUp rounded-2xl bg-white/85 p-4 shadow-soft backdrop-blur">
            <h2 className="mb-3 font-['Nunito'] text-lg font-bold text-slate-800">Student Filter</h2>
            <div className="flex flex-col gap-2 mb-4">
              <button 
                onClick={() => setFilterProfile("struggling")}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition text-left ${filterProfile === 'struggling' ? 'bg-rose-100 text-rose-700 border border-rose-200 shadow-sm' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
              >
                🔴 Struggling ({students.filter(s => s.profile === "struggling").length})
              </button>
              <button 
                onClick={() => setFilterProfile("average")}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition text-left ${filterProfile === 'average' ? 'bg-amber-100 text-amber-700 border border-amber-200 shadow-sm' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
              >
                🟡 Average ({students.filter(s => s.profile === "average").length})
              </button>
              <button 
                onClick={() => setFilterProfile("advanced")}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition text-left ${filterProfile === 'advanced' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
              >
                🟢 Topper ({students.filter(s => s.profile === "advanced").length})
              </button>
            </div>

            <label className="mb-2 block text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Select Student
            </label>
            {loadingStudents ? (
              <p className="text-sm font-semibold text-slate-500">Loading students...</p>
            ) : filteredStudents.length === 0 ? (
              <p className="text-sm italic text-slate-400">No students found.</p>
            ) : (
              <select
                value={selectedStudentId || ""}
                onChange={(e) => setSelectedStudentId(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-brand-ocean focus:ring-2 focus:ring-brand-ocean/20 shadow-sm"
              >
                {filteredStudents.map(s => (
                  <option key={s.id} value={s.id}>{s.username}</option>
                ))}
              </select>
            )}

            <label className="mb-2 mt-4 block text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Select Subject
            </label>
            <select
              value={subjectSlug}
              onChange={(e) => setSubjectSlug(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-brand-ocean focus:ring-2 focus:ring-brand-ocean/20 shadow-sm"
            >
              {SUBJECT_OPTIONS.map((o) => (
                <option key={o.slug} value={o.slug}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {selectedStudentId && (
            <ProgressBar totalNodes={curriculumData.length} completedNodes={completedNodes} loading={loadingMap} />
          )}
        </section>

        <section>
          {error && (
            <div className="mb-4 flex items-center justify-between rounded-3xl bg-rose-50 p-6 text-sm font-semibold text-rose-700 shadow-soft">
              <span>{error}</span>
              <button 
                onClick={() => {
                  setLoadingMap(true);
                  setError("");
                  apiFetch(`/student/${selectedStudentId}/subject/${subjectSlug}/quest-map`)
                    .then(data => {
                      setSelectedStudentProfile(data.student_profile || "average");
                      setTotalXP(data.total_xp || 0);
                      setLevel(data.level || 1);
                      setCurriculumData(data.curriculum || []);
                    })
                    .catch(err => {
                      setError(err.message || "Unexpected error");
                      setCurriculumData([]);
                    })
                    .finally(() => setLoadingMap(false));
                }}
                className="rounded-lg bg-rose-200 px-4 py-2 text-rose-800 hover:bg-rose-300 transition"
              >
                Retry
              </button>
            </div>
          )}
          
          {!selectedStudentId ? (
            <div className="rounded-3xl bg-white/85 p-8 text-center font-semibold text-slate-500 shadow-soft">
              Select a student from the sidebar to view their Skill Tree.
            </div>
          ) : loadingMap ? (
            <div className="rounded-3xl bg-white/85 p-8 text-center font-semibold text-slate-600 shadow-soft">Loading quest map...</div>
          ) : (
            <div className="relative animate-revealUp">
              <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 shadow-sm">
                <span>🔒</span>
                <span>Read-Only View</span>
              </div>
              <SkillTree
                curriculum={curriculumData}
                onNodeClick={() => {}} // Intentionally disabled
                activeQuestChapter={curriculumData.find((n) => n.status === "UNLOCKED")?.chapter}
                isReadOnly={true}
              />
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default TeacherDashboard;
