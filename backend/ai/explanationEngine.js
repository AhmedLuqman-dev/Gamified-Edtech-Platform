const Groq = require("groq-sdk");
const pool = require("../db");

// Lazy initialization — only create the Groq client when actually needed
// This prevents the server from crashing if GROQ_KEY is missing at startup
let groq = null;
function getGroqClient() {
  if (!groq) {
    const apiKey = process.env.GROQ_KEY;
    if (!apiKey) {
      throw new Error("GROQ_KEY is not set in environment variables");
    }
    groq = new Groq({ apiKey });
  }
  return groq;
}

async function getStudentContext(user_id) {
  const history = await pool.query(`
    SELECT * FROM assignment_submission
    WHERE user_id = $1
    ORDER BY id DESC
    LIMIT 5
  `, [user_id]);

  let weakConcepts = [];
  let strongConcepts = [];

  history.rows.forEach(row => {
    if (row.percentage < 50) {
      weakConcepts.push(row.title);
    } else if (row.percentage >= 80) {
      strongConcepts.push(row.title);
    }
  });

  return {
    history: history.rows,
    weakConcepts,
    strongConcepts
  };
}

function buildPrompt(question, context, selected_answer) {
  const isCorrect = String(selected_answer).trim() === String(question.correct_answer).trim();

  return `You are explaining a quiz result to a student.

IMPORTANT RULES:
- The CORRECT ANSWER is: "${question.correct_answer}" — this is a FACT, do NOT question it or recalculate it.
- The student selected: "${selected_answer}"
- The student was ${isCorrect ? "CORRECT" : "WRONG"}.
- Do NOT attempt to solve the problem yourself. Just explain WHY "${question.correct_answer}" is correct.
- NEVER contradict the correct answer. NEVER say the correct answer might be wrong.
- Keep your explanation under 150 words.

QUESTION: ${question.question_text}
OPTIONS: ${JSON.stringify(question.options)}
CORRECT ANSWER: ${question.correct_answer}
STUDENT'S ANSWER: ${selected_answer}

${isCorrect
    ? `The student got it right. Give a brief congratulatory explanation of WHY "${question.correct_answer}" is the right answer. Be concise and encouraging.`
    : `The student picked "${selected_answer}" but the correct answer is "${question.correct_answer}". Explain:
1. WHY "${question.correct_answer}" is correct (explain the concept, not re-solving)
2. WHY "${selected_answer}" is wrong (brief, kind)
3. A short tip to remember this concept`
}

${context.weakConcepts.length ? `Student's weak areas: ${context.weakConcepts.join(", ")}. Connect to these if relevant.` : ""}

Format with clear headers using **bold**. Be friendly and motivating. No excessive emojis.`;
}


async function generateExplanation(user_id, question, selected_answer) {
  try {
    const context = await getStudentContext(user_id);

    const prompt = buildPrompt(question, context, selected_answer);

    const client = getGroqClient();
    const response = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `You are a quiz explanation assistant. Your ONLY job is to explain why the provided correct answer is right. CRITICAL RULES:
1. The correct answer given to you is ALWAYS right — never question it, never recalculate it, never say it might be wrong.
2. Do NOT solve the problem from scratch. Just explain the concept behind WHY the answer is what it is.
3. If it's a math problem, do NOT show your own calculations that might differ. Just explain the method briefly.
4. Be concise, clear, and encouraging. Under 150 words.
5. Never contradict yourself. Never say "wait" or "actually" or change your mind mid-explanation.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 400
    });

    return {
      explanation: response.choices[0].message.content,
      context_used: context,
      model_used: "llama-3.1-8b-instant",
      status: "success"
    };

  } catch (error) {
    return {
      explanation: "AI temporarily unavailable. Please try again.",
      context_used: {},
      status: "fallback",
      error: error.message
    };
  }
}

module.exports = generateExplanation;