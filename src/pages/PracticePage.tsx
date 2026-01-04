import BrainScannerCard from "../components/BrainScannerCard";
import { useBrainScanner } from "../hooks/useBrainScanner";
import { ProblemAttempt } from "../types/BrainMetrics";

export default function PracticePage() {
  const { insights, scan } = useBrainScanner();
  const attempts: ProblemAttempt[] = [
    {
      problemId: "1",
      timeTakenSec: 120,
      hintsUsed: 2,
      solved: true,
      mistakes: [{ type: "sign", count: 2 }],
    },
    {
      problemId: "2",
      timeTakenSec: 80,
      hintsUsed: 1,
      solved: true,
      mistakes: [{ type: "formula", count: 1 }],
    },
    {
      problemId: "3",
      timeTakenSec: 70,
      hintsUsed: 0,
      solved: true,
      mistakes: [],
    },
    {
      problemId: "4",
      timeTakenSec: 60,
      hintsUsed: 0,
      solved: true,
      mistakes: [],
    },
    {
      problemId: "5",
      timeTakenSec: 90,
      hintsUsed: 1,
      solved: true,
      mistakes: [{ type: "sign", count: 1 }],
    },
  ];

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">
        Brain Pattern Scanner
      </h1>

      <button
        onClick={() => scan(attempts)}
        className="px-4 py-2 bg-purple-600 text-white rounded-lg"
      >
        Run End-of-Day Scan
      </button>

      <BrainScannerCard insights={insights} />
    </div>
  );
}
