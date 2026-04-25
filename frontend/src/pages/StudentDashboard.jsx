import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";

const SUBJECT_OPTIONS = [
  { slug: "science", label: "Science" },
  { slug: "history", label: "History" },
  { slug: "maths", label: "Maths" }
];

const SubjectPieRow = ({ label, accent, completed, total, percent }) => (
  <div className="rounded-2xl border border-slate-700/80 bg-slate-900/70 p-4 shadow-[0_0_24px_rgba(15,23,42,0.5)]">
    <div className="flex items-center gap-3">
      <div
        className="relative grid h-[4.5rem] w-[4.5rem] shrink-0 place-items-center rounded-full border-2 border-slate-600"
        style={{
          background: `conic-gradient(${accent} ${(percent / 100) * 360}deg, rgba(30,41,59,0.95) 0deg)`
        }}
        aria-hidden
      >
        <div className="flex h-[68%] w-[68%] items-center justify-center rounded-full bg-slate-950/95 font-['Nunito'] text-xs font-extrabold text-slate-100">
          {percent}%
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-['Nunito'] text-sm font-extrabold text-slate-100">{label}</p>
        <p className="text-xs text-slate-400">
          {completed}/{total} skill nodes cleared
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${percent}%`, backgroundColor: accent }}
          />
        </div>
      </div>
    </div>
  </div>
);

const StudentDashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);
  const [error, setError] = useState("");
  const [subjectSlug, setSubjectSlug] = useState("science");

  useEffect(() => {
    const load = async () => {
      try {
        setError("");
        const data = await apiFetch(`/student/${user.id}/home-board`);
        setBoard(data);
      } catch (err) {
        setError(err.message);
      }
    };
    load();
  }, [user.id]);

  const stats = board?.stats || { xp: 0, level: 1, streak: 0 };
  const subjectRows = board?.subject_progress || [];
  const leaderboard = board?.leaderboard || [];

  const enterSubject = () => {
    navigate(`/student/subject/${subjectSlug}`);
  };

  return (
    <div className="student-arena min-h-screen px-3 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-amber-500/20 bg-slate-900/60 p-5 shadow-[0_0_40px_rgba(251,191,36,0.12)] backdrop-blur sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <div
              className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-cyan-500/40 bg-gradient-to-br from-cyan-600/40 to-violet-700/30 font-['Nunito'] text-lg font-extrabold text-cyan-100"
              aria-hidden
            >
              {String(user.username || "?")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-amber-300/80">EduQuest XP · Student hub</p>
              <h1 className="truncate font-['Nunito'] text-2xl font-extrabold text-amber-100 sm:text-3xl">{user.username}</h1>
              <p className="mt-0.5 text-sm text-cyan-200/80">Pick a subject run — maps, skill flow, and topic duels await.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/50 px-3 py-1.5 text-sm font-bold text-cyan-200">Lv {stats.level}</div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/40 px-3 py-1.5 text-sm font-bold text-amber-200">{stats.xp} XP</div>
            <div className="rounded-xl border border-fuchsia-500/30 bg-fuchsia-950/40 px-3 py-1.5 text-sm font-bold text-fuchsia-200">
              Streak {stats.streak ?? 0}
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm font-bold text-slate-200"
            >
              Logout
            </button>
          </div>
        </header>

        {error ? <p className="mb-4 rounded-xl border border-rose-500/40 bg-rose-950/50 p-3 text-rose-200">{error}</p> : null}

        <div className="grid gap-5 lg:grid-cols-12 lg:items-start">
          <aside className="space-y-4 lg:col-span-3">
            <h2 className="font-['Nunito'] text-xs font-extrabold uppercase tracking-[0.18em] text-slate-400">Subject mastery</h2>
            {subjectRows.length ? (
              subjectRows.map((s) => (
                <SubjectPieRow
                  key={s.slug}
                  label={s.label}
                  accent={s.accent}
                  completed={s.completed}
                  total={s.total}
                  percent={s.percent}
                />
              ))
            ) : (
              <p className="text-sm text-slate-500">Loading progress…</p>
            )}
          </aside>

          <main className="flex flex-col items-center justify-center rounded-3xl border border-violet-500/25 bg-slate-950/60 px-6 py-12 text-center shadow-[0_0_50px_rgba(139,92,246,0.12)] lg:col-span-6">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-violet-300/90">Enter subject run</p>
            <h2 className="mt-2 font-['Nunito'] text-xl font-extrabold text-slate-100 sm:text-2xl">Choose your track</h2>
            <p className="mt-2 max-w-sm text-sm text-slate-400">Science, History, or Maths </p>
            <div className="mt-8 flex w-full max-w-xs flex-col gap-3 sm:max-w-sm">
              <label className="text-left text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="subject-select">
                Subject
              </label>
              <select
                id="subject-select"
                value={subjectSlug}
                onChange={(e) => setSubjectSlug(e.target.value)}
                className="w-full rounded-xl border border-slate-600 bg-slate-900 px-4 py-3 text-left font-semibold text-slate-100 outline-none focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20"
              >
                {SUBJECT_OPTIONS.map((o) => (
                  <option key={o.slug} value={o.slug}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={enterSubject}
                className="mt-2 w-full rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 py-3.5 text-sm font-extrabold text-white shadow-lg transition hover:brightness-110"
              >
                Enter
              </button>
            </div>
          </main>

          <aside className="rounded-2xl border border-emerald-500/20 bg-slate-900/70 p-4 lg:col-span-3">
            <h2 className="font-['Nunito'] text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-300/90">School leaderboard</h2>
            <p className="mt-1 text-[11px] text-slate-500">Same school · by total XP</p>
            <ul className="mt-4 space-y-2">
              {leaderboard.length ? (
                leaderboard.map((row, i) => {
                  const isSelf = Number(row.id) === Number(user.id);
                  return (
                    <li
                      key={row.id}
                      className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm ${
                        isSelf
                          ? "border-amber-500/40 bg-amber-950/35 font-bold text-amber-100"
                          : "border-slate-700/80 bg-slate-800/40 text-slate-200"
                      }`}
                    >
                      <span className="truncate">
                        <span className="text-slate-500">#{i + 1}</span> {row.username}
                        {isSelf ? " · you" : ""}
                      </span>
                      <span className="shrink-0 font-mono text-xs text-cyan-200">{row.xp} XP</span>
                    </li>
                  );
                })
              ) : (
                <li className="text-sm text-slate-500">No classmates indexed yet.</li>
              )}
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
