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
        <div className="grid gap-5 md:grid-cols-2">
          <div className="animate-revealUp rounded-3xl bg-white/85 p-5 shadow-soft">
            <h2 className="font-['Nunito'] text-2xl font-extrabold">Child Snapshot</h2>
            <p className="mt-3 text-sm">Child: <span className="font-bold">{data.child}</span></p>
            <p className="mt-1 text-sm">Trend: <span className="font-bold">{data.trend}</span></p>
            <p className="mt-1 text-sm">Risk Level: <span className="font-bold">{data.risk_level}</span></p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-rose-50 p-3">
                <p className="text-xs font-bold uppercase text-rose-700">Weak Topics</p>
                <p className="mt-1 text-xl font-extrabold text-rose-700">{data.weak_topics?.length || 0}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3">
                <p className="text-xs font-bold uppercase text-emerald-700">Strong Topics</p>
                <p className="mt-1 text-xl font-extrabold text-emerald-700">{data.strong_topics?.length || 0}</p>
              </div>
            </div>
          </div>
          <div className="animate-revealUp rounded-3xl bg-white/85 p-5 shadow-soft">
            <h2 className="font-['Nunito'] text-2xl font-extrabold">Performance Charts</h2>
            <p className="mt-3 text-sm">Average Grade: <span className="font-bold">{Number(data.average_grade).toFixed(1)}%</span></p>
            <p className="mt-1 text-sm">Attendance: <span className="font-bold">{Number(data.attendance).toFixed(1)}%</span></p>
            <div className="mt-4 space-y-3">
              <MetricBar label="Average Grade" value={Number(data.average_grade)} colorClass="bg-gradient-to-r from-brand-ocean to-brand-mint" />
              <MetricBar label="Attendance" value={Number(data.attendance)} colorClass="bg-gradient-to-r from-brand-mint to-emerald-600" />
              <MetricBar
                label="Risk Pressure"
                value={data.risk_level === "CRITICAL" ? 90 : data.risk_level === "WARNING" ? 60 : 25}
                colorClass="bg-gradient-to-r from-amber-500 to-rose-500"
              />
            </div>
          </div>
        </div>
      ) : null}

      {data ? (
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="animate-revealUp rounded-3xl bg-white/85 p-5 shadow-soft">
            <h3 className="font-['Nunito'] text-xl font-extrabold">Attendance Timeline</h3>
            <div className="mt-4 flex h-40 items-end gap-2">
              {(history.attendance_history || []).slice(-12).map((item, idx) => {
                const height = item.status === "PRESENT" ? 100 : item.status === "LATE" ? 70 : 35;
                const color = item.status === "PRESENT" ? "bg-emerald-500" : item.status === "LATE" ? "bg-amber-500" : "bg-rose-500";
                return (
                  <div key={`${item.date}-${idx}`} className="group relative flex-1">
                    <div className={`w-full rounded-t-md ${color}`} style={{ height: `${height}%` }} />
                    <span className="invisible absolute -top-6 left-1/2 -translate-x-1/2 rounded bg-slate-900 px-2 py-1 text-[10px] text-white group-hover:visible">
                      {item.status}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-slate-500">Last 12 sessions (green=PRESENT, yellow=LATE, red=ABSENT)</p>
          </div>

          <div className="animate-revealUp rounded-3xl bg-white/85 p-5 shadow-soft">
            <h3 className="font-['Nunito'] text-xl font-extrabold">Grade Progress</h3>
            <div className="mt-4 grid gap-2">
              {(history.grade_history || []).slice(-8).map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 p-2">
                  <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-600">
                    <span>{item.title}</span>
                    <span>{Number(item.percentage).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-ocean to-brand-coral"
                      style={{ width: `${Math.max(2, Math.min(100, Number(item.percentage)))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ParentDashboard;
