import { ProblemAttempt } from "../../types/BrainMetrics";

export function runBrainScanner(attempts: ProblemAttempt[]) {
  const insights: string[] = [];

  let signErrors = 0;
  let formulaErrors = 0;
  let totalTime = 0;

  attempts.forEach(a => {
    totalTime += a.timeTakenSec;

    a.mistakes.forEach(m => {
      if (m.type === "sign") signErrors += m.count;
      if (m.type === "formula") formulaErrors += m.count;
    });
  });

  const avgTime = totalTime / attempts.length;

  // 🚨 Stress pattern
  if (signErrors >= 3) {
    insights.push("🚨 DANGER: You ALWAYS flip signs under stress");
  }

  // ⚠️ Weakness
  if (formulaErrors >= 2) {
    insights.push("⚠️ WEAKNESS: Quadratic formula = instant panic");
  }

  // ✅ Strength
  if (avgTime < 90) {
    insights.push("✅ GENIUS: You spot patterns 3x faster than average");
  }

  if (insights.length === 0) {
    insights.push("🧠 Stable thinking pattern detected. No major stress signals.");
  }

  return insights;
}
