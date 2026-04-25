import { Link } from "react-router-dom";

const cardClass =
  "rounded-3xl border border-white/60 bg-white/85 p-6 shadow-soft backdrop-blur transition hover:-translate-y-1";

const LandingPage = () => {
  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-10 sm:px-6">
      <Link 
        to="/teacher" 
        className="absolute right-4 top-4 sm:right-6 sm:top-6 flex items-center justify-center rounded-2xl border border-white/60 bg-white/85 px-5 py-2 shadow-soft backdrop-blur transition hover:-translate-y-1 hover:bg-white"
        title="Teacher Portal"
      >
        <span className="text-xs font-bold uppercase tracking-widest text-slate-600">Teacher</span>
      </Link>

      <div className="w-full space-y-6">
        <header
          className="eduquest-hero-card rounded-3xl border border-white/70 bg-white/80 px-6 py-10 shadow-soft backdrop-blur sm:px-10 sm:py-12"
          aria-label="EduQuest XP"
        >
          <div className="eduquest-sparkles" aria-hidden>
            <span className="eduquest-spark" />
            <span className="eduquest-spark" />
            <span className="eduquest-spark" />
            <span className="eduquest-spark" />
            <span className="eduquest-spark" />
            <span className="eduquest-spark" />
          </div>
          <div className="eduquest-hero-inner">
            <h1 className="eduquest-title">EduQuest XP</h1>
          </div>
        </header>

        <div className="grid gap-5 md:grid-cols-2">
          <Link to="/auth/student" className={cardClass}>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-ocean">Student Access</p>
            <h2 className="mt-2 font-['Nunito'] text-2xl font-extrabold">Student</h2>
            <p className="mt-2 text-sm text-slate-600">Submit assignments, view progress, and complete quests.</p>
          </Link>

          <Link to="/auth/parent" className={cardClass}>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-coral">Parent Access</p>
            <h2 className="mt-2 font-['Nunito'] text-2xl font-extrabold">Parent</h2>
            <p className="mt-2 text-sm text-slate-600">Link child account securely and monitor performance risk.</p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
