const Groq = require("groq-sdk");
const pool = require("../db");

const groq = new Groq({
  apiKey: process.env.GROQ_KEY,
});

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
  return `
    You are an AI tutor in a gamified learning system.

    Student Weak Concepts: ${JSON.stringify(context.weakConcepts)}
    Student Strong Concepts: ${JSON.stringify(context.strongConcepts)}

    Question: ${question.question_text}

    Options: ${JSON.stringify(question.options)}

    Student Answer: ${selected_answer}
    Correct Answer: ${question.correct_option}

    TASK:
    1. Explain why correct answer is right
    2. Explain why student's answer is wrong (if wrong)
    3. Connect explanation to weak concepts
    4. Give a short learning tip
    5. Keep response simple, friendly, and motivating
    6. Make it feel like a game quest feedback system

    Return response in structured sections with headers only. No excessive emojis.
    `;
}


async function generateExplanation(user_id, question, selected_answer) {
  try {
    const context = await getStudentContext(user_id);

    const prompt = buildPrompt(question, context, selected_answer);

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: "You are a helpful AI tutor inside a gamified education system."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7
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