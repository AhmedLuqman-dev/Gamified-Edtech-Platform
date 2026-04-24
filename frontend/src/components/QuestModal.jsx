import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

const normalizeOptions = (options) => {
  if (Array.isArray(options)) return options;
  if (typeof options === "object" && options !== null) return Object.values(options);
  return [];
};

const QuestModal = ({ isOpen, onClose, onQuestResolved, onRefresherQuest, node, selectedStudentId, defaultSubject = "" }) => {
  const [feedback, setFeedback] = useState("");
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [matchNote, setMatchNote] = useState("");

  useEffect(() => {
    if (!isOpen || !node) return;

    const loadQuestion = async () => {
      setLoading(true);
      setFeedback("");
      setQuestion(null);
      setMatchNote("");
      try {
        const params = new URLSearchParams();
        if (node.chapter) params.set("chapter", node.chapter);
        if (node.difficulty) params.set("difficulty", node.difficulty);
        if (node.subject) params.set("subject", node.subject);
        else if (defaultSubject) params.set("subject", defaultSubject);

        const data = await apiFetch(`/questions/random?${params.toString()}`);
        setMatchNote(data._match ? `Question bank: ${data._match.replace(/_/g, " ")}` : "");
        setQuestion({
          ...data,
          options: normalizeOptions(data.options)
        });
      } catch (err) {
        setFeedback(err.message || "Failed to load question");
      } finally {
        setLoading(false);
      }
    };

    loadQuestion();
  }, [node, isOpen, defaultSubject]);

  if (!isOpen || !node) {
    return null;
  }

  const handleOptionClick = async (option) => {
    if (!question || submitting) return;
    setSubmitting(true);
    setFeedback("");

    try {
      const result = await apiFetch("/check-answer", {
        method: "POST",
        body: JSON.stringify({
          question_id: question.id,
          selected_option: option,
          user_id: selectedStudentId,
          quest_xp: node.xp || 0,
          chapter: node.chapter
        })
      });

      if (result.correct) {
        setFeedback(`Critical hit! +${result.xp_awarded || node.xp || 0} XP`);
        setTimeout(() => {
          setFeedback("");
          onQuestResolved(result.xp_awarded || node.xp || 0);
        }, 800);
      } else {
        setFeedback(result.message || "Shield broken — try again.");
        if (result.newQuest && onRefresherQuest) {
          onRefresherQuest(result.newQuest);
        }
      }
    } catch (err) {
      setFeedback(err.message || "Connection lost");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="quest-modal-fx relative w-full max-w-lg overflow-hidden rounded-2xl border-2 border-amber-500/50 bg-slate-900 p-1 shadow-[0_0_50px_rgba(251,191,36,0.25)]">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-transparent to-amber-500/10" aria-hidden="true" />
        <div className="relative rounded-xl bg-slate-950/95 p-5 sm:p-6">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-amber-400/90">Active duel</p>
            {node.xp != null ? (
              <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs font-extrabold text-amber-200">+{node.xp} XP</span>
            ) : null}
          </div>
          <h2 className="font-['Nunito'] text-xl font-extrabold text-amber-100 sm:text-2xl">{node.chapter}</h2>
          <p className="mt-1 text-sm text-cyan-100/80">{node.unlock_message}</p>
          {matchNote ? <p className="mt-1 text-xs text-slate-500">{matchNote}</p> : null}

          <div className="mt-4 rounded-xl border border-slate-700/80 bg-slate-900/80 p-4">
            {loading ? (
              <div className="space-y-2">
                <div className="h-4 w-2/3 animate-pulse rounded bg-slate-700" />
                <div className="h-4 w-full animate-pulse rounded bg-slate-800" />
                <p className="text-sm font-semibold text-cyan-200/80">Spawning question…</p>
              </div>
            ) : question ? (
              <>
                <p className="text-sm font-bold leading-relaxed text-slate-100">{question.question_text}</p>
                <div className="mt-3 grid gap-2">
                  {question.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleOptionClick(option)}
                      disabled={submitting}
                      className="group rounded-lg border border-cyan-500/30 bg-slate-800/80 px-3 py-2.5 text-left text-sm font-bold text-cyan-50 transition hover:border-amber-400/60 hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-amber-400 opacity-0 transition group-hover:opacity-100" />
                      {option}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm font-bold text-rose-300">No question loaded. Seed `questions` for this chapter in Supabase.</p>
            )}
          </div>

          {feedback ? (
            <p className="mt-3 rounded-lg border border-cyan-500/30 bg-cyan-950/50 px-3 py-2 text-sm font-bold text-cyan-200">{feedback}</p>
          ) : null}

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestModal;
