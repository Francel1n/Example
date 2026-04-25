import { TUNING } from '../tuning';
import { normalizeForAlign } from '../correction/align';

/**
 * SymSpell-lite : symmetric delete spelling correction.
 *
 * Idée : pour chaque mot du dictionnaire, on pré-calcule tous les mots
 * obtenus en supprimant jusqu'à N lettres (N = maxEditDistance). Le lookup
 * fait les mêmes suppressions sur le mot tapé et regarde dans l'index
 * "delete → mots originaux". Résout typos en O(1) amortir + filtrage.
 *
 * Performance cible : < 5 ms par lookup sur ~60k mots, < 40 MB RAM.
 * maxEditDistance = 2, prefixLength = 7 suffisent pour un POC FR.
 */

export interface DictEntry {
  word: string;     // forme normalisée (lowercase, sans accent)
  display: string;  // forme affichée à l'utilisateur
  freq: number;
}

export interface Suggestion {
  word: string;
  distance: number;
  freq: number;
}

export class SymSpell {
  private index = new Map<string, Set<number>>(); // deleted → indices dans entries
  private entries: DictEntry[] = [];
  private maxDistance: number;
  private prefixLength: number;

  constructor(maxDistance = TUNING.AUTOCORRECT_MAX_EDIT_DISTANCE, prefixLength = 7) {
    this.maxDistance = maxDistance;
    this.prefixLength = prefixLength;
  }

  loadDictionary(entries: DictEntry[]) {
    this.entries = entries;
    this.index.clear();
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const prefix = e.word.slice(0, this.prefixLength);
      // Mot lui-même
      this.addToIndex(prefix, i);
      // Tous les deletes jusqu'à maxDistance
      const deletes = this.editsDelete(prefix, this.maxDistance);
      for (const d of deletes) this.addToIndex(d, i);
    }
  }

  private addToIndex(key: string, idx: number) {
    let set = this.index.get(key);
    if (!set) {
      set = new Set();
      this.index.set(key, set);
    }
    set.add(idx);
  }

  /** Génère tous les deletes du mot jusqu'à distance `max`. */
  private editsDelete(word: string, max: number): string[] {
    const out = new Set<string>();
    const queue = [word];
    for (let d = 0; d < max; d++) {
      const next: string[] = [];
      for (const w of queue) {
        for (let i = 0; i < w.length; i++) {
          const del = w.slice(0, i) + w.slice(i + 1);
          if (!out.has(del)) {
            out.add(del);
            next.push(del);
          }
        }
      }
      queue.length = 0;
      queue.push(...next);
    }
    return Array.from(out);
  }

  lookup(input: string, topN = 3): Suggestion[] {
    const norm = normalizeForAlign(input);
    if (!norm) return [];
    const prefix = norm.slice(0, this.prefixLength);
    const candidates = new Set<number>();

    // 1. Le mot lui-même
    const exact = this.index.get(prefix);
    if (exact) for (const i of exact) candidates.add(i);

    // 2. Les deletes du mot
    const deletes = this.editsDelete(prefix, this.maxDistance);
    for (const d of deletes) {
      const hit = this.index.get(d);
      if (hit) for (const i of hit) candidates.add(i);
    }

    // 3. Filtrer par distance réelle + scorer
    const scored: Suggestion[] = [];
    for (const idx of candidates) {
      const e = this.entries[idx];
      const dist = damerauLevenshtein(norm, e.word, this.maxDistance);
      if (dist <= this.maxDistance) {
        scored.push({ word: e.display, distance: dist, freq: e.freq });
      }
    }
    scored.sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      return b.freq - a.freq;
    });
    return scored.slice(0, topN);
  }
}

/** Damerau-Levenshtein avec early-exit si dist > max. */
export function damerauLevenshtein(a: string, b: string, max: number): number {
  const n = a.length;
  const m = b.length;
  if (Math.abs(n - m) > max) return max + 1;
  if (n === 0) return m;
  if (m === 0) return n;

  const prev2 = new Array(m + 1).fill(0);
  const prev = new Array(m + 1).fill(0);
  const curr = new Array(m + 1).fill(0);
  for (let j = 0; j <= m; j++) prev[j] = j;

  for (let i = 1; i <= n; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,      // deletion
        curr[j - 1] + 1,  // insertion
        prev[j - 1] + cost // sub / match
      );
      // Transposition (Damerau)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        curr[j] = Math.min(curr[j], prev2[j - 2] + 1);
      }
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > max) return max + 1;
    for (let j = 0; j <= m; j++) {
      prev2[j] = prev[j];
      prev[j] = curr[j];
    }
  }
  return prev[m];
}
