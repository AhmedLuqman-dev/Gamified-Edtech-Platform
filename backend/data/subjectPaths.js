/**
 * Per-subject quest chapters (stored in student_chapter_progress.chapter)
 * and topic DAG for InterviewBit-style visualization.
 */

const baseMeta = (slug, label, accent) => ({ slug, label, accent });

const science = {
  ...baseMeta("science", "Science", "#22d3ee"),
  chapters: [
    {
      chapter: "sci::foundations",
      prerequisite: "",
      xp: 40,
      difficulty: "easy",
      type: "lesson",
      unlock_message: "Lab unlock: scientific method & measurement.",
      order_index: 1,
      subject: "Science"
    },
    {
      chapter: "sci::cells",
      prerequisite: "sci::foundations",
      xp: 55,
      difficulty: "easy",
      type: "lesson",
      unlock_message: "Cell structure — your first boss node.",
      order_index: 2,
      subject: "Science"
    },
    {
      chapter: "sci::energy",
      prerequisite: "sci::cells",
      xp: 60,
      difficulty: "medium",
      type: "lesson",
      unlock_message: "Energy & waves power-up branch.",
      order_index: 3,
      subject: "Science"
    },
    {
      chapter: "sci::genetics",
      prerequisite: "sci::cells",
      xp: 70,
      difficulty: "hard",
      type: "challenge",
      unlock_message: "Genetics side quest (optional path).",
      order_index: 4,
      subject: "Science",
      is_optional: true
    },
    {
      chapter: "sci::capstone",
      prerequisite: "sci::energy",
      xp: 100,
      difficulty: "hard",
      type: "boss",
      unlock_message: "Capstone: mixed science duel.",
      order_index: 5,
      subject: "Science"
    }
  ],
  topicGraph: {
    nodes: [
      { id: "sci::foundations", label: "Method", x: 50, y: 8 },
      { id: "sci::cells", label: "Cells", x: 30, y: 32 },
      { id: "sci::energy", label: "Energy", x: 70, y: 32 },
      { id: "sci::genetics", label: "Genetics", x: 18, y: 58 },
      { id: "sci::capstone", label: "Boss", x: 50, y: 82 }
    ],
    edges: [
      { from: "sci::foundations", to: "sci::cells" },
      { from: "sci::foundations", to: "sci::energy" },
      { from: "sci::cells", to: "sci::genetics" },
      { from: "sci::cells", to: "sci::energy" },
      { from: "sci::energy", to: "sci::capstone" }
    ]
  }
};

const history = {
  ...baseMeta("history", "History", "#fb923c"),
  chapters: [
    {
      chapter: "hist::sources",
      prerequisite: "",
      xp: 40,
      difficulty: "easy",
      type: "lesson",
      unlock_message: "Sources & timelines — map the realm.",
      order_index: 1,
      subject: "History"
    },
    {
      chapter: "hist::ancient",
      prerequisite: "hist::sources",
      xp: 55,
      difficulty: "easy",
      type: "lesson",
      unlock_message: "Ancient civilizations arc.",
      order_index: 2,
      subject: "History"
    },
    {
      chapter: "hist::medieval",
      prerequisite: "hist::ancient",
      xp: 60,
      difficulty: "medium",
      type: "lesson",
      unlock_message: "Medieval states & trade routes.",
      order_index: 3,
      subject: "History"
    },
    {
      chapter: "hist::modern",
      prerequisite: "hist::medieval",
      xp: 65,
      difficulty: "medium",
      type: "lesson",
      unlock_message: "Revolutions & empire shifts.",
      order_index: 4,
      subject: "History"
    },
    {
      chapter: "hist::capstone",
      prerequisite: "hist::modern",
      xp: 100,
      difficulty: "hard",
      type: "boss",
      unlock_message: "Boss: cause & effect synthesis.",
      order_index: 5,
      subject: "History"
    }
  ],
  topicGraph: {
    nodes: [
      { id: "hist::sources", label: "Sources", x: 50, y: 10 },
      { id: "hist::ancient", label: "Ancient", x: 28, y: 35 },
      { id: "hist::medieval", label: "Medieval", x: 72, y: 35 },
      { id: "hist::modern", label: "Modern", x: 50, y: 58 },
      { id: "hist::capstone", label: "Boss", x: 50, y: 85 }
    ],
    edges: [
      { from: "hist::sources", to: "hist::ancient" },
      { from: "hist::sources", to: "hist::medieval" },
      { from: "hist::ancient", to: "hist::modern" },
      { from: "hist::medieval", to: "hist::modern" },
      { from: "hist::modern", to: "hist::capstone" }
    ]
  }
};

const maths = {
  ...baseMeta("maths", "Maths", "#a78bfa"),
  chapters: [
    {
      chapter: "math::numbers",
      prerequisite: "",
      xp: 35,
      difficulty: "easy",
      type: "lesson",
      unlock_message: "Number sense starter dungeon.",
      order_index: 1,
      subject: "Maths"
    },
    {
      chapter: "math::fractions",
      prerequisite: "math::numbers",
      xp: 50,
      difficulty: "easy",
      type: "lesson",
      unlock_message: "Fractions & ratios encounter.",
      order_index: 2,
      subject: "Maths"
    },
    {
      chapter: "math::algebra",
      prerequisite: "math::fractions",
      xp: 65,
      difficulty: "medium",
      type: "lesson",
      unlock_message: "Linear equations skill branch.",
      order_index: 3,
      subject: "Maths"
    },
    {
      chapter: "math::geometry",
      prerequisite: "math::algebra",
      xp: 60,
      difficulty: "medium",
      type: "lesson",
      unlock_message: "Geometry & spatial reasoning.",
      order_index: 4,
      subject: "Maths"
    },
    {
      chapter: "math::capstone",
      prerequisite: "math::geometry",
      xp: 100,
      difficulty: "hard",
      type: "boss",
      unlock_message: "Boss: multi-step problem raid.",
      order_index: 5,
      subject: "Maths"
    }
  ],
  topicGraph: {
    nodes: [
      { id: "math::numbers", label: "Numbers", x: 50, y: 10 },
      { id: "math::fractions", label: "Fractions", x: 25, y: 38 },
      { id: "math::algebra", label: "Algebra", x: 75, y: 38 },
      { id: "math::geometry", label: "Geometry", x: 50, y: 62 },
      { id: "math::capstone", label: "Boss", x: 50, y: 88 }
    ],
    edges: [
      { from: "math::numbers", to: "math::fractions" },
      { from: "math::numbers", to: "math::algebra" },
      { from: "math::fractions", to: "math::geometry" },
      { from: "math::algebra", to: "math::geometry" },
      { from: "math::geometry", to: "math::capstone" }
    ]
  }
};

const bySlug = {
  science,
  history,
  maths
};

function listSubjectKeys() {
  return Object.keys(bySlug);
}

function getSubjectPath(slug) {
  return bySlug[String(slug || "").toLowerCase()] || null;
}

function allChapterIds() {
  const ids = [];
  for (const def of Object.values(bySlug)) {
    for (const c of def.chapters) ids.push(c.chapter);
  }
  return ids;
}

module.exports = {
  SUBJECT_PATHS: bySlug,
  getSubjectPath,
  listSubjectKeys,
  allChapterIds
};
