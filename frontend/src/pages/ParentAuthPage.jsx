import { useState } from "react";
import { apiFetch } from "../lib/api";
import { saveSession } from "../lib/auth";

const ParentAuthPage = () => {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    username: "",
    password: "",
    school_id: "",
    student_username: "",
    student_password: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const path = mode === "login" ? "/auth/parent/login" : "/auth/parent/signup";
      const payload =
        mode === "login"
          ? { username: form.username, password: form.password }
          : {
              username: form.username,
              password: form.password,
              school_id: Number(form.school_id),
              student_username: form.student_username,
              student_password: form.student_password
            };
      const data = await apiFetch(path, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      saveSession(data);
      window.location.href = "/parent";
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-10">
      <form onSubmit={submit} className="w-full rounded-3xl bg-white/85 p-6 shadow-soft">
        <h1 className="font-['Nunito'] text-3xl font-extrabold">{mode === "login" ? "Parent Login" : "Parent Signup"}</h1>
        <div className="mt-4 grid gap-3">
          <input
            placeholder="Username"
            className="rounded-xl border border-slate-200 px-4 py-3"
            value={form.username}
            onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="rounded-xl border border-slate-200 px-4 py-3"
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            required
          />
          {mode === "signup" ? (
            <>
              <input
                type="number"
                placeholder="School ID"
                className="rounded-xl border border-slate-200 px-4 py-3"
                value={form.school_id}
                onChange={(e) => setForm((p) => ({ ...p, school_id: e.target.value }))}
                required
              />
              <input
                placeholder="Child Username"
                className="rounded-xl border border-slate-200 px-4 py-3"
                value={form.student_username}
                onChange={(e) => setForm((p) => ({ ...p, student_username: e.target.value }))}
                required
              />
              <input
                type="password"
                placeholder="Child Password"
                className="rounded-xl border border-slate-200 px-4 py-3"
                value={form.student_password}
                onChange={(e) => setForm((p) => ({ ...p, student_password: e.target.value }))}
                required
              />
            </>
          ) : null}
        </div>

        {error ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

        <button disabled={loading} className="mt-4 w-full rounded-xl bg-brand-coral px-4 py-3 font-bold text-white">
          {loading ? "Please wait..." : mode === "login" ? "Login" : "Create Parent Account"}
        </button>

        <button
          type="button"
          onClick={() => setMode((p) => (p === "login" ? "signup" : "login"))}
          className="mt-3 w-full text-sm font-semibold text-brand-ocean"
        >
          {mode === "login" ? "New parent? Signup with child verification" : "Already have account? Login"}
        </button>
      </form>
    </div>
  );
};

export default ParentAuthPage;
