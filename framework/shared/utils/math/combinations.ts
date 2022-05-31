export default function combinations<T>(arr: T[], K: number) {
  function inner(start: number, remaining: number) {
    if (remaining === arr.length - start) {
      return [arr.slice(start)];
    }
    const results: T[][] = [];
    if (remaining > 0) {
      for (const r of inner(start + 1, remaining - 1)) {
        results.push([arr[start], ...r]);
      }
    }
    results.push(...inner(start + 1, remaining));
    return results;
  }
  return inner(0, K);
}
