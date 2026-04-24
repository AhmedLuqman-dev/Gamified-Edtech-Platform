import { Link } from "react-router-dom";

const cardClass =
  "rounded-3xl border border-white/60 bg-white/85 p-6 shadow-soft backdrop-blur transition hover:-translate-y-1";

const LandingPage = () => {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-10 sm:px-6">
      <div className="w-full space-y-6">
        <header className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Campus Cortex AI</p>
          <h1 className="mt-2 font-['Nunito'] text-4xl font-extrabold text-brand-ink">Choose Your Portal</h1>
          <p className="mt-2 text-sm text-slate-600">
            Secure role-based dashboard for students and parents with adaptive learning insights.
          </p>
        </header>

        <div className="grid gap-5 md:grid-cols-2">
          <Link to="/auth/student" className={cardClass}>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-ocean">Student Access</p>
            <h2 className="mt-2 font-['Nunito'] text-2xl font-extrabold">Student Login / Signup</h2>
            <p className="mt-2 text-sm text-slate-600">Submit assignments, view progress, and complete quests.</p>
          </Link>

          <Link to="/auth/parent" className={cardClass}>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-coral">Parent Access</p>
            <h2 className="mt-2 font-['Nunito'] text-2xl font-extrabold">Parent Login / Signup</h2>
            <p className="mt-2 text-sm text-slate-600">Link child account securely and monitor performance risk.</p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
