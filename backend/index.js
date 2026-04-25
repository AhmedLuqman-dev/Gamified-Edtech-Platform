const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

require("dotenv").config();

const pool = require("./db");
const generateExplanation = require("./ai/explanationEngine");
const { generateAndStoreQuestion, generateAndStoreQuestionsBatch } = require("./ai/questionGenerator");
const { buildSubjectQuestMap, getSubjectProgressSummary } = require("./subjectQuestMap");
const { SUBJECT_PATHS, listSubjectKeys, getSubjectPath } = require("./data/subjectPaths");

app.use(express.json());
app.use(cors());

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

/** Convert chapter IDs like "sci::cells" or "Refresher: sci::cells" to readable names */
const formatChapterName = (chapter) => {
  if (!chapter) return "Unknown";
  let name = chapter.replace(/^Refresher:\s*/i, "");
  // Remove subject prefix like "sci::", "hist::", "math::"
  name = name.replace(/^[a-z]+::/i, "");
  // Capitalize first letter
  return name.charAt(0).toUpperCase() + name.slice(1);
};

const signAuthToken = (user) =>
  jwt.sign(
    {
      id: user.id,
      role: user.role,
      school_id: user.school_id,
      username: user.username
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

const authRequired = (roles = []) => (req, res, next) => {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing auth token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (roles.length && !roles.includes(decoded.role)) {
      return res.status(403).json({ error: "Forbidden for this role" });
    }
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

const ensurePasswordColumn = async () => {
  const columnResult = await pool.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_name = 'user' AND column_name = 'password'
     LIMIT 1`
  );

  if (!columnResult.rows.length) {
    await pool.query(`ALTER TABLE "user" ADD COLUMN password TEXT`);
  }
};

const verifyStoredPassword = async (rawPassword, storedValue) => {
  if (!storedValue) return false;
  if (storedValue.startsWith("$2a$") || storedValue.startsWith("$2b$")) {
    return bcrypt.compare(rawPassword, storedValue);
  }
  return rawPassword === storedValue;
};

app.get("/auth/me", authRequired(), async (req, res) => {
  res.json({ user: req.user });
});

app.post("/auth/student/signup", async (req, res) => {
  try {
    const { username, password, school_id } = req.body;
    if (!username || !password || !school_id) {
      return res.status(400).json({ error: "username, password, school_id are required" });
    }

    await ensurePasswordColumn();

    const existing = await pool.query(`SELECT id FROM "user" WHERE username = $1 LIMIT 1`, [username]);
    if (existing.rows.length) return res.status(409).json({ error: "Username already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const created = await pool.query(
      `INSERT INTO "user" (username, role, school_id, password)
       VALUES ($1, 'student', $2, $3)
       RETURNING id, username, role, school_id`,
      [username, school_id, hashed]
    );

    const token = signAuthToken(created.rows[0]);
    res.status(201).json({ token, user: created.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/auth/student/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "username and password are required" });

    await ensurePasswordColumn();

    const userResult = await pool.query(
      `SELECT id, username, role, school_id, password FROM "user" WHERE username = $1 AND role = 'student' LIMIT 1`,
      [username]
    );
    if (!userResult.rows.length) return res.status(401).json({ error: "Invalid credentials" });

    const user = userResult.rows[0];
    const ok = await verifyStoredPassword(password, user.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = signAuthToken(user);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, school_id: user.school_id } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/auth/parent/signup", async (req, res) => {
  try {
    const { username, password, school_id, student_username, student_password } = req.body;
    if (!username || !password || !school_id || !student_username || !student_password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await ensurePasswordColumn();

    const studentResult = await pool.query(
      `SELECT id, username, role, school_id, password FROM "user" WHERE username = $1 AND role = 'student' LIMIT 1`,
      [student_username]
    );

    if (!studentResult.rows.length) {
      return res.status(404).json({ error: "Student not found for verification" });
    }

    const student = studentResult.rows[0];
    const validStudentPassword = await verifyStoredPassword(student_password, student.password);
    if (!validStudentPassword) {
      return res.status(401).json({ error: "Student verification failed (username/password mismatch)" });
    }

    if (Number(student.school_id) !== Number(school_id)) {
      return res.status(403).json({ error: "Parent and student must belong to same school_id" });
    }

    const existingParent = await pool.query(`SELECT id FROM "user" WHERE username = $1 LIMIT 1`, [username]);
    if (existingParent.rows.length) return res.status(409).json({ error: "Username already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const parentResult = await pool.query(
      `INSERT INTO "user" (username, role, school_id, password)
       VALUES ($1, 'parent', $2, $3)
       RETURNING id, username, role, school_id`,
      [username, school_id, hashed]
    );

    const parent = parentResult.rows[0];

    await pool.query(
      `INSERT INTO parent_student_link (parent_id, student_id) VALUES ($1, $2)`,
      [parent.id, student.id]
    );

    const token = signAuthToken(parent);
    res.status(201).json({ token, user: parent, linked_student: { id: student.id, username: student.username } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/auth/parent/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "username and password are required" });

    await ensurePasswordColumn();

    const userResult = await pool.query(
      `SELECT id, username, role, school_id, password FROM "user" WHERE username = $1 AND role = 'parent' LIMIT 1`,
      [username]
    );
    if (!userResult.rows.length) return res.status(401).json({ error: "Invalid credentials" });

    const user = userResult.rows[0];
    const ok = await verifyStoredPassword(password, user.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = signAuthToken(user);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, school_id: user.school_id } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/auth/teacher/signup", async (req, res) => {
  try {
    const { username, password, school_id } = req.body;
    if (!username || !password || !school_id) return res.status(400).json({ error: "username, password, school_id are required" });

    await ensurePasswordColumn();

    const check = await pool.query(`SELECT 1 FROM "user" WHERE username = $1 LIMIT 1`, [username]);
    if (check.rows.length) return res.status(400).json({ error: "Username taken" });

    const hashed = await bcrypt.hash(password, 10);
    const insert = await pool.query(
      `INSERT INTO "user" (username, role, school_id, password)
       VALUES ($1, 'teacher', $2, $3)
       RETURNING id, username, role, school_id`,
      [username, school_id, hashed]
    );

    const user = insert.rows[0];
    const token = signAuthToken(user);
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/auth/teacher/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "username and password are required" });

    await ensurePasswordColumn();

    const userResult = await pool.query(
      `SELECT id, username, role, school_id, password FROM "user" WHERE username = $1 AND role = 'teacher' LIMIT 1`,
      [username]
    );
    if (!userResult.rows.length) return res.status(401).json({ error: "Invalid credentials" });

    const user = userResult.rows[0];
    const ok = await verifyStoredPassword(password, user.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = signAuthToken(user);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, school_id: user.school_id } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/teacher/students", authRequired(["teacher"]), async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const studentsResult = await pool.query(
      `SELECT id, username FROM "user" WHERE role = 'student' AND school_id = $1`,
      [schoolId]
    );

    const students = studentsResult.rows;

    const studentIds = students.map(s => s.id);
    let statsResult = { rows: [] };
    let progressResult = { rows: [] };
    
    if (studentIds.length > 0) {
      statsResult = await pool.query(
        `SELECT user_id, xp FROM student_stats WHERE user_id = ANY($1::int[])`,
        [studentIds]
      );
      progressResult = await pool.query(
        `SELECT user_id, mastery_level, status FROM student_chapter_progress WHERE user_id = ANY($1::int[])`,
        [studentIds]
      );
    }

    const xpByUser = {};
    statsResult.rows.forEach(r => xpByUser[r.user_id] = r.xp);
    
    const progressByUser = {};
    progressResult.rows.forEach(r => {
      if (!progressByUser[r.user_id]) progressByUser[r.user_id] = [];
      progressByUser[r.user_id].push(r);
    });

    const detailedStudents = students.map(s => {
      const xp = xpByUser[s.id] || 0;
      const progressRows = progressByUser[s.id] || [];
      
      let strengths = 0;
      let weaknesses = 0;
      
      if (xp >= 200) strengths += 1;
      if (xp >= 500) strengths += 1;
      if (xp > 0 && xp < 50) weaknesses += 1;

      progressRows.forEach(row => {
          if (row.mastery_level >= 80) strengths++;
          if (row.mastery_level <= 50 && row.status !== 'locked') weaknesses++;
      });

      let profile = "average";
      if (strengths > weaknesses + 1) profile = "advanced";
      else if (weaknesses > strengths || (xp === 0 && progressRows.length === 0)) profile = "struggling";
      
      return {
        id: s.id,
        label: s.username,
        username: s.username,
        profile: profile
      };
    });

    res.json({ students: detailedStudents });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "user"');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("Backend is running ");
});


app.get("/student/:id/quest-map", authRequired(["student", "parent", "teacher"]), async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (req.user.role === "student" && Number(req.user.id) !== userId) {
      return res.status(403).json({ error: "Students can only access their own data" });
    }
    if (req.user.role === "parent") {
      const linkCheck = await pool.query(
        `SELECT 1 FROM parent_student_link WHERE parent_id = $1 AND student_id = $2 LIMIT 1`,
        [req.user.id, userId]
      );
      if (!linkCheck.rows.length) {
        return res.status(403).json({ error: "Parent is not linked to this student" });
      }
    }

    const [curriculumResult, statsResult, progressResult] = await Promise.all([
      pool.query(`SELECT * FROM curriculum ORDER BY order_index ASC`),
      pool.query(`SELECT * FROM student_stats WHERE user_id = $1 LIMIT 1`, [userId]),
      pool.query(`SELECT * FROM student_chapter_progress WHERE user_id = $1`, [userId])
    ]);

    const xp = statsResult.rows[0]?.xp || 0;
    const progressRows = progressResult.rows;

    let strengths = 0;
    let weaknesses = 0;

    if (xp >= 200) strengths += 1;
    if (xp >= 500) strengths += 1;
    if (xp > 0 && xp < 50) weaknesses += 1;

    progressRows.forEach(row => {
      if (row.mastery_level >= 80) strengths++;
      if (row.mastery_level <= 50 && row.status !== 'locked') weaknesses++;
    });

    let profile = "average";
    if (strengths > weaknesses + 1) profile = "advanced";
    else if (weaknesses > strengths || (xp === 0 && progressRows.length === 0)) profile = "struggling";

    const normCh = (s) => String(s ?? "").trim();
    const normStatus = (s) => String(s ?? "").trim().toLowerCase();
    const isStatusCompleted = (r) => r && (normStatus(r.status) === "completed" || normStatus(r.status) === "complete");
    const isStatusInProgress = (r) => r && normStatus(r.status) === "in_progress";

    const latestProgressByChapter = new Map();
    const sortedProgress = [...progressResult.rows].sort((a, b) => a.id - b.id);
    for (const r of sortedProgress) {
      const k = normCh(r.chapter);
      if (k) latestProgressByChapter.set(k, r);
    }

    const completedChapters = new Set();
    for (const r of latestProgressByChapter.values()) {
      if (isStatusCompleted(r)) {
        completedChapters.add(normCh(r.chapter));
      }
    }

    const sortedNodes = [...curriculumResult.rows].sort((a, b) => a.order_index - b.order_index);

    const prereqMet = (node) => {
      const p = node.prerequisite;
      if (p == null || String(p).trim() === "") return true;
      return completedChapters.has(normCh(p));
    };

    let activeQuestAssigned = false;
    const withStatus = sortedNodes.map((node) => {
      const progress = latestProgressByChapter.get(normCh(node.chapter));
      if (isStatusCompleted(progress)) {
        return { ...node, status: "DONE" };
      }
      if (isStatusInProgress(progress)) {
        activeQuestAssigned = true;
        return { ...node, status: "UNLOCKED" };
      }
      if (!prereqMet(node)) {
        return { ...node, status: "LOCKED" };
      }
      if (!activeQuestAssigned) {
        activeQuestAssigned = true;
        return { ...node, status: "UNLOCKED" };
      }
      return { ...node, status: "LOCKED" };
    });

    const doneCount = withStatus.filter((n) => n.status === "DONE").length;
    const activeQuest = withStatus.find((n) => n.status === "UNLOCKED") || null;

    res.json({
      student_profile: profile,
      total_xp: statsResult.rows[0]?.xp || 0,
      level: statsResult.rows[0]?.level || 1,
      completed_nodes: doneCount,
      total_nodes: withStatus.length,
      active_quest: activeQuest,
      curriculum: withStatus
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get("/questions/random", authRequired(["student", "parent", "teacher"]), async (req, res) => {
  try {
    const chapter = req.query.chapter != null ? String(req.query.chapter).trim() : "";
    const difficulty = req.query.difficulty != null ? String(req.query.difficulty).trim() : "";
    const subject = req.query.subject != null ? String(req.query.subject).trim() : "";

    const pick = async (sql, params) => {
      const r = await pool.query(sql, params);
      return r.rows[0] || null;
    };

    const baseSelect = `
      SELECT id, subject, chapter, difficulty, question_text, options, correct_answer, explanation
      FROM questions
    `;

    const attempts = [
      {
        name: "chapter+difficulty",
        run: () =>
          chapter && difficulty
            ? pick(
                `${baseSelect} WHERE TRIM(LOWER(chapter)) = TRIM(LOWER($1::text)) AND LOWER(difficulty) = LOWER($2) ORDER BY RANDOM() LIMIT 1`,
                [chapter, difficulty]
              )
            : null
      },
      {
        name: "chapter_only",
        run: () =>
          chapter
            ? pick(
                `${baseSelect} WHERE TRIM(LOWER(chapter)) = TRIM(LOWER($1::text)) ORDER BY RANDOM() LIMIT 1`,
                [chapter]
              )
            : null
      },
      {
        name: "chapter_ilike",
        run: () => {
          if (!chapter) return null;
          const safe = String(chapter).replace(/[%_]/g, " ");
          return pick(`${baseSelect} WHERE chapter ILIKE $1 ORDER BY RANDOM() LIMIT 1`, [`%${safe.trim()}%`]);
        }
      },
      {
        name: "subject+difficulty",
        run: () =>
          subject && difficulty
            ? pick(
                `${baseSelect} WHERE TRIM(LOWER(subject)) = TRIM(LOWER($1::text)) AND LOWER(difficulty) = LOWER($2) ORDER BY RANDOM() LIMIT 1`,
                [subject, difficulty]
              )
            : null
      },
      {
        name: "subject_only",
        run: () =>
          subject
            ? pick(
                `${baseSelect} WHERE TRIM(LOWER(subject)) = TRIM(LOWER($1::text)) ORDER BY RANDOM() LIMIT 1`,
                [subject]
              )
            : null
      },
      {
        name: "any",
        run: () => pick(`${baseSelect} ORDER BY RANDOM() LIMIT 1`, [])
      }
    ];

    let row = null;
    let used = "none";
    for (const a of attempts) {
      const candidate = await a.run();
      if (candidate) {
        row = candidate;
        used = a.name;
        break;
      }
    }

    if (!row) {
      return res.status(404).json({ error: "No questions in the bank. Seed the questions table." });
    }

    res.json({ ...row, _match: used });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



app.post("/questions/generate-batch", authRequired(["student"]), async (req, res) => {
  try {
    const { subject, chapter, difficulty, count } = req.body || {};
    if (!chapter) return res.status(400).json({ error: "chapter is required" });
    const n = count != null ? Number(count) : 5;

    // 1. Check DB first for existing questions (instant!)
    const dbResult = await pool.query(
      `SELECT id, subject, chapter, difficulty, question_text, options, correct_answer, explanation
       FROM questions
       WHERE chapter = $1
       ORDER BY RANDOM()
       LIMIT $2`,
      [chapter, n]
    );

    let questions = dbResult.rows.map(row => {
      let opts = row.options;
      if (typeof opts === "string") {
        try { opts = JSON.parse(opts); } catch { opts = []; }
      }
      return { ...row, options: opts, _source: "db_cached" };
    });

    // 2. If we have enough, serve immediately — no Groq call needed
    if (questions.length >= n) {
      return res.json({ questions: questions.slice(0, n) });
    }

    // 3. Not enough in DB — generate only the missing ones from Groq
    const needed = n - questions.length;
    try {
      const generated = await generateAndStoreQuestionsBatch(pool, {
        subject: subject || "General",
        chapter,
        difficulty: difficulty || "medium",
        count: needed
      });
      questions = questions.concat(generated);
    } catch (groqErr) {
      console.error("[generate-batch] Groq generation failed:", groqErr.message);
      // If we have at least 1 question from DB, serve what we have
      if (questions.length > 0) {
        return res.json({ questions });
      }
      const msg = groqErr.message || "Generation failed";
      return res.status(String(msg).includes("GROQ_KEY") ? 503 : 500).json({ error: msg });
    }

    res.json({ questions });
  } catch (err) {
    res.status(500).json({ error: err.message || "Batch generation failed" });
  }
});



app.get("/meta/subjects/:slug/topics", authRequired(["student", "parent", "teacher"]), (req, res) => {
  const def = getSubjectPath(req.params.slug);
  if (!def) return res.status(404).json({ error: "Unknown subject" });
  res.json({
    slug: def.slug,
    label: def.label,
    accent: def.accent,
    topicGraph: def.topicGraph,
    chapters: def.chapters.map((c) => ({
      chapter: c.chapter,
      label: c.unlock_message,
      order_index: c.order_index,
      difficulty: c.difficulty
    }))
  });
});

app.get("/student/:id/home-board", authRequired(["student", "parent"]), async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (req.user.role === "student" && Number(req.user.id) !== userId) {
      return res.status(403).json({ error: "Students can only access their own data" });
    }

    const schoolId = req.user.school_id;
    const [stats, progress, leaders] = await Promise.all([
      pool.query(`SELECT xp, level, streak, last_active FROM student_stats WHERE user_id = $1 LIMIT 1`, [userId]),
      pool.query(`SELECT id, chapter, status, mastery_level FROM student_chapter_progress WHERE user_id = $1`, [userId]),
      pool.query(
        `SELECT u.id, u.username, COALESCE(s.xp, 0) AS xp, COALESCE(s.level, 1) AS level
         FROM "user" u
         LEFT JOIN student_stats s ON s.user_id = u.id
         WHERE u.role = 'student' AND u.school_id = $1
         ORDER BY COALESCE(s.xp, 0) DESC, u.username ASC
         LIMIT 12`,
        [schoolId]
      )
    ]);

    const subject_progress = getSubjectProgressSummary(progress.rows);

    const rawStats = stats.rows[0] || { xp: 0, level: 1, streak: 0, last_active: null };
    const xp = rawStats.xp || 0;
    const computedLevel = Math.floor(xp / 150) + 1;
    const xpInCurrentLevel = xp % 150;
    const levelProgressPercent = Math.round((xpInCurrentLevel / 150) * 100);

    // Check streak freshness: if last_active is not today or yesterday, streak should show as 0
    let displayStreak = rawStats.streak || 0;
    if (rawStats.last_active) {
      const lastDate = new Date(rawStats.last_active);
      lastDate.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffDays = Math.round((today - lastDate) / (1000 * 60 * 60 * 24));
      if (diffDays > 1) displayStreak = 0;
    }

    res.json({
      stats: {
        xp,
        level: computedLevel,
        streak: displayStreak,
        last_active: rawStats.last_active,
        xp_for_next_level: 150,
        xp_in_current_level: xpInCurrentLevel,
        level_progress_percent: levelProgressPercent
      },
      subject_progress,
      leaderboard: leaders.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/student/:id/subject/:slug/quest-map", authRequired(["student", "parent", "teacher"]), async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (req.user.role === "student" && Number(req.user.id) !== userId) {
      return res.status(403).json({ error: "Students can only access their own data" });
    }
    if (req.user.role === "parent") {
      const linkCheck = await pool.query(
        `SELECT 1 FROM parent_student_link WHERE parent_id = $1 AND student_id = $2 LIMIT 1`,
        [req.user.id, userId]
      );
      if (!linkCheck.rows.length) {
        return res.status(403).json({ error: "Parent is not linked to this student" });
      }
    }

    const map = await buildSubjectQuestMap(pool, userId, req.params.slug);
    if (!map) return res.status(404).json({ error: "Unknown subject" });
    res.json(map);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/parent/:id/dashboard", authRequired(["parent"]), async (req, res) => {
    try {
        const parentId = req.params.id;
        if (Number(req.user.id) !== Number(parentId)) {
          return res.status(403).json({ error: "Parents can only access their own dashboard" });
        }
        const link = await pool.query(
        `SELECT * FROM parent_student_link WHERE parent_id = $1`,
        [parentId]
        );

        if (link.rows.length === 0) {
            return res.status(404).json({
                error: "No student linked to this parent"
            });
        }
        const studentId = link.rows[0].student_id;
        const student = await pool.query(
        `SELECT * FROM "user" WHERE id = $1`,
        [studentId]
        );

        /* ---------- Average Grade ---------- */
        const grades = await pool.query(
        `SELECT * FROM assignment_submission WHERE user_id = $1`,
        [studentId]
        );

        let total = 0;
        grades.rows.forEach(g => {
        total += g.percentage;
        });

        const average_grade = grades.rows.length
        ? total / grades.rows.length
        : 0;

        /* ---------- Attendance from daily_activity ---------- */
        let attendance_percent = 0;
        let total_active_days = 0;
        let total_days_since_start = 1;
        try {
            const activityResult = await pool.query(
              `SELECT COUNT(*) AS active_days,
                      MIN(activity_date) AS first_date,
                      MAX(activity_date) AS last_date
               FROM daily_activity WHERE user_id = $1`,
              [studentId]
            );
            const row = activityResult.rows[0];
            total_active_days = parseInt(row.active_days) || 0;
            if (row.first_date) {
              const firstDate = new Date(row.first_date);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              firstDate.setHours(0, 0, 0, 0);
              total_days_since_start = Math.max(1, Math.round((today - firstDate) / (1000 * 60 * 60 * 24)) + 1);
              attendance_percent = Math.round((total_active_days / total_days_since_start) * 100);
            }
        } catch (attErr) {
            console.error("Attendance query failed:", attErr.message);
        }

        /* ---------- Weak/Strong Topics (attempt-based) ---------- */
        let weak_topics = [];
        let strong_topics = [];
        try {
            const chapterProgress = await pool.query(
              `SELECT chapter, status, attempt_count FROM student_chapter_progress WHERE user_id = $1`,
              [studentId]
            );

            chapterProgress.rows.forEach(cp => {
                const attempts = cp.attempt_count || 1;
                const isCompleted = (cp.status || "").toLowerCase() === "completed" || (cp.status || "").toLowerCase() === "complete";
                const topicName = formatChapterName(cp.chapter);

                if (attempts > 1) {
                    // Multiple attempts = weak topic
                    weak_topics.push({ topic: topicName, attempts, completed: isCompleted });
                } else if (isCompleted) {
                    // Completed on first attempt = strong topic
                    strong_topics.push({ topic: topicName, attempts });
                }
            });
        } catch (_) {
            // Fallback to grade-based if student_chapter_progress doesn't have attempt_count
            grades.rows.forEach(g => {
                if (g.percentage <= 50) weak_topics.push({ topic: g.assignment_id, attempts: null });
                if (g.percentage >= 80) strong_topics.push({ topic: g.assignment_id, attempts: null });
            });
        }

        // Compute student_profile (struggling / average / advanced)
        let student_profile = "average";
        if (strong_topics.length > weak_topics.length + 2) {
            student_profile = "advanced";
        } else if (weak_topics.length > strong_topics.length) {
            student_profile = "struggling";
        }

        /* ---------- XP, Level, Streak ---------- */
        let studentStats = { xp: 0, level: 1, streak: 0 };
        try {
          const statsResult = await pool.query(
            `SELECT xp, level, streak, last_active FROM student_stats WHERE user_id = $1 LIMIT 1`,
            [studentId]
          );
          if (statsResult.rows.length) {
            const s = statsResult.rows[0];
            const xp = s.xp || 0;
            studentStats.xp = xp;
            studentStats.level = Math.floor(xp / 150) + 1;

            // Check streak freshness
            let displayStreak = s.streak || 0;
            if (s.last_active) {
              const lastDate = new Date(s.last_active);
              lastDate.setHours(0, 0, 0, 0);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const diffDays = Math.round((today - lastDate) / (1000 * 60 * 60 * 24));
              if (diffDays > 1) displayStreak = 0;
            }
            studentStats.streak = displayStreak;
          }
        } catch (_) {}

        /* ---------- Trend & Risk (handle no-data gracefully) ---------- */
        const hasGradeData = grades.rows.length > 0;
        const hasActivityData = total_active_days > 0;

        // Use XP-based progress when no assignment_submission data
        let effectiveGrade = average_grade;
        if (!hasGradeData && studentStats.xp > 0) {
          // Student has been active (has XP) but no formal grades yet
          // Estimate based on chapter completion ratio
          const completedTopics = strong_topics.length;
          const totalAttempted = weak_topics.length + strong_topics.length;
          effectiveGrade = totalAttempted > 0 ? (completedTopics / totalAttempted) * 100 : 60;
        }

        let effectiveAttendance = attendance_percent;
        if (!hasActivityData && studentStats.streak > 0) {
          // Student has a streak but daily_activity is empty (legacy data)
          effectiveAttendance = 50; // Give benefit of doubt
        }

        let trend = "stable";
        if (!hasGradeData && !hasActivityData) {
          trend = studentStats.xp > 0 ? "stable" : "no data";
        } else if (effectiveGrade > 70) {
          trend = "improving";
        } else if (effectiveGrade < 50) {
          trend = "declining";
        }
    
        function calculateRisk(grade, attendance) {
            // If no real data, don't flag as critical
            if (!hasGradeData && !hasActivityData) {
              return studentStats.xp > 0 ? "SAFE" : "NO DATA";
            }

            let score = 0;

            if (grade < 40) score += 50;
            else if (grade < 60) score += 30;
            else score += 10;

            if (attendance < 40) score += 40;
            else if (attendance < 70) score += 20;
            else score += 5;

            if (score >= 70) return "CRITICAL";
            if (score >= 40) return "WARNING";
            return "SAFE";
        }

        const risk_level = calculateRisk(effectiveGrade, effectiveAttendance);

        res.json({
            child: student.rows[0].username,
            average_grade,
            attendance: attendance_percent,
            total_active_days,
            total_days_since_start,
            weak_topics,
            strong_topics,
            trend,
            risk_level,
            student_profile,
            student_stats: studentStats
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/parent/:id/history", authRequired(["parent"]), async (req, res) => {
  try {
    const parentId = req.params.id;
    if (Number(req.user.id) !== Number(parentId)) {
      return res.status(403).json({ error: "Parents can only access their own history" });
    }

    const link = await pool.query(
      `SELECT * FROM parent_student_link WHERE parent_id = $1`,
      [parentId]
    );
    if (!link.rows.length) {
      return res.status(404).json({ error: "No student linked to this parent" });
    }

    const studentId = link.rows[0].student_id;

    // Get daily activity history (actual problem-solving days)
    let activityHistory = [];
    try {
      const actResult = await pool.query(
        `SELECT activity_date, 'PRESENT' AS status
         FROM daily_activity
         WHERE user_id = $1
         ORDER BY activity_date ASC`,
        [studentId]
      );
      activityHistory = actResult.rows.map(r => ({
        date: r.activity_date,
        status: r.status,
        topic: 'Problem solving'
      }));
    } catch (e) {
      console.error("Activity history query failed:", e.message);
    }

    // Fallback: also try legacy attendance table
    if (activityHistory.length === 0) {
      try {
        const legacyResult = await pool.query(
          `SELECT cs.date, cs.topic, a.status
           FROM attendance a
           JOIN class_session cs ON cs.id = a.session_id
           WHERE a.student_id = $1
           ORDER BY cs.date ASC`,
          [studentId]
        );
        activityHistory = legacyResult.rows;
      } catch (_) {}
    }

    // Get grade history
    let gradeHistory = [];
    try {
      const gradeResult = await pool.query(
        `SELECT s.id, s.percentage, a.title
         FROM assignment_submission s
         JOIN assignment a ON a.id = s.assignment_id
         WHERE s.user_id = $1
         ORDER BY s.id ASC`,
        [studentId]
      );
      gradeHistory = gradeResult.rows;
    } catch (_) {}

    // Get chapter progress as grade-like data (fallback when no assignment_submissions)
    if (gradeHistory.length === 0) {
      try {
        const progressResult = await pool.query(
          `SELECT chapter, status, mastery_level, attempt_count
           FROM student_chapter_progress
           WHERE user_id = $1
           ORDER BY id ASC`,
          [studentId]
        );
        gradeHistory = progressResult.rows.map((r, i) => ({
          id: i + 1,
          title: formatChapterName(r.chapter),
          percentage: r.mastery_level || 0
        }));
      } catch (_) {}
    }

    res.json({
      attendance_history: activityHistory,
      grade_history: gradeHistory
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/check-answer", authRequired(["student", "parent", "teacher"]), async (req, res) => {
  try {
    const { question_id, selected_option, user_id, quest_xp = 0, chapter } = req.body;
    if (req.user.role !== "student" || Number(req.user.id) !== Number(user_id)) {
      return res.status(403).json({ error: "Only the owning student can submit answers" });
    }

    const question = await pool.query(
      `SELECT * FROM questions WHERE id = $1`,
      [question_id]
    );

    if (!question.rows.length) {
      return res.status(404).json({ error: "Question not found" });
    }

    const correct = question.rows[0].correct_answer;
    let isCorrect = selected_option === correct;

    /* ---------- Track attempt_count per chapter (for weak/strong topics) ---------- */
    // Only mark chapter as 'completed' on the FINAL correct answer (quest_xp > 0).
    // Intermediate Groq rounds send quest_xp=0, so they only bump attempt_count.
    const isFinalCorrect = isCorrect && quest_xp > 0;

    if (chapter) {
      const existingProgress = await pool.query(
        `SELECT id, mastery_level, attempt_count, status FROM student_chapter_progress WHERE user_id = $1 AND chapter = $2 LIMIT 1`,
        [user_id, chapter]
      );

      if (existingProgress.rows.length) {
        const row = existingProgress.rows[0];
        const newAttempts = (row.attempt_count || 0) + 1;
        if (isFinalCorrect) {
          await pool.query(
            `UPDATE student_chapter_progress
             SET status = 'completed', mastery_level = GREATEST(COALESCE(mastery_level, 0), 80), attempt_count = $3
             WHERE user_id = $1 AND chapter = $2`,
            [user_id, chapter, newAttempts]
          );
        } else {
          await pool.query(
            `UPDATE student_chapter_progress
             SET attempt_count = $3
             WHERE user_id = $1 AND chapter = $2`,
            [user_id, chapter, newAttempts]
          );
        }
      } else {
        if (isFinalCorrect) {
          await pool.query(
            `INSERT INTO student_chapter_progress (user_id, chapter, status, mastery_level, attempt_count)
             VALUES ($1, $2, 'completed', 80, 1)`,
            [user_id, chapter]
          );
        } else {
          await pool.query(
            `INSERT INTO student_chapter_progress (user_id, chapter, status, mastery_level, attempt_count)
             VALUES ($1, $2, 'unlocked', 0, 1)`,
            [user_id, chapter]
          );
        }
      }
    }

    /* ---------- Log daily attendance for ANY attempt (for parent dashboard) ---------- */
    try {
      // Check if record already exists for today
      const existingActivity = await pool.query(
        `SELECT id FROM daily_activity WHERE user_id = $1 AND activity_date = CURRENT_DATE LIMIT 1`,
        [user_id]
      );
      if (!existingActivity.rows.length) {
        await pool.query(
          `INSERT INTO daily_activity (user_id, activity_date) VALUES ($1, CURRENT_DATE)`,
          [user_id]
        );
      }
    } catch (dailyErr) {
      console.error("daily_activity insert failed:", dailyErr.message);
    }

    if (!isCorrect) {
      const refresher = await pool.query(
        `INSERT INTO curriculum 
        (chapter, prerequisite, xp, difficulty, type, unlock_message, is_optional, order_index)
        VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          "Refresher: " + question.rows[0].chapter,
          null,
          30,
          "easy",
          "challenge",
          " Let's fix your weak area!",
          true,
          999
        ]
      );

      return res.json({
        correct: false,
        message: "Refresher quest added",
        newQuest: refresher.rows[0]
      });
    }

    /* ---------- XP, Level, and Streak calculation ---------- */
    const existingStats = await pool.query(
      `SELECT id, xp, streak, last_active FROM student_stats WHERE user_id = $1 LIMIT 1`,
      [user_id]
    );

    let newXp = quest_xp;
    let newStreak = 1;
    let newLevel = 1;

    if (existingStats.rows.length) {
      const row = existingStats.rows[0];
      newXp = (row.xp || 0) + quest_xp;
      newLevel = Math.floor(newXp / 150) + 1;

      // Streak logic: if last_active is today, keep streak; if yesterday, +1; else reset to 1
      const lastActive = row.last_active ? new Date(row.last_active) : null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (lastActive) {
        const lastDate = new Date(lastActive);
        lastDate.setHours(0, 0, 0, 0);
        const diffDays = Math.round((today - lastDate) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
          // Same day — streak stays
          newStreak = row.streak || 1;
        } else if (diffDays === 1) {
          // Yesterday — increment streak
          newStreak = (row.streak || 0) + 1;
        } else {
          // Missed day(s) — reset streak
          newStreak = 1;
        }
      }

      await pool.query(
        `UPDATE student_stats
         SET xp = $1, level = $2, streak = $3, last_active = CURRENT_DATE
         WHERE user_id = $4`,
        [newXp, newLevel, newStreak, user_id]
      );
    } else {
      newXp = quest_xp;
      newLevel = Math.floor(newXp / 150) + 1;
      newStreak = 1;
      await pool.query(
        `INSERT INTO student_stats (user_id, xp, level, streak, last_active)
         VALUES ($1, $2, $3, $4, CURRENT_DATE)`,
        [user_id, newXp, newLevel, newStreak]
      );
    }

    res.json({
      correct: true,
      message: "Good job! Quest cleared",
      xp_awarded: quest_xp,
      new_xp: newXp,
      new_level: newLevel,
      new_streak: newStreak
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/ai/explain", async (req, res) => {
  try {
    const { user_id, question, question_id, selected_answer } = req.body;

    // If question_id is provided but question object is not, look it up from DB
    let questionData = question;
    if (!questionData && question_id) {
      const qResult = await pool.query(`SELECT * FROM questions WHERE id = $1`, [question_id]);
      if (qResult.rows.length) {
        questionData = qResult.rows[0];
      }
    }

    if (!questionData) {
      return res.status(400).json({ error: "Question data or valid question_id is required" });
    }

    const result = await generateExplanation(
      user_id,
      questionData,
      selected_answer
    );

    res.json(result);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------- Auto-migrations ---------- */
const runMigrations = async () => {
  try {
    // Ensure daily_activity table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS daily_activity (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
        UNIQUE(user_id, activity_date)
      )
    `);

    // Add UNIQUE constraint if missing (table may exist from previous setup without it)
    const uniqueCheck = await pool.query(`
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'daily_activity'::regclass
        AND contype = 'u'
      LIMIT 1
    `);
    if (!uniqueCheck.rows.length) {
      console.log("Adding missing UNIQUE constraint to daily_activity...");
      await pool.query(`
        ALTER TABLE daily_activity
        ADD CONSTRAINT daily_activity_user_date_unique UNIQUE (user_id, activity_date)
      `);
    }

    // Add attempt_count column to student_chapter_progress if missing
    const colCheck = await pool.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'student_chapter_progress' AND column_name = 'attempt_count'
      LIMIT 1
    `);
    if (!colCheck.rows.length) {
      await pool.query(`ALTER TABLE student_chapter_progress ADD COLUMN attempt_count INTEGER DEFAULT 0`);
    }

    console.log("Migrations completed successfully");
  } catch (err) {
    console.error("Migration warning:", err.message);
  }
};

runMigrations().then(() => {
  app.listen(process.env.PORT, () => {
    // console.log("Server running on port " + process.env.PORT);
  });
});