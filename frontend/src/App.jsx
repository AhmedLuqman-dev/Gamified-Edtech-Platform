import { useEffect, useMemo, useState } from "react";
import Header from "./components/Header";
import StudentSelector from "./components/StudentSelector";
import ProgressBar from "./components/ProgressBar";
import SkillTree from "./components/SkillTree";
import QuestModal from "./components/QuestModal";

const curriculumData = [
  {
    chapter: "Foundations of Variables",
    prerequisite: null,
    xp: 20,
    difficulty: "easy",
    type: "lesson",
    unlock_message: "Start your quest by mastering variable basics.",
    order_index: 1,
    branch: 0
  },
  {
    chapter: "Conditionals Arena",
    prerequisite: "Foundations of Variables",
    xp: 30,
    difficulty: "easy",
    type: "challenge",
    unlock_message: "Choose paths wisely with if-else logic.",
    order_index: 2,
    branch: 0
  },
  {
    chapter: "Loop Mechanics",
    prerequisite: "Conditionals Arena",
    xp: 50,
    difficulty: "medium",
    type: "lesson",
    unlock_message: "Harness iteration to automate repetitive tasks.",
    order_index: 3,
    branch: 1
  },
  {
    chapter: "Array Expedition",
    prerequisite: "Loop Mechanics",
    xp: 70,
    difficulty: "medium",
    type: "challenge",
    unlock_message: "Traverse and transform collections effectively.",
    order_index: 4,
    branch: -1
  },
  {
    chapter: "Algorithmic Boss Battle",
    prerequisite: "Array Expedition",
    xp: 120,
    difficulty: "hard",
    type: "boss",
    unlock_message: "Defeat the final boss with optimized reasoning.",
    order_index: 5,
    branch: 0
  }
];

const completedCountByProfile = {
  struggling: 1,
  average: 2,
  advanced: curriculumData.length - 1
};

const App = () => {
  const [selectedStudentProfile, setSelectedStudentProfile] = useState("average");
  const [totalXP, setTotalXP] = useState(0);
  const [activeNode, setActiveNode] = useState(null);

  const completedNodes = useMemo(
    () => Math.min(completedCountByProfile[selectedStudentProfile], curriculumData.length),
    [selectedStudentProfile]
  );

  useEffect(() => {
    const doneNodes = curriculumData.slice(0, completedNodes);
    const profileXP = doneNodes.reduce((sum, node) => sum + node.xp, 0);
    setTotalXP(profileXP);
  }, [completedNodes]);

  const handleNodeClick = (node) => {
    setActiveNode(node);
  };

  const handleCloseModal = (wasCorrect) => {
    if (wasCorrect && activeNode) {
      setTotalXP((prev) => prev + activeNode.xp);
    }
    setActiveNode(null);
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Header totalXP={totalXP} selectedStudentProfile={selectedStudentProfile} />

      <main className="grid gap-5 lg:grid-cols-[280px,1fr]">
        <section className="space-y-5">
          <StudentSelector
            selectedStudentProfile={selectedStudentProfile}
            onProfileChange={setSelectedStudentProfile}
          />
          <ProgressBar totalNodes={curriculumData.length} completedNodes={completedNodes} />
        </section>

        <section>
          <SkillTree
            curriculum={curriculumData}
            selectedStudentProfile={selectedStudentProfile}
            onNodeClick={handleNodeClick}
          />
        </section>
      </main>

      <QuestModal isOpen={Boolean(activeNode)} onClose={handleCloseModal} node={activeNode} />
    </div>
  );
};

export default App;
