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

  // Check that all options are distinct
  const uniqueOptions = new Set(options.map(o => o.trim().toLowerCase()));
  if (uniqueOptions.size !== 4) return null;

  // Check that question_text is not empty
  if (parsed.question_text.trim().length < 5) return null;

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

const QUESTION_SYSTEM_PROMPT = `You are a quiz question writer for a school education platform. You create factually accurate multiple-choice questions.

CRITICAL RULES FOR ACCURACY:
1. Every correct_answer MUST be mathematically/factually verified. Double-check all calculations.
2. For math questions: solve the problem step-by-step in your head BEFORE writing the answer. Verify the answer is correct.
3. For science/history questions: only use well-established facts. Do not make up dates, formulas, or facts.
4. The 3 wrong options (distractors) must be plausible but clearly WRONG. They should represent common mistakes students make.
5. The correct_answer string must EXACTLY match one of the 4 options, character-for-character.
6. Output ONLY valid JSON, no markdown fences, no extra text.

EXAMPLES OF COMMON MISTAKES TO AVOID:
- Math: 3(2x - 1) = 6x - 3, NOT 6x - 2 or 6x - 1. Always distribute correctly.
- Math: When solving 2x + 5 = 11, x = 3, NOT x = 4.
- Science: Water boils at 100°C at sea level, NOT 90°C.
- Always verify arithmetic: multiplication, division, signs (+/-).`;

async function generateOneQuestionFromGroq(client, sub, ch, diff, attempt = 0) {
  const userPrompt = `Create ONE multiple-choice question for middle-school / early high-school students.

Subject: ${sub}
Topic / chapter focus: ${ch}
Difficulty: ${diff}

IMPORTANT: Before finalizing, mentally verify that your correct_answer is actually correct. If it's a math problem, solve it step-by-step and double check signs, arithmetic, and the final value.

Return ONLY a JSON object with this exact shape:
{
  "question_text": "one clear question",
  "options": ["exactly four distinct answer strings"],
  "correct_answer": "must exactly match one option string",
  "explanation": "brief explanation of WHY this answer is correct, showing the key step"
}

Rules:
- Output ONLY the JSON object, nothing else.
- options must be exactly 4 strings, plausible distractors, no "all of the above".
- correct_answer must === one option string character-for-character.
- The correct_answer MUST be factually/mathematically correct. Verify before responding.`;

  try {
    const reqParams = {
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: QUESTION_SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 600
    };

    // Try with response_format first, fall back without it
    let completion;
    try {
      completion = await client.chat.completions.create({
        ...reqParams,
        response_format: { type: "json_object" }
      });
    } catch (fmtErr) {
      // response_format might not be supported — retry without it
      console.error("[QuestionGen] response_format failed, retrying without:", fmtErr.message);
      completion = await client.chat.completions.create(reqParams);
    }

    const raw = completion.choices[0]?.message?.content || "";
    const parsed = extractJsonObject(raw);
    const item = validateQuestionItem(parsed);
    if (!item) {
      console.error(`[QuestionGen] Parse failed (attempt ${attempt + 1}/3). Raw:`, raw.substring(0, 500));
      if (attempt < 2) {
        return generateOneQuestionFromGroq(client, sub, ch, diff, attempt + 1);
      }
      throw new Error("Model did not return parseable question JSON after 3 attempts");
    }
    return item;
  } catch (err) {
    if (attempt < 2 && !err.message.includes("after 3 attempts")) {
      console.error(`[QuestionGen] API error (attempt ${attempt + 1}/3):`, err.message);
      // Wait a bit before retry (rate limiting)
      await new Promise(r => setTimeout(r, 1000));
      return generateOneQuestionFromGroq(client, sub, ch, diff, attempt + 1);
    }
    throw err;
  }
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
    const userPrompt = `Create ${n} multiple-choice questions for middle-school / early high-school students.

Subject: ${sub}
Topic / chapter focus: ${ch}
Difficulty: ${diff}

IMPORTANT: For EVERY question, mentally verify your correct_answer is actually correct before including it. If it's math, solve step-by-step and check signs and arithmetic. If it's a fact, make sure it's accurate.

Return ONLY valid JSON with this exact shape:
{
  "questions": [
    {
      "question_text": "string",
      "options": ["four distinct answer strings"],
      "correct_answer": "must exactly match one string in options",
      "explanation": "brief explanation showing WHY this is the correct answer"
    }
  ]
}

Rules:
- The "questions" array MUST contain exactly ${n} items.
- Each item: exactly 4 options, plausible distractors, no "all of the above".
- Questions must be distinct from each other (different angles or sub-skills within the topic).
- correct_answer must match one option character-for-character.
- Every correct_answer MUST be factually/mathematically verified. Double-check all calculations and signs.`;

    const reqParams = {
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: QUESTION_SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: Math.min(8000, 400 + n * 450)
    };

    let completion;
    try {
      completion = await client.chat.completions.create({
        ...reqParams,
        response_format: { type: "json_object" }
      });
    } catch (fmtErr) {
      console.error("[QuestionGen Batch] response_format failed, retrying without:", fmtErr.message);
      completion = await client.chat.completions.create(reqParams);
    }

    const raw = completion.choices[0]?.message?.content || "";
    const arr = extractQuestionsArray(raw);
    if (!Array.isArray(arr) || arr.length < n) {
      console.error("[QuestionGen Batch] Parse failed. Expected", n, "got", Array.isArray(arr) ? arr.length : 0, "Raw:", raw.substring(0, 500));
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
