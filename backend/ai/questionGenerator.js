const Groq = require("groq-sdk");

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

function extractJsonObject(text) {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1].trim() : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** Pull a JSON array of question objects from model output (root array or { questions: [...] }). */
function extractQuestionsArray(text) {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1].trim() : trimmed;

  const tryParse = (s) => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };

  let parsed = tryParse(candidate);
  if (parsed && Array.isArray(parsed.questions)) return parsed.questions;
  if (Array.isArray(parsed)) return parsed;

  parsed = extractJsonObject(text);
  if (parsed && Array.isArray(parsed.questions)) return parsed.questions;

  const start = candidate.indexOf("[");
  const end = candidate.lastIndexOf("]");
  if (start >= 0 && end > start) {
    parsed = tryParse(candidate.slice(start, end + 1));
    if (Array.isArray(parsed)) return parsed;
  }
  return null;
}

function validateQuestionItem(parsed) {
  if (!parsed || typeof parsed.question_text !== "string") return null;
  const options = Array.isArray(parsed.options) ? parsed.options.map(String) : [];
  if (options.length !== 4) return null;
  const correct = String(parsed.correct_answer || "").trim();
  if (!options.includes(correct)) return null;
  const explanation = String(parsed.explanation || "").trim() || "See class notes for a refresher.";
  return {
    question_text: parsed.question_text.trim(),
    options,
    correct_answer: correct,
    explanation
  };
}

function normalizeRow(row, fallbackOptions) {
  let opts = row.options;
  if (typeof opts === "string") {
    try {
      opts = JSON.parse(opts);
    } catch {
      opts = fallbackOptions;
    }
  }
  return { ...row, options: opts, _source: row._source || "groq_generated" };
}

async function insertQuestionRow(pool, sub, ch, diff, item) {
  const insert = await pool.query(
    `INSERT INTO questions (subject, chapter, difficulty, question_text, options, correct_answer, explanation)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, subject, chapter, difficulty, question_text, options, correct_answer, explanation`,
    [sub, ch, diff, item.question_text, JSON.stringify(item.options), item.correct_answer, item.explanation]
  );
  return normalizeRow(insert.rows[0], item.options);
}

async function generateOneQuestionFromGroq(client, sub, ch, diff) {
  const userPrompt = `You write short multiple-choice questions for middle-school / early high-school students.

Subject: ${sub}
Topic / chapter focus: ${ch}
Difficulty: ${diff}

Return ONLY a JSON object (no markdown) with this exact shape:
{
  "question_text": "string, one clear question",
  "options": ["exactly four distinct answer strings"],
  "correct_answer": "string that exactly matches one element of options",
  "explanation": "one sentence why the correct answer is right"
}

Rules:
- options must be exactly 4 strings, plausible distractors, no "all of the above".
- correct_answer must === one option string character-for-character.`;

  const completion = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: "You output only valid JSON for quiz questions. No prose outside JSON." },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.65,
    max_tokens: 600
  });

  const raw = completion.choices[0]?.message?.content || "";
  const parsed = extractJsonObject(raw);
  const item = validateQuestionItem(parsed);
  if (!item) throw new Error("Model did not return parseable question JSON");
  return item;
}

/**
 * Generates one MCQ via Groq, inserts into questions, returns row (for /check-answer).
 */
async function generateAndStoreQuestion(pool, { subject, chapter, difficulty = "medium" }) {
  const sub = String(subject || "").trim() || "General";
  const ch = String(chapter || "").trim();
  const diff = String(difficulty || "medium").trim().toLowerCase();
  if (!ch) throw new Error("chapter is required");

  const client = getGroqClient();
  const item = await generateOneQuestionFromGroq(client, sub, ch, diff);
  const row = await insertQuestionRow(pool, sub, ch, diff, item);
  return { ...row, _source: "groq_generated" };
}

/**
 * Ask Groq once for N questions; insert all. On parse/validation failure, falls back to
 * N sequential single-question calls (still one HTTP request each, but no parallel burst from client).
 */
async function generateAndStoreQuestionsBatch(pool, { subject, chapter, difficulty = "medium", count = 5 }) {
  const sub = String(subject || "").trim() || "General";
  const ch = String(chapter || "").trim();
  const diff = String(difficulty || "medium").trim().toLowerCase();
  if (!ch) throw new Error("chapter is required");

  const n = Math.min(10, Math.max(1, parseInt(String(count), 10) || 5));

  const tryBatch = async () => {
    const client = getGroqClient();
    const userPrompt = `You write short multiple-choice questions for middle-school / early high-school students.

Subject: ${sub}
Topic / chapter focus: ${ch}
Difficulty: ${diff}

Return ONLY valid JSON (no markdown) with this exact shape:
{
  "questions": [
    {
      "question_text": "string",
      "options": ["four distinct answer strings"],
      "correct_answer": "must exactly match one string in options",
      "explanation": "one short sentence"
    }
  ]
}

Rules:
- The "questions" array MUST contain exactly ${n} items.
- Each item: exactly 4 options, plausible distractors, no "all of the above".
- Questions must be distinct from each other (different angles or sub-skills within the topic).
- correct_answer must match one option character-for-character.`;

    const completion = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: "You output only valid JSON. The questions array length must match the requested count exactly."
        },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: Math.min(8000, 400 + n * 450)
    });

    const raw = completion.choices[0]?.message?.content || "";
    const arr = extractQuestionsArray(raw);
    if (!Array.isArray(arr) || arr.length < n) {
      throw new Error(`Batch parse: expected at least ${n} questions, got ${Array.isArray(arr) ? arr.length : 0}`);
    }

    const validated = [];
    for (let i = 0; i < n; i++) {
      const item = validateQuestionItem(arr[i]);
      if (!item) throw new Error(`Batch item ${i + 1} failed validation`);
      validated.push(item);
    }

    const dbClient = await pool.connect();
    try {
      await dbClient.query("BEGIN");
      const rows = [];
      for (const item of validated) {
        const insert = await dbClient.query(
          `INSERT INTO questions (subject, chapter, difficulty, question_text, options, correct_answer, explanation)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, subject, chapter, difficulty, question_text, options, correct_answer, explanation`,
          [sub, ch, diff, item.question_text, JSON.stringify(item.options), item.correct_answer, item.explanation]
        );
        rows.push({ ...normalizeRow(insert.rows[0], item.options), _source: "groq_batch" });
      }
      await dbClient.query("COMMIT");
      return rows;
    } catch (e) {
      try {
        await dbClient.query("ROLLBACK");
      } catch {
        /* ignore */
      }
      throw e;
    } finally {
      dbClient.release();
    }
  };

  try {
    return await tryBatch();
  } catch {
    const rows = [];
    for (let i = 0; i < n; i++) {
      rows.push(await generateAndStoreQuestion(pool, { subject: sub, chapter: ch, difficulty: diff }));
    }
    return rows.map((r) => ({ ...r, _source: "groq_sequential_fallback" }));
  }
}

module.exports = { generateAndStoreQuestion, generateAndStoreQuestionsBatch };
