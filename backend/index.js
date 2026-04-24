const express = require("express");
const app = express();

require("dotenv").config();

const pool = require("./db");
const generateExplanation = require("./ai/explanationEngine");

app.use(express.json());


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

app.get("/student/:id/recommendation", async (req, res) => {
  try {
    const userId = req.params.id;


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

app.get("/parent/:id/dashboard", async (req, res) => {
    try {
        const parentId = req.params.id;
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
            risk_level
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/check-answer", async (req, res) => {
  try {
    const { question_id, selected_option, user_id } = req.body;

    const question = await pool.query(
      `SELECT * FROM questions WHERE id = $1`,
      [question_id]
    );

    const correct = question.rows[0].correct_option;

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

    res.json({
      correct: true,
      message: "Good job! Quest cleared "
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/ai/explain", async (req, res) => {
  try {

    const { user_id, question, selected_answer } = req.body;

    const result = await generateExplanation(
      user_id,
      question,
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