import { getTuning } from '../tuning';

/** EMA classique. `prev` = valeur précédente, `sample` = mesure courante. */
export function ema(prev: number, sample: number, alpha?: number): number {
  const a = alpha ?? getTuning().EMA_ALPHA;
  return a * sample + (1 - a) * prev;
}
