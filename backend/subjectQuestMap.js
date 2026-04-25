const { getSubjectPath, listSubjectKeys } = require("./data/subjectPaths");

const normCh = (s) => String(s ?? "").trim();
const normStatus = (s) => String(s ?? "").trim().toLowerCase();
const isStatusCompleted = (r) => r && (normStatus(r.status) === "completed" || normStatus(r.status) === "complete");
const isStatusInProgress = (r) => r && normStatus(r.status) === "in_progress";

/**
 * Quest map for a single subject path (chapters from subjectPaths.js + DB progress).
 */
async function buildSubjectQuestMap(pool, userId, slug) {
  const def = getSubjectPath(slug);
  if (!def) return null;

  const [statsResult, progressResult] = await Promise.all([
    pool.query(`SELECT * FROM student_stats WHERE user_id = $1 LIMIT 1`, [userId]),
    pool.query(`SELECT * FROM student_chapter_progress WHERE user_id = $1`, [userId])
  ]);

  const latestProgressByChapter = new Map();
  const sortedProgress = [...progressResult.rows].sort((a, b) => a.id - b.id);
  for (const r of sortedProgress) {
    const k = normCh(r.chapter);
    if (k) latestProgressByChapter.set(k, r);
  }

  const completedChapters = new Set();
  for (const r of latestProgressByChapter.values()) {
    if (isStatusCompleted(r)) completedChapters.add(normCh(r.chapter));
  }

  const sortedNodes = [...def.chapters].sort((a, b) => a.order_index - b.order_index);

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

  return {
    subject: def.label,
    slug: def.slug,
    student_profile: "average",
    total_xp: statsResult.rows[0]?.xp || 0,
    level: statsResult.rows[0]?.level || 1,
    completed_nodes: doneCount,
    total_nodes: withStatus.length,
    active_quest: activeQuest,
    curriculum: withStatus
  };
}

function getSubjectProgressSummary(progressRows) {
  const latestProgressByChapter = new Map();
  const sortedProgress = [...progressRows].sort((a, b) => a.id - b.id);
  for (const r of sortedProgress) {
    const k = normCh(r.chapter);
    if (k) latestProgressByChapter.set(k, r);
  }

  return listSubjectKeys().map((slug) => {
    const def = getSubjectPath(slug);
    const total = def.chapters.length;
    let completed = 0;
    for (const c of def.chapters) {
      const p = latestProgressByChapter.get(normCh(c.chapter));
      if (isStatusCompleted(p)) completed += 1;
    }
    const percent = total ? Math.round((completed / total) * 100) : 0;
    return {
      slug: def.slug,
      label: def.label,
      accent: def.accent,
      completed,
      total,
      percent
    };
  });
}

module.exports = { buildSubjectQuestMap, getSubjectProgressSummary };
