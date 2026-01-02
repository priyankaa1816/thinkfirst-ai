export type ProblemAttempt = {
  problemId: string;
  timeTakenSec: number;
  mistakes: {
    type: "sign" | "formula" | "logic" | "concept";
    count: number;
  }[];
  hintsUsed: number;
  solved: boolean;
};
