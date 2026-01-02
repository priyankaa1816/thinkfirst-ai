import { useState } from "react";
import { ProblemAttempt } from "../types/BrainMetrics";
import { runBrainScanner } from "../services/firebase/brainScanner";

export function useBrainScanner() {
  const [insights, setInsights] = useState<string[]>([]);

  function scan(attempts: ProblemAttempt[]) {
    if (attempts.length < 5) return;
    const result = runBrainScanner(attempts);
    setInsights(result);
  }

  return { insights, scan };
}
