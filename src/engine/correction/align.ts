import { TUNING } from '../tuning';
import { subScore } from './scoringMatrix';

/**
 * Needleman-Wunsch avec gap affine (gap open / gap extend distincts).
 * Retourne l'alignement optimal entre deux chaînes.
 *
 * Convention : la chaîne A = ce qui a été TAPÉ (après résolution des backspaces),
 *              la chaîne B = le mot FINAL (après autocorrect ou validation).
 *
 * L'alignement est une liste d'opérations dans l'ordre, gauche → droite :
 *   - 'match' : a[i] === b[j], les deux consomment une position.
 *   - 'sub'   : a[i] !== b[j], pressé ≠ attendu.
 *   - 'ins'   : gap dans A (B a une lettre que A n'a pas) → lettre "manquée".
 *   - 'del'   : gap dans B (A a une lettre que B n'a pas) → lettre "en trop".
 */

export type AlignOp =
  | { op: 'match'; a: string; b: string; i: number; j: number }
  | { op: 'sub'; a: string; b: string; i: number; j: number }
  | { op: 'ins'; b: string; j: number } // lettre présente dans B, absente de A
  | { op: 'del'; a: string; i: number }; // lettre présente dans A, absente de B

export interface AlignResult {
  ops: AlignOp[];
  score: number;
}

/**
 * Aligne A (tapé) et B (final).
 * Utilise 3 matrices pour gérer le gap affine : M (match/sub), X (gap en B), Y (gap en A).
 */
export function align(a: string, b: string): AlignResult {
  const n = a.length;
  const m = b.length;
  const NEG = -1e9;

  // M[i][j] : meilleur score finissant par un match/sub en (i,j)
  // X[i][j] : meilleur score finissant par un gap dans B (consomme A[i])
  // Y[i][j] : meilleur score finissant par un gap dans A (consomme B[j])
  const M: number[][] = empty(n + 1, m + 1, NEG);
  const X: number[][] = empty(n + 1, m + 1, NEG);
  const Y: number[][] = empty(n + 1, m + 1, NEG);

  // Traceback pointers : 0=M, 1=X, 2=Y, -1=stop
  const tM: number[][] = empty(n + 1, m + 1, -1);
  const tX: number[][] = empty(n + 1, m + 1, -1);
  const tY: number[][] = empty(n + 1, m + 1, -1);

  M[0][0] = 0;
  // Initialisation bordures : que des gaps
  for (let i = 1; i <= n; i++) {
    X[i][0] = TUNING.NW_GAP_OPEN + (i - 1) * TUNING.NW_GAP_EXTEND;
    tX[i][0] = 1;
  }
  for (let j = 1; j <= m; j++) {
    Y[0][j] = TUNING.NW_GAP_OPEN + (j - 1) * TUNING.NW_GAP_EXTEND;
    tY[0][j] = 2;
  }

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const s = subScore(a[i - 1], b[j - 1]);
      // Meilleur prédécesseur pour M[i][j]
      const fromM = M[i - 1][j - 1] + s;
      const fromX = X[i - 1][j - 1] + s;
      const fromY = Y[i - 1][j - 1] + s;
      let best = fromM;
      let tr = 0;
      if (fromX > best) {
        best = fromX;
        tr = 1;
      }
      if (fromY > best) {
        best = fromY;
        tr = 2;
      }
      M[i][j] = best;
      tM[i][j] = tr;

      // X[i][j] = gap dans B, consomme A[i]
      const xOpen = M[i - 1][j] + TUNING.NW_GAP_OPEN;
      const xExt = X[i - 1][j] + TUNING.NW_GAP_EXTEND;
      if (xOpen >= xExt) {
        X[i][j] = xOpen;
        tX[i][j] = 0;
      } else {
        X[i][j] = xExt;
        tX[i][j] = 1;
      }

      // Y[i][j] = gap dans A, consomme B[j]
      const yOpen = M[i][j - 1] + TUNING.NW_GAP_OPEN;
      const yExt = Y[i][j - 1] + TUNING.NW_GAP_EXTEND;
      if (yOpen >= yExt) {
        Y[i][j] = yOpen;
        tY[i][j] = 0;
      } else {
        Y[i][j] = yExt;
        tY[i][j] = 2;
      }
    }
  }

  // Choix de la matrice finale avec le meilleur score en (n,m)
  let score = M[n][m];
  let state = 0;
  if (X[n][m] > score) {
    score = X[n][m];
    state = 1;
  }
  if (Y[n][m] > score) {
    score = Y[n][m];
    state = 2;
  }

  // Traceback
  const ops: AlignOp[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (state === 0) {
      const prev = tM[i][j];
      if (a[i - 1] === b[j - 1]) {
        ops.push({ op: 'match', a: a[i - 1], b: b[j - 1], i: i - 1, j: j - 1 });
      } else {
        ops.push({ op: 'sub', a: a[i - 1], b: b[j - 1], i: i - 1, j: j - 1 });
      }
      i--;
      j--;
      state = prev;
    } else if (state === 1) {
      const prev = tX[i][j];
      ops.push({ op: 'del', a: a[i - 1], i: i - 1 });
      i--;
      state = prev;
    } else {
      const prev = tY[i][j];
      ops.push({ op: 'ins', b: b[j - 1], j: j - 1 });
      j--;
      state = prev;
    }
    if (state < 0) break;
  }
  ops.reverse();
  return { ops, score };
}

function empty(rows: number, cols: number, fill: number): number[][] {
  const out: number[][] = new Array(rows);
  for (let i = 0; i < rows; i++) {
    out[i] = new Array(cols).fill(fill);
  }
  return out;
}

/** Normalise : lowercase + strip diacritiques (combining marks U+0300–U+036F). */
export function normalizeForAlign(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
