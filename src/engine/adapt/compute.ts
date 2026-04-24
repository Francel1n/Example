import { AdaptiveWidth, ErrorMatrix, KeyId, PerKeyStat } from '../types';
import { getTuning } from '../tuning';
import { topConfuser } from '../stats/errorMatrix';
import { neighborSide } from '../layout/geometry';
import { redistribute } from './redistribute';
import { ema } from './smoothing';

/**
 * Calcule la nouvelle carte AdaptiveWidth à partir de :
 *  - matrix : confusions cumulées
 *  - keyStats : intendedCount par touche (dénominateur du taux d'erreur)
 *  - prev : largeurs courantes
 *  - now : timestamp courant (ms)
 *
 * Appliquée toutes les ADAPT_TRIGGER_WORDS mots OU ADAPT_TRIGGER_MS_MAX ms.
 *
 * Fine-tune dans tuning.ts :
 *  - MIN_SAMPLE_SIZE : combien d'intendedCount avant de considérer la touche
 *  - DEADBAND : seuil en dessous duquel on ne bouge pas
 *  - EMA_ALPHA : lissage
 *  - ADAPT_GAIN : magnitude
 *  - MAX_DELTA_RATIO : cap absolu
 *  - COOLDOWN_MS : blocage post-ajustement
 *
 * Implémentation en DEUX PASSES :
 *  1) Mise à jour de tous les EMA (chaque touche, indépendamment)
 *  2) Redistribution width sur les touches qualifiées (sample + deadband + pas cooldown)
 * Nécessaire parce que la pass redistribute touche les voisins ; on ne veut
 * pas que la pass 1 écrase un voisin déjà ajusté.
 */
export function compute(
  matrix: ErrorMatrix,
  keyStats: Map<KeyId, PerKeyStat>,
  prev: Map<KeyId, AdaptiveWidth>,
  now: number
): Map<KeyId, AdaptiveWidth> {
  const T = getTuning();

  // Pass 1 — update EMA pour toutes les touches
  let next = new Map<KeyId, AdaptiveWidth>();
  const rates = new Map<KeyId, number>();
  for (const [keyId, w] of prev) {
    const stat = keyStats.get(keyId);
    const intended = stat?.intendedCount ?? 0;
    const errors = countErrorsIntended(matrix, keyId);
    const rate = intended > 0 ? errors / intended : 0;
    const newEma = ema(w.emaErrorRate, rate);
    rates.set(keyId, newEma);
    next.set(keyId, { ...w, emaErrorRate: newEma });
  }

  // Pass 2 — redistribue pour chaque touche qualifiée
  for (const [keyId, w] of next) {
    const stat = keyStats.get(keyId);
    const intended = stat?.intendedCount ?? 0;
    if (now < w.cooldownUntilTs) continue;
    if (intended < T.MIN_SAMPLE_SIZE) continue;
    const newEma = rates.get(keyId) ?? 0;
    if (newEma < T.DEADBAND) continue;

    const top = topConfuser(matrix, keyId);
    if (!top) continue;
    const side = neighborSide(keyId, top.pressed);
    if (!side) continue;

    const baseWidth = w.baseWidth;
    const desiredDelta = Math.min(
      baseWidth * T.MAX_DELTA_RATIO,
      T.ADAPT_GAIN * (newEma - T.DEADBAND) * baseWidth
    );
    if (desiredDelta <= 0) continue;

    next = redistribute(next, keyId, side, desiredDelta);
    const adjusted = next.get(keyId);
    if (adjusted) {
      next.set(keyId, {
        ...adjusted,
        lastAdjustedTs: now,
        cooldownUntilTs: now + T.COOLDOWN_MS,
      });
    }
  }
  return next;
}

function countErrorsIntended(m: ErrorMatrix, intended: KeyId): number {
  const row = m.get(intended);
  if (!row) return 0;
  let total = 0;
  for (const [pressed, count] of row) {
    if (pressed !== intended && pressed !== '') total += count;
  }
  return total;
}

/** Reset toutes les largeurs à base (utilisé par toggle "adaptatif off"). */
export function resetAllWidths(
  prev: Map<KeyId, AdaptiveWidth>,
  now: number
): Map<KeyId, AdaptiveWidth> {
  const out = new Map(prev);
  for (const [k, w] of prev) {
    out.set(k, {
      ...w,
      currentWidth: w.baseWidth,
      emaErrorRate: 0,
      lastAdjustedTs: now,
      cooldownUntilTs: 0,
    });
  }
  return out;
}
