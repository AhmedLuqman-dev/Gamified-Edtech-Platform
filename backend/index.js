const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

require("dotenv").config();

const pool = require("./db");
const generateExplanation = require("./ai/explanationEngine");

app.use(express.json());
app.use(cors());

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const ADMIN_USERNAMES = (process.env.ADMIN_USERNAMES || "admin")
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const isAdminUser = (user) => ADMIN_USERNAMES.includes(user?.username);

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

app.post("/auth/admin/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "username and password are required" });
    if (!ADMIN_USERNAMES.includes(username) || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: "Invalid admin credentials" });
    }

    const adminUser = { id: 0, username, role: "admin", school_id: null };
    const token = signAuthToken(adminUser);
    res.json({ token, user: adminUser });
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

app.get("/student/:id/recommendation", authRequired(["student", "parent"]), async (req, res) => {
  try {
    const userId = req.params.id;
    if (req.user.role === "student" && Number(req.user.id) !== Number(userId)) {
      return res.status(403).json({ error: "Students can only access their own data" });
    }


    const submissions = await pool.query(`
        SELECT s.*, a.title
        FROM assignment_submission s
        JOIN assignment a ON s.assignment_id = a.id
        WHERE s.user_id = $1
        `, [userId]);

    let strengths = [];
    let weaknesses = [];

    submissions.rows.forEach((row) => {
    const chapter = row.title;

    if (row.percentage >= 80) {
        strengths.push(chapter);
    } else if (row.percentage <= 50) {
        weaknesses.push(chapter);
    }
    });

    const curriculum = await pool.query(
      `SELECT * FROM curriculum ORDER BY order_index`
    );

    let bestNode = null;
    let bestScore = -1;

    const curriculumRows = curriculum.rows;

    function isUnlocked(node) {
    if (!node.prerequisite) return true;
    return strengths.includes(node.prerequisite);
    }

    let profile = "average";

    if (strengths.length > weaknesses.length + 2) {
        profile = "advanced";
    } else if (weaknesses.length > strengths.length) {
        profile = "struggling";
    }

    for (let node of curriculumRows) {

    if (!isUnlocked(node)) continue;

    let score = 0;

    const isWeak = weaknesses.some(w => w.includes(node.chapter));
    const isStrong = strengths.some(s => s.includes(node.chapter));

    if (isWeak) score += 50;
    if (isStrong) score -= 30;

    score += node.xp || 0;

    if (node.difficulty === "easy") score += 10;
    if (node.difficulty === "hard") score += 30;

    if (profile === "struggling" && node.difficulty === "easy") {
        score += 20;
    }

    if (profile === "advanced" && node.difficulty === "hard") {
        score += 40;
    }

    if (score > bestScore) {
        bestScore = score;
        bestNode = node;
    }
    }

    let recommendation = bestNode ? bestNode.chapter : curriculumRows[0].chapter;

    // res.json({
    //     strengths,
    //     weaknesses,
    //     recommendation,
    //     xp_reward: bestNode?.xp,
    //     difficulty: bestNode?.difficulty,
    //     story: bestNode?.unlock_message,
    //     type: bestNode?.type,
    //     student_profile: profile
    // });
    res.json({
        strengths,
        weaknesses,
        recommendation,
        xp_reward: bestNode?.xp,
        difficulty: bestNode?.difficulty,
        story: bestNode?.unlock_message,
        type: bestNode?.type,
        student_profile: profile,
        debug: {
            bestScore,
            selectedNode: bestNode?.chapter
        }
});
    

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/student/:id/quest-map", authRequired(["student", "parent", "admin"]), async (req, res) => {
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

    const [recommendationResult, curriculumResult, statsResult, progressResult] = await Promise.all([
      pool.query(`
        SELECT s.percentage, a.title
        FROM assignment_submission s
        JOIN assignment a ON s.assignment_id = a.id
        WHERE s.user_id = $1
      `, [userId]),
      pool.query(`SELECT * FROM curriculum ORDER BY order_index ASC`),
      pool.query(`SELECT * FROM student_stats WHERE user_id = $1 LIMIT 1`, [userId]),
      pool.query(`SELECT * FROM student_chapter_progress WHERE user_id = $1`, [userId])
    ]);

    const strengths = [];
    const weaknesses = [];

    recommendationResult.rows.forEach((row) => {
      const chapter = row.title;
      if (row.percentage >= 80) strengths.push(chapter);
      if (row.percentage <= 50) weaknesses.push(chapter);
    });

    let profile = "average";
    if (strengths.length > weaknesses.length + 2) profile = "advanced";
    else if (weaknesses.length > strengths.length) profile = "struggling";

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

app.get("/student/:id/overview", authRequired(["student", "parent"]), async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (req.user.role === "student" && Number(req.user.id) !== userId) {
      return res.status(403).json({ error: "Students can only access their own data" });
    }

    const [stats, submissions] = await Promise.all([
      pool.query(`SELECT * FROM student_stats WHERE user_id = $1 LIMIT 1`, [userId]),
      pool.query(
        `SELECT s.id, s.score, s.total, s.percentage, a.title
         FROM assignment_submission s
         JOIN assignment a ON a.id = s.assignment_id
         WHERE s.user_id = $1
         ORDER BY s.id DESC`,
        [userId]
      )
    ]);

    res.json({
      stats: stats.rows[0] || { xp: 0, level: 1, streak: 0 },
      submissions: submissions.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/questions/random", authRequired(["student", "parent", "admin"]), async (req, res) => {
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

        const studentId = link.rows[0].student_id;
        if (link.rows.length === 0) {
            return res.status(404).json({
                error: "No student linked to this parent"
            });
        }
        const student = await pool.query(
        `SELECT * FROM "user" WHERE id = $1`,
        [studentId]
        );

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

        const attendance = await pool.query(
        `SELECT * FROM attendance WHERE student_id = $1`,
        [studentId]
        );

        let present = 0;

        attendance.rows.forEach(a => {
        if (a.status === "PRESENT" || a.status === "LATE") {
            present++;
        }
        });

        const attendance_percent = attendance.rows.length ? (present / attendance.rows.length) * 100: 0;

        let weak_topics = [];
        let strong_topics = [];

        grades.rows.forEach(g => {
            if (g.percentage <= 50) weak_topics.push(g.assignment_id);
            if (g.percentage >= 80) strong_topics.push(g.assignment_id);
        });

        // Compute student_profile (struggling / average / advanced)
        let student_profile = "average";
        if (strong_topics.length > weak_topics.length + 2) {
            student_profile = "advanced";
        } else if (weak_topics.length > strong_topics.length) {
            student_profile = "struggling";
        }

        let trend = "stable";
        if (average_grade > 70) trend = "improving";
        else if (average_grade < 50) trend = "declining";
    
        function calculateRisk(grade, attendance) {
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

        const risk_level = calculateRisk(average_grade, attendance_percent);

        res.json({
            child: student.rows[0].username,
            average_grade,
            attendance: attendance_percent,
            weak_topics,
            strong_topics,
            trend,
            risk_level,
            student_profile
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

    const [attendanceHistory, gradeHistory] = await Promise.all([
      pool.query(
        `SELECT cs.date, cs.topic, a.status
         FROM attendance a
         JOIN class_session cs ON cs.id = a.session_id
         WHERE a.student_id = $1
         ORDER BY cs.date ASC`,
        [studentId]
      ),
      pool.query(
        `SELECT s.id, s.percentage, a.title
         FROM assignment_submission s
         JOIN assignment a ON a.id = s.assignment_id
         WHERE s.user_id = $1
         ORDER BY s.id ASC`,
        [studentId]
      )
    ]);

    res.json({
      attendance_history: attendanceHistory.rows,
      grade_history: gradeHistory.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/check-answer", authRequired(["student", "parent", "admin"]), async (req, res) => {
  try {
    const { question_id, selected_option, user_id, quest_xp = 0, chapter } = req.body;
    if (!isAdminUser(req.user)) {
      if (req.user.role !== "student" || Number(req.user.id) !== Number(user_id)) {
        return res.status(403).json({ error: "Only the owning student can submit answers" });
      }
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

    const existingStats = await pool.query(
      `SELECT id, xp FROM student_stats WHERE user_id = $1 LIMIT 1`,
      [user_id]
    );

    if (existingStats.rows.length) {
      await pool.query(
        `UPDATE student_stats
         SET xp = COALESCE(xp, 0) + $1, last_active = CURRENT_DATE
         WHERE user_id = $2`,
        [quest_xp, user_id]
      );
    } else {
      await pool.query(
        `INSERT INTO student_stats (user_id, xp, level, streak, last_active)
         VALUES ($1, $2, 1, 0, CURRENT_DATE)`,
        [user_id, quest_xp]
      );
    }

    if (chapter) {
      const existingProgress = await pool.query(
        `SELECT id, mastery_level FROM student_chapter_progress WHERE user_id = $1 AND chapter = $2 LIMIT 1`,
        [user_id, chapter]
      );

      if (existingProgress.rows.length) {
        await pool.query(
          `UPDATE student_chapter_progress
           SET status = 'completed', mastery_level = GREATEST(COALESCE(mastery_level, 0), 80)
           WHERE user_id = $1 AND chapter = $2`,
          [user_id, chapter]
        );
      } else {
        await pool.query(
          `INSERT INTO student_chapter_progress (user_id, chapter, status, mastery_level)
           VALUES ($1, $2, 'completed', 80)`,
          [user_id, chapter]
        );
      }
    }

    res.json({
      correct: true,
      message: "Good job! Quest cleared",
      xp_awarded: quest_xp
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

app.listen(process.env.PORT, () => {
//   console.log("Server running on port " + process.env.PORT);
});