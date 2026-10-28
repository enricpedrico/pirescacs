/** History navigation follows the displayed line, regardless of board orientation. */
export function historyTarget(
  key: string,
  cursor: number,
  length: number,
): number | undefined {
  if (key === 'ArrowLeft') return Math.max(0, cursor - 1);
  if (key === 'ArrowRight') return Math.min(length, cursor + 1);
  if (key === 'ArrowUp' || key === 'Home') return 0;
  if (key === 'ArrowDown' || key === 'End') return length;
  return undefined;
}
