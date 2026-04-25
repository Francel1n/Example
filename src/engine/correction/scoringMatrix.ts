import { KeyId } from '../types';
import { keyDistance } from '../layout/geometry';
import { TUNING } from '../tuning';

/**
 * Coût de substitution entre deux caractères pour Needleman-Wunsch.
 * Les scores sont des GAINS (positifs = bien, négatifs = mal).
 */
export function subScore(a: string, b: string): number {
  if (a === b) return TUNING.NW_MATCH;
  const d = keyDistance(a as KeyId, b as KeyId);
  if (!isFinite(d)) return TUNING.NW_SUB_DISTANT;
  return d <= TUNING.NW_ADJACENCY_RADIUS ? TUNING.NW_SUB_ADJACENT : TUNING.NW_SUB_DISTANT;
}

/** Indique si deux touches sont "adjacentes" physiquement. */
export function isAdjacent(a: KeyId, b: KeyId): boolean {
  if (a === b) return false;
  return keyDistance(a, b) <= TUNING.NW_ADJACENCY_RADIUS;
}
