export interface DisplayEvaluation { context: string; score?: number; label: string }
// Scores are always from White's point of view. Board orientation is unrelated.
export function whiteEvaluationHeight(score?: number): number {
  return score === undefined ? 50 : 50 + 45 * Math.tanh(score / 500);
}
export function rememberEvaluation(previous: DisplayEvaluation | undefined, context: string, score: number | undefined, label: string): DisplayEvaluation {
  if (score !== undefined && Number.isFinite(score)) return { context, score, label };
  return previous?.context === context ? previous : { context, label };
}
