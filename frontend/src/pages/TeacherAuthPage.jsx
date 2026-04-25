import { useState } from "react";
import { apiFetch } from "../lib/api";
import { saveSession } from "../lib/auth";

const TeacherAuthPage = () => {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    username: "",
    password: "",
    school_id: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const path = mode === "login" ? "/auth/teacher/login" : "/auth/teacher/signup";
      const payload =
        mode === "login"
          ? { username: form.username, password: form.password }
          : {
              username: form.username,
              password: form.password,
              school_id: Number(form.school_id)
            };
      const data = await apiFetch(path, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      saveSession(data);
      window.location.href = "/teacher/dashboard";
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-10">
      {/* Decorative Orbs to make Glassmorphism pop */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-full max-w-lg">
        <div className="absolute -left-10 top-0 h-72 w-72 rounded-full bg-emerald-400/30 blur-3xl"></div>
        <div className="absolute -right-10 bottom-0 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl"></div>
      </div>

      <form onSubmit={submit} className="relative z-10 w-full rounded-3xl border border-white/60 bg-white/50 p-8 shadow-[0_8px_32px_rgba(31,38,135,0.1)] backdrop-blur-xl sm:p-10">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Teacher Access</p>
          <h1 className="mt-2 font-['Nunito'] text-3xl font-extrabold text-slate-800">{mode === "login" ? "Teacher Login" : "Teacher Signup"}</h1>
        </div>
        <div className="mt-8 grid gap-4 text-left">
          <input
            placeholder="Username"
            className="rounded-xl border border-white/40 bg-white/60 px-5 py-3.5 text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
            value={form.username}
            onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="rounded-xl border border-white/40 bg-white/60 px-5 py-3.5 text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            required
          />
          {mode === "signup" ? (
            <input
              type="number"
              placeholder="School ID"
              className="rounded-xl border border-white/40 bg-white/60 px-5 py-3.5 text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
              value={form.school_id}
              onChange={(e) => setForm((p) => ({ ...p, school_id: e.target.value }))}
              required
            />
          ) : null}
        </div>

        {error ? <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}

        <button disabled={loading} className="mt-6 w-full rounded-xl bg-emerald-600 px-4 py-3.5 font-bold text-white shadow-md transition hover:bg-emerald-500">
          {loading ? "Please wait..." : mode === "login" ? "Enter Teacher Console" : "Create Teacher Account"}
        </button>

        <button
          type="button"
          onClick={() => setMode((p) => (p === "login" ? "signup" : "login"))}
          className="mt-4 w-full text-sm font-semibold text-emerald-700"
        >
          {mode === "login" ? "New teacher? Signup with School ID" : "Already have account? Login"}
        </button>
      </form>
    </div>
  );
};

export default TeacherAuthPage;
