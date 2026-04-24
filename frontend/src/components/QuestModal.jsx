import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import BattleAnimation from "./BattleAnimation";

const normalizeOptions = (options) => {
  if (Array.isArray(options)) return options;
  if (typeof options === "object" && options !== null) return Object.values(options);
  return [];
};

/* Simple markdown-ish renderer: turns **bold**, ### headers, and newlines into JSX */
const renderExplanation = (text) => {
  if (!text) return null;
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <br key={i} />;

    // Headers
    if (trimmed.startsWith("### "))
      return <h3 key={i}>{trimmed.slice(4)}</h3>;
    if (trimmed.startsWith("## "))
      return <h2 key={i}>{trimmed.slice(3)}</h2>;
    if (trimmed.startsWith("# "))
      return <h1 key={i}>{trimmed.slice(2)}</h1>;

    // Bold segments
    const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
    const rendered = parts.map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={j}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });

    return <p key={i} style={{ margin: "0.2rem 0" }}>{rendered}</p>;
  });
};

const QuestModal = ({ isOpen, onClose, onQuestResolved, onRefresherQuest, node, selectedStudentId, defaultSubject = "" }) => {
  const [feedback, setFeedback] = useState("");
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [matchNote, setMatchNote] = useState("");

  // Battle animation state
  const [battleState, setBattleState] = useState(null); // null | { isCorrect, xpAwarded, result }
  const [showBattle, setShowBattle] = useState(false);

  // Explanation state
  const [explanation, setExplanation] = useState(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    if (!isOpen || !node) return;

    const loadQuestion = async () => {
      setLoading(true);
      setFeedback("");
      setQuestion(null);
      setMatchNote("");
      setBattleState(null);
      setShowBattle(false);
      setExplanation(null);
      setShowExplanation(false);
      setLoadingExplanation(false);
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

  // Fetch AI explanation after battle
  const fetchExplanation = useCallback(async (questionData, selectedOption) => {
    setLoadingExplanation(true);
    try {
      const result = await apiFetch("/ai/explain", {
        method: "POST",
        body: JSON.stringify({
          user_id: selectedStudentId,
          question_id: questionData.id,
          question: questionData,
          selected_answer: selectedOption,
        }),
      });
      setExplanation(result.explanation || "No explanation available.");
    } catch {
      setExplanation("⚡ AI tutor is resting. The correct answer was: " + (questionData.correct_answer || "N/A"));
    } finally {
      setLoadingExplanation(false);
    }
  }, [selectedStudentId]);

  const handleBattleComplete = useCallback(() => {
    setShowBattle(false);
    setShowExplanation(true);

    if (battleState?.isCorrect) {
      setFeedback(`⚔️ Critical hit! +${battleState.xpAwarded || 0} XP`);
    } else {
      setFeedback("🛡️ Blocked! Study the explanation below to power up.");
    }
  }, [battleState]);

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

      // Store result and trigger battle animation
      setBattleState({
        isCorrect: result.correct,
        xpAwarded: result.xp_awarded || node.xp || 0,
        result
      });
      setShowBattle(true);

      // Fetch explanation in background during animation
      fetchExplanation(question, option);

      // If wrong, notify parent about refresher quest
      if (!result.correct && result.newQuest && onRefresherQuest) {
        onRefresherQuest(result.newQuest);
      }
    } catch (err) {
      setFeedback(err.message || "Connection lost");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDone = () => {
    if (battleState?.isCorrect) {
      onQuestResolved(battleState.xpAwarded || 0);
    }
    setBattleState(null);
    setShowBattle(false);
    setShowExplanation(false);
    setExplanation(null);
    setFeedback("");
    if (!battleState?.isCorrect) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="quest-modal-fx relative w-full max-w-lg overflow-hidden rounded-2xl border-2 border-amber-500/50 bg-slate-900 p-1 shadow-[0_0_50px_rgba(251,191,36,0.25)]">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-transparent to-amber-500/10" aria-hidden="true" />
        <div className="relative rounded-xl bg-slate-950/95 p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-amber-400/90">Active duel</p>
            {node.xp != null ? (
              <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs font-extrabold text-amber-200">+{node.xp} XP</span>
            ) : null}
          </div>
          <h2 className="font-['Nunito'] text-xl font-extrabold text-amber-100 sm:text-2xl">{node.chapter}</h2>
          <p className="mt-1 text-sm text-cyan-100/80">{node.unlock_message}</p>
          {matchNote ? <p className="mt-1 text-xs text-slate-500">{matchNote}</p> : null}

          {/* ── Battle Animation ── */}
          {showBattle && battleState && (
            <div className="mt-4">
              <BattleAnimation
                isCorrect={battleState.isCorrect}
                onComplete={handleBattleComplete}
              />
            </div>
          )}

          {/* ── Question Area (hidden during battle/explanation) ── */}
          {!showBattle && !showExplanation && (
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
          )}

          {/* ── Explanation Panel (after battle) ── */}
          {showExplanation && (
            <div className="mt-4 space-y-3">
              {/* Result badge */}
              <div className={`flex items-center gap-2 rounded-xl px-4 py-3 ${
                battleState?.isCorrect
                  ? "border border-emerald-500/40 bg-emerald-950/50"
                  : "border border-rose-500/40 bg-rose-950/50"
              }`}>
                <span className="text-2xl">{battleState?.isCorrect ? "⚔️" : "🛡️"}</span>
                <div>
                  <p className={`text-sm font-extrabold ${battleState?.isCorrect ? "text-emerald-200" : "text-rose-200"}`}>
                    {battleState?.isCorrect ? `Quest Cleared! +${battleState.xpAwarded} XP` : "Blocked — Review & Power Up!"}
                  </p>
                  <p className="text-xs text-slate-400">
                    Correct answer: <span className="font-bold text-amber-300">{question?.correct_answer || "—"}</span>
                  </p>
                </div>
              </div>

              {/* AI Explanation */}
              <div>
                <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.15em] text-violet-400/90">
                  📜 Quest Scroll — AI Tutor Explanation
                </p>
                {loadingExplanation ? (
                  <div className="explanation-scroll">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
                      <span className="text-sm text-slate-400">AI tutor is analyzing your battle…</span>
                    </div>
                  </div>
                ) : (
                  <div className="explanation-scroll">
                    {renderExplanation(explanation)}
                  </div>
                )}
              </div>

              {/* Action button */}
              <button
                type="button"
                onClick={handleDone}
                className={`w-full rounded-xl py-3 text-sm font-extrabold shadow-lg transition hover:brightness-110 ${
                  battleState?.isCorrect
                    ? "bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-900"
                    : "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
                }`}
              >
                {battleState?.isCorrect ? "🎉 Continue Quest Line" : "📖 Got it — Try Again Later"}
              </button>
            </div>
          )}

          {/* ── Feedback strip ── */}
          {feedback && !showExplanation ? (
            <p className="mt-3 rounded-lg border border-cyan-500/30 bg-cyan-950/50 px-3 py-2 text-sm font-bold text-cyan-200">{feedback}</p>
          ) : null}

          {/* ── Close button (when question visible) ── */}
          {!showBattle && !showExplanation && (
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-300"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestModal;
