export function calculateExpenseShare(
  expense: { amount: { toString: () => string }; splitType: string },
  userId: string,
  memberCount: number,
  splits?: { userId: string; percentage: { toString: () => string } }[],
): number {
  const amount = Number(expense.amount);

  if (expense.splitType === 'EQUAL') {
    return amount / memberCount;
  }

  if (expense.splitType === 'PERCENTAGE' && splits) {
    const split = splits.find(s => s.userId === userId);
    if (!split) return 0;
    const percentage = Number(split.percentage);
    return amount * percentage / 100;
  }

  return 0;
}

export function calculateSplitsTotal(
  splits: { percentage: { toString: () => string } }[],
): number {
  return splits.reduce((sum, s) => sum + Number(s.percentage), 0);
}
