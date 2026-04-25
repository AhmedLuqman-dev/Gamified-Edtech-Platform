import { Link } from "react-router-dom";

const cardClass =
  "rounded-3xl border border-white/60 bg-white/85 p-6 shadow-soft backdrop-blur transition hover:-translate-y-1";

const LandingPage = () => {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-10 sm:px-6">
      <div className="w-full space-y-6">
        <header
          className="edurpg-hero-card rounded-3xl border border-white/70 bg-white/80 px-6 py-10 shadow-soft backdrop-blur sm:px-10 sm:py-12"
          aria-label="EduRPG"
        >
          <div className="edurpg-sparkles" aria-hidden>
            <span className="edurpg-spark" />
            <span className="edurpg-spark" />
            <span className="edurpg-spark" />
            <span className="edurpg-spark" />
            <span className="edurpg-spark" />
            <span className="edurpg-spark" />
          </div>
          <div className="edurpg-hero-inner">
            <h1 className="edurpg-title">EduRPG</h1>
          </div>
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
