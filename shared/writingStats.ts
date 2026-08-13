export function countWritingUnits(value: string | undefined) {
  return (value ?? "").replace(/\s/g, "").length;
}

export function writingGoalProgress(current: number, goal: number) {
  if (!Number.isFinite(goal) || goal <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((current / goal) * 100)));
}
