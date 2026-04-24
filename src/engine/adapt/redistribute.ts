import { AdaptiveWidth, KeyId } from '../types';
import { getTuning } from '../tuning';
import { rowNeighbor } from '../layout/geometry';

/**
 * Applique un delta sur une touche et redistribue la largeur sur son voisin
 * immédiat (gauche OU droite selon le côté visé). L'invariant de rangée
 * (somme des largeurs = constante) est STRICTEMENT préservé.
 *
 * Renvoie la nouvelle map des AdaptiveWidth (par keyId) — pure, sans effet de bord.
 */
export function redistribute(
  widths: Map<KeyId, AdaptiveWidth>,
  target: KeyId,
  side: 'left' | 'right',
  desiredDelta: number
): Map<KeyId, AdaptiveWidth> {
  const neighborId = rowNeighbor(target, side);
  if (!neighborId) return widths;

  const t = widths.get(target);
  const n = widths.get(neighborId);
  if (!t || !n) return widths;

  const t_ = getTuning();
  // Cap sur target : ±MAX_DELTA_RATIO * base
  const maxTargetWidth = t.baseWidth * (1 + t_.MAX_DELTA_RATIO);
  const minTargetWidth = t.baseWidth * (1 - t_.MAX_DELTA_RATIO);
  // Plancher sur voisin : MIN_NEIGHBOR_RATIO * base
  const minNeighborWidth = n.baseWidth * t_.MIN_NEIGHBOR_RATIO;
  const maxNeighborWidth = n.baseWidth * (1 + t_.MAX_DELTA_RATIO);

  let delta = desiredDelta;
  // Cap côté target
  if (t.currentWidth + delta > maxTargetWidth) delta = maxTargetWidth - t.currentWidth;
  if (t.currentWidth + delta < minTargetWidth) delta = minTargetWidth - t.currentWidth;
  // Cap côté voisin
  if (n.currentWidth - delta < minNeighborWidth) delta = n.currentWidth - minNeighborWidth;
  if (n.currentWidth - delta > maxNeighborWidth) delta = n.currentWidth - maxNeighborWidth;

  if (Math.abs(delta) < 1e-6) return widths;

  const out = new Map(widths);
  out.set(target, { ...t, currentWidth: t.currentWidth + delta });
  out.set(neighborId, { ...n, currentWidth: n.currentWidth - delta });
  return out;
}
