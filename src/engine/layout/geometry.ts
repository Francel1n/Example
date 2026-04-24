import { KeyDescriptor, KeyId } from '../types';
import { AZERTY_LETTERS, flattenLayout } from './azerty';

/**
 * Géométrie : position X,Y des touches en unités de baseWidth, et calcul
 * de distance. Utilisé par :
 *  - scoringMatrix pour pénaliser les substitutions selon la distance physique
 *  - redistribute pour savoir qui est voisin immédiat dans la même rangée
 *
 * Note : les positions sont calculées à partir des baseWidth (layout au repos).
 * On ne recalcule pas la géométrie quand les currentWidth changent — les
 * voisinages sont stables.
 */

interface KeyGeom {
  id: KeyId;
  row: number;
  col: number;
  xStart: number; // début en unités de baseWidth depuis la gauche de la rangée
  xCenter: number;
  xEnd: number;
  width: number;
}

const LAYOUT = AZERTY_LETTERS;

export const GEOM: Map<KeyId, KeyGeom> = buildGeom();

function buildGeom(): Map<KeyId, KeyGeom> {
  const m = new Map<KeyId, KeyGeom>();
  for (const r of LAYOUT) {
    let x = 0;
    for (const k of r) {
      const w = k.baseWidth;
      m.set(k.id, {
        id: k.id,
        row: k.row,
        col: k.col,
        xStart: x,
        xCenter: x + w / 2,
        xEnd: x + w,
        width: w,
      });
      x += w;
    }
  }
  return m;
}

/** Distance euclidienne entre centres, en unités de baseWidth. */
export function keyDistance(a: KeyId, b: KeyId): number {
  const ga = GEOM.get(a);
  const gb = GEOM.get(b);
  if (!ga || !gb) return Infinity;
  const dx = ga.xCenter - gb.xCenter;
  const dy = ga.row - gb.row;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Voisin immédiat dans la MÊME rangée (gauche ou droite), ou null. */
export function rowNeighbor(id: KeyId, side: 'left' | 'right'): KeyId | null {
  const g = GEOM.get(id);
  if (!g) return null;
  const row = LAYOUT[g.row];
  const targetCol = side === 'left' ? g.col - 1 : g.col + 1;
  const nb = row.find((k) => k.col === targetCol);
  return nb ? nb.id : null;
}

/**
 * Renvoie 'left' | 'right' | null selon que `other` est voisin immédiat de
 * `key` dans la même rangée.
 */
export function neighborSide(key: KeyId, other: KeyId): 'left' | 'right' | null {
  if (rowNeighbor(key, 'left') === other) return 'left';
  if (rowNeighbor(key, 'right') === other) return 'right';
  return null;
}

/** Tous les IDs de touches "lettre" du layout AZERTY (pour itération engine). */
export const LETTER_IDS: KeyId[] = flattenLayout(LAYOUT)
  .filter((k) => k.kind === 'letter')
  .map((k) => k.id);
