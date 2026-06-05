export function precisionAtK(recommended: string[], relevant: Set<string>, k: number) {
  if (!k) return 0;
  return recommended.slice(0, k).filter((id) => relevant.has(id)).length / k;
}

export function recallAtK(recommended: string[], relevant: Set<string>, k: number) {
  if (!relevant.size) return 0;
  return recommended.slice(0, k).filter((id) => relevant.has(id)).length / relevant.size;
}

export function mapAtK(recommended: string[], relevant: Set<string>, k: number) {
  let hits = 0;
  let score = 0;
  recommended.slice(0, k).forEach((id, index) => {
    if (relevant.has(id)) {
      hits += 1;
      score += hits / (index + 1);
    }
  });
  return relevant.size ? score / Math.min(relevant.size, k) : 0;
}

export function ndcgAtK(recommended: string[], relevant: Set<string>, k: number) {
  const dcg = recommended.slice(0, k).reduce((sum, id, index) => sum + (relevant.has(id) ? 1 / Math.log2(index + 2) : 0), 0);
  const ideal = Array.from({ length: Math.min(relevant.size, k) }).reduce<number>((sum, _, index) => sum + 1 / Math.log2(index + 2), 0);
  return ideal ? dcg / ideal : 0;
}
