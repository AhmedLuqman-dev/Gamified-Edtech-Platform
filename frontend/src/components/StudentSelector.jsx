const StudentSelector = ({ selectedStudentProfile, onProfileChange }) => {
  return (
    <div className="animate-revealUp rounded-2xl bg-white/85 p-4 shadow-soft backdrop-blur">
      <label
        htmlFor="studentProfile"
        className="mb-2 block text-sm font-semibold tracking-wide text-slate-600"
      >
        Student Profile
      </label>
      <select
        id="studentProfile"
        value={selectedStudentProfile}
        onChange={(event) => onProfileChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-brand-ocean focus:ring-2 focus:ring-brand-ocean/20"
      >
        <option value="struggling">Struggling Student</option>
        <option value="average">Average Student</option>
        <option value="advanced">Advanced Student</option>
      </select>
    </div>
  );
};

export default StudentSelector;
