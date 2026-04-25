import { ErrorMatrix, KeyId } from '../types';

/** Structure + helpers pour la matrice de confusion in-memory. */

export function emptyMatrix(): ErrorMatrix {
  return new Map();
}

export function incConfusion(m: ErrorMatrix, pressed: KeyId, intended: KeyId, by = 1) {
  let row = m.get(intended);
  if (!row) {
    row = new Map();
    m.set(intended, row);
  }
  row.set(pressed, (row.get(pressed) ?? 0) + by);
}

/** Total des confusions pour une intended key (sub events seulement). */
export function confusionsForIntended(m: ErrorMatrix, intended: KeyId): number {
  const row = m.get(intended);
  if (!row) return 0;
  let total = 0;
  for (const [pressed, count] of row) {
    if (pressed !== intended) total += count;
  }
  return total;
}

/** Top confuser d'une touche : quelle touche est le plus souvent pressée à tort. */
export function topConfuser(m: ErrorMatrix, intended: KeyId): { pressed: KeyId; count: number } | null {
  const row = m.get(intended);
  if (!row) return null;
  let best: { pressed: KeyId; count: number } | null = null;
  for (const [pressed, count] of row) {
    if (pressed === intended) continue;
    if (!best || count > best.count) best = { pressed, count };
  }
  return best;
}

/** Liste à plat pour affichage / persistance. */
export function flattenMatrix(m: ErrorMatrix): Array<{ intended: KeyId; pressed: KeyId; count: number }> {
  const out: Array<{ intended: KeyId; pressed: KeyId; count: number }> = [];
  for (const [intended, row] of m) {
    for (const [pressed, count] of row) {
      out.push({ intended, pressed, count });
    }
  }
  return out;
}

export function topPairs(m: ErrorMatrix, n: number): Array<{ intended: KeyId; pressed: KeyId; count: number }> {
  return flattenMatrix(m)
    .filter((p) => p.intended !== p.pressed && p.intended !== '' && p.pressed !== '')
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}
