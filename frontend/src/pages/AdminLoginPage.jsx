import { useState } from "react";
import { apiFetch } from "../lib/api";
import { saveSession } from "../lib/auth";

const AdminLoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch("/auth/admin/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
      saveSession(data);
      window.location.href = "/admin/quest-map";
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-10">
      <form onSubmit={submit} className="w-full rounded-3xl border border-white/70 bg-white/85 p-6 shadow-soft backdrop-blur">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Restricted Area</p>
        <h1 className="mt-1 font-['Nunito'] text-3xl font-extrabold">Admin Login</h1>
        <p className="mt-1 text-sm text-slate-600">Only hackathon demo admins can access quest control panel.</p>
        <div className="mt-4 grid gap-3">
          <input
            className="rounded-xl border border-slate-200 px-4 py-3"
            placeholder="Admin Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            className="rounded-xl border border-slate-200 px-4 py-3"
            placeholder="Admin Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}
        <button disabled={loading} className="mt-4 w-full rounded-xl bg-brand-ink px-4 py-3 text-sm font-bold text-white">
          {loading ? "Authorizing..." : "Enter Admin Console"}
        </button>
      </form>
    </div>
  );
};

export default AdminLoginPage;
