export function l2Normalize(vector: number[]) {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return norm ? vector.map((value) => value / norm) : vector;
}

export function dot(a: number[], b: number[]) {
  const length = Math.min(a.length, b.length);
  let score = 0;
  for (let index = 0; index < length; index += 1) score += (a[index] ?? 0) * (b[index] ?? 0);
  return score;
}

export function average(vectors: number[][], dimensions: number) {
  if (!vectors.length) return Array.from({ length: dimensions }, () => 0);
  const result = Array.from({ length: dimensions }, () => 0);
  for (const vector of vectors) {
    for (let index = 0; index < dimensions; index += 1) result[index] = (result[index] ?? 0) + (vector[index] ?? 0);
  }
  return l2Normalize(result.map((value) => value / vectors.length));
}
