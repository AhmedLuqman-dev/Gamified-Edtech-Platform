import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

const MetricBar = ({ label, value, colorClass }) => (
  <div>
    <div className="mb-1 flex items-center justify-between text-xs font-bold uppercase tracking-wide text-slate-500">
      <span>{label}</span>
      <span>{Math.round(value)}%</span>
    </div>
    <div className="h-3 overflow-hidden rounded-full bg-slate-200">
      <div className={`h-full rounded-full transition-all duration-700 ${colorClass}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  </div>
);

const TopicChip = ({ topic, attempts, isWeak }) => (
  <div className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 ${
    isWeak
      ? "border-rose-200 bg-gradient-to-r from-rose-50 to-rose-100"
      : "border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-100"
  }`}>
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-base">{isWeak ? "🔴" : "🟢"}</span>
      <span className={`text-sm font-bold truncate ${isWeak ? "text-rose-800" : "text-emerald-800"}`}>
        {typeof topic === "object" ? topic.topic : topic}
      </span>
    </div>
    {attempts != null && (
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
        isWeak
          ? "bg-rose-200 text-rose-800"
          : "bg-emerald-200 text-emerald-800"
      }`}>
        {attempts} {attempts === 1 ? "attempt" : "attempts"}
      </span>
    )}
  </div>
);

const ParentDashboard = ({ user, onLogout }) => {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState({ attendance_history: [], grade_history: [] });
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [dashboardData, historyData] = await Promise.all([
          apiFetch(`/parent/${user.id}/dashboard`),
          apiFetch(`/parent/${user.id}/history`)
        ]);
        setData(dashboardData);
        setHistory(historyData);
      } catch (err) {
        setError(err.message);
      }
    };
    load();
  }, [user.id]);

  const studentStats = data?.student_stats || { xp: 0, level: 1, streak: 0 };

  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between rounded-3xl bg-white/85 p-5 shadow-soft animate-revealUp">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Parent Dashboard</p>
          <h1 className="font-['Nunito'] text-3xl font-extrabold">Welcome, {user.username}</h1>
        </div>
        <button onClick={onLogout} className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-bold">
          Logout
        </button>
      </header>

      {error ? <p className="rounded-xl bg-rose-50 p-3 text-rose-700">{error}</p> : null}

      {data ? (
        <>
          {/* ═══════ Student Stats Bar (XP, Level, Streak) ═══════ */}
          <div className="mb-5 grid grid-cols-3 gap-3 animate-revealUp">
            <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 text-center shadow-soft">
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">Level</p>
              <p className="font-['Nunito'] text-3xl font-black text-indigo-800">{studentStats.level}</p>
              <p className="text-[10px] text-indigo-500">{studentStats.xp} XP total</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100 p-4 text-center shadow-soft">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Streak</p>
              <div className="flex items-center justify-center gap-1">
                <span className="text-2xl">{studentStats.streak > 0 ? '🔥' : '❄️'}</span>
                <span className="font-['Nunito'] text-3xl font-black text-amber-800">{studentStats.streak}</span>
              </div>
              <p className="text-[10px] text-amber-600">{studentStats.streak > 0 ? 'days active' : 'no streak'}</p>
            </div>
            <div className="rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-cyan-100 p-4 text-center shadow-soft">
              <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-600">Attendance</p>
              <p className="font-['Nunito'] text-3xl font-black text-cyan-800">{Math.round(data.attendance)}%</p>
              <p className="text-[10px] text-cyan-600">{data.total_active_days || 0} of {data.total_days_since_start || 1} days</p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="animate-revealUp rounded-3xl bg-white/85 p-5 shadow-soft">
              <h2 className="font-['Nunito'] text-2xl font-extrabold">Child Snapshot</h2>
              <p className="mt-3 text-sm">Child: <span className="font-bold">{data.child}</span></p>
              <p className="mt-1 text-sm">Trend:
                <span className={`ml-1 inline-block rounded-full px-2 py-0.5 text-xs font-bold ${
                  data.trend === 'improving' ? 'bg-emerald-100 text-emerald-700'
                  : data.trend === 'declining' ? 'bg-rose-100 text-rose-700'
                  : data.trend === 'no data' ? 'bg-slate-100 text-slate-500'
                  : 'bg-amber-100 text-amber-700'
                }`}>{data.trend === 'no data' ? 'Not enough data' : data.trend}</span>
              </p>
              <p className="mt-1 text-sm">Risk Level:
                <span className={`ml-1 inline-block rounded-full px-2 py-0.5 text-xs font-bold ${
                  data.risk_level === 'CRITICAL' ? 'bg-rose-100 text-rose-700'
                  : data.risk_level === 'WARNING' ? 'bg-amber-100 text-amber-700'
                  : data.risk_level === 'NO DATA' ? 'bg-slate-100 text-slate-500'
                  : 'bg-emerald-100 text-emerald-700'
                }`}>{data.risk_level === 'NO DATA' ? 'Not enough data' : data.risk_level}</span>
              </p>

              {/* Student Learning Level Badge */}
              {data.student_profile && (
                <div className={`mt-4 rounded-2xl p-4 ${
                  data.student_profile === "struggling"
                    ? "border-2 border-rose-300 bg-gradient-to-br from-rose-50 to-rose-100"
                    : data.student_profile === "advanced"
                      ? "border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-emerald-100"
                      : "border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100"
                }`}>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">
                      {data.student_profile === "struggling" ? "🔴" : data.student_profile === "advanced" ? "🟢" : "🟡"}
                    </span>
                    <div>
                      <p className={`text-xs font-bold uppercase tracking-wider ${
                        data.student_profile === "struggling"
                          ? "text-rose-600"
                          : data.student_profile === "advanced"
                            ? "text-emerald-600"
                            : "text-amber-600"
                      }`}>Learning Level</p>
                      <p className={`text-lg font-extrabold capitalize ${
                        data.student_profile === "struggling"
                          ? "text-rose-800"
                          : data.student_profile === "advanced"
                            ? "text-emerald-800"
                            : "text-amber-800"
                      }`}>{data.student_profile}</p>
                    </div>
                  </div>
                  <p className={`mt-2 text-xs ${
                    data.student_profile === "struggling"
                      ? "text-rose-700"
                      : data.student_profile === "advanced"
                        ? "text-emerald-700"
                        : "text-amber-700"
                  }`}>
                    {data.student_profile === "struggling"
                      ? "Your child may need extra support. Consider reviewing weak topics together and encouraging consistent practice."
                      : data.student_profile === "advanced"
                        ? "Your child is excelling! They consistently demonstrate strong understanding and are ready for more challenging material."
                        : "Your child is progressing well. Steady practice will help them continue improving across all topics."}
                  </p>
                </div>
              )}
            </div>

            <div className="animate-revealUp rounded-3xl bg-white/85 p-5 shadow-soft">
              <h2 className="font-['Nunito'] text-2xl font-extrabold">Activity Overview</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs font-bold uppercase tracking-wide text-slate-500">
                    <span>Attendance</span>
                    <span>{Math.round(data.attendance)}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-brand-mint to-emerald-600" style={{ width: `${Math.max(0, Math.min(100, data.attendance))}%` }} />
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">{data.total_active_days || 0} active days out of {data.total_days_since_start || 1} total days</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-lg">{studentStats.streak > 0 ? '🔥' : '❄️'}</span>
                      <span className="font-['Nunito'] text-2xl font-black text-amber-800">{studentStats.streak}</span>
                    </div>
                    <p className="text-[10px] font-bold uppercase text-amber-600">Day Streak</p>
                  </div>
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-center">
                    <p className="font-['Nunito'] text-2xl font-black text-indigo-800">Lv {studentStats.level}</p>
                    <p className="text-[10px] font-bold uppercase text-indigo-600">{studentStats.xp} XP</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-rose-50 p-3 text-center">
                    <p className="text-xs font-bold uppercase text-rose-700">Weak Topics</p>
                    <p className="mt-1 text-xl font-extrabold text-rose-700">{data.weak_topics?.length || 0}</p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 p-3 text-center">
                    <p className="text-xs font-bold uppercase text-emerald-700">Strong Topics</p>
                    <p className="mt-1 text-xl font-extrabold text-emerald-700">{data.strong_topics?.length || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════ Weak / Strong Topics Detail ═══════ */}
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {/* Weak Topics */}
            <div className="animate-revealUp rounded-3xl bg-white/85 p-5 shadow-soft">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">⚠️</span>
                <h3 className="font-['Nunito'] text-xl font-extrabold text-rose-800">Weak Topics</h3>
                <span className="ml-auto rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">
                  {data.weak_topics?.length || 0}
                </span>
              </div>
              <p className="mb-3 text-xs text-slate-500">Topics attempted multiple times — needs more practice</p>
              {(data.weak_topics && data.weak_topics.length > 0) ? (
                <div className="space-y-2">
                  {data.weak_topics.map((item, idx) => (
                    <TopicChip
                      key={idx}
                      topic={item}
                      attempts={item.attempts}
                      isWeak={true}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">No weak topics detected yet. 🎉</p>
              )}
            </div>

            {/* Strong Topics */}
            <div className="animate-revealUp rounded-3xl bg-white/85 p-5 shadow-soft">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">⭐</span>
                <h3 className="font-['Nunito'] text-xl font-extrabold text-emerald-800">Strong Topics</h3>
                <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                  {data.strong_topics?.length || 0}
                </span>
              </div>
              <p className="mb-3 text-xs text-slate-500">Topics completed on the first try — great mastery!</p>
              {(data.strong_topics && data.strong_topics.length > 0) ? (
                <div className="space-y-2">
                  {data.strong_topics.map((item, idx) => (
                    <TopicChip
                      key={idx}
                      topic={item}
                      attempts={item.attempts}
                      isWeak={false}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">No strong topics yet — keep practicing!</p>
              )}
            </div>
          </div>

        </>
      ) : null}
    </div>
  );
};

export default ParentDashboard;
