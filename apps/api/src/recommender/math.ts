export function tokenize(...parts: string[]) {
  return parts
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

export function cosine(a: Map<string, number>, b: Map<string, number>) {
  let dot = 0;
  let aNorm = 0;
  let bNorm = 0;
  for (const value of a.values()) aNorm += value * value;
  for (const value of b.values()) bNorm += value * value;
  for (const [key, value] of a) dot += value * (b.get(key) ?? 0);
  if (!aNorm || !bNorm) return 0;
  return dot / (Math.sqrt(aNorm) * Math.sqrt(bNorm));
}

export function vectorize(tokens: string[]) {
  const vector = new Map<string, number>();
  for (const token of tokens) vector.set(token, (vector.get(token) ?? 0) + 1);
  return vector;
}

export function normalizeScores<T extends { score: number }>(rows: T[]) {
  const min = Math.min(...rows.map((row) => row.score));
  const max = Math.max(...rows.map((row) => row.score));
  return rows.map((row) => ({ ...row, score: max === min ? 0 : (row.score - min) / (max - min) }));
}

