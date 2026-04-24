import { useMemo, useState } from "react";

const QuestModal = ({ isOpen, onClose, node }) => {
  const [feedback, setFeedback] = useState("");

  const question = useMemo(
    () => ({
      prompt: "Which strategy helps most when solving a tough coding problem?",
      options: [
        "Skip analysis and write code immediately",
        "Break it into smaller steps first",
        "Memorize random solutions",
        "Avoid testing edge cases"
      ],
      answer: "Break it into smaller steps first"
    }),
    []
  );

  if (!isOpen || !node) {
    return null;
  }

  const handleOptionClick = (option) => {
    if (option === question.answer) {
      setFeedback("Quest cleared. Awesome work!");
      setTimeout(() => {
        setFeedback("");
        onClose(true);
      }, 800);
    } else {
      setFeedback("Not quite. Try once more.");
    }
  };

  const closeModal = () => {
    setFeedback("");
    onClose(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <h2 className="font-['Nunito'] text-2xl font-extrabold text-brand-ink">{node.chapter}</h2>
        <p className="mt-2 text-sm text-slate-600">{node.unlock_message}</p>

        <div className="mt-5 rounded-xl bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-700">{question.prompt}</p>
          <div className="mt-3 grid gap-2">
            {question.options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleOptionClick(option)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:border-brand-ocean hover:text-brand-ocean"
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {feedback ? (
          <p className="mt-4 rounded-lg bg-brand-haze px-3 py-2 text-sm font-semibold text-brand-ocean">{feedback}</p>
        ) : null}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={closeModal}
            className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuestModal;
