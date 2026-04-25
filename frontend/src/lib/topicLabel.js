/**
 * Turns internal ids like "sci::cells" or "hist::ancient_rome" into display titles.
 */
export function formatTopicLabel(chapterId) {
  if (chapterId == null || chapterId === "") return "";
  const s = String(chapterId).trim();
  const sep = s.indexOf("::");
  const tail = sep >= 0 ? s.slice(sep + 2) : s;
  const words = tail.replace(/_/g, " ").split(/\s+/).filter(Boolean);
  if (!words.length) return s;
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

export function duelLabelFromSubject(battleVariant, defaultSubject = "") {
  if (battleVariant === "science") return "Sci duel";
  const s = String(defaultSubject).toLowerCase();
  if (s.includes("math")) return "Math duel";
  if (s.includes("history")) return "History duel";
  return "Topic duel";
}
