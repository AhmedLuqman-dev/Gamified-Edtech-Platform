const Header = ({ totalXP, selectedStudentProfile }) => {
  const profileLabelMap = {
    struggling: "Struggling",
    average: "Average",
    advanced: "Advanced"
  };

  return (
    <header className="mb-6 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-soft backdrop-blur">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Learning Arena</p>
          <h1 className="mt-1 font-['Nunito'] text-3xl font-extrabold text-brand-ink md:text-4xl">
            Adaptive Quest Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-brand-haze px-4 py-2 text-sm font-semibold text-brand-ocean">
            Profile: {profileLabelMap[selectedStudentProfile]}
          </span>
          <span className="rounded-full bg-brand-mint px-4 py-2 text-sm font-bold text-white">
            Total XP: {totalXP}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;
