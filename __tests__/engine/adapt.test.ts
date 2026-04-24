import { compute, resetAllWidths } from '@engine/adapt/compute';
import { redistribute } from '@engine/adapt/redistribute';
import { emptyMatrix, incConfusion } from '@engine/stats/errorMatrix';
import { AdaptiveWidth, KeyId, PerKeyStat } from '@engine/types';
import { AZERTY_LETTERS, flattenLayout, rowWidth } from '@engine/layout/azerty';
import { TUNING, setRuntimeTuning } from '@engine/tuning';

function initialWidths(): Map<KeyId, AdaptiveWidth> {
  const m = new Map<KeyId, AdaptiveWidth>();
  for (const k of flattenLayout(AZERTY_LETTERS).filter((k) => k.kind === 'letter')) {
    m.set(k.id, {
      keyId: k.id,
      baseWidth: k.baseWidth,
      currentWidth: k.baseWidth,
      emaErrorRate: 0,
      lastAdjustedTs: 0,
      cooldownUntilTs: 0,
    });
  }
  return m;
}

describe('adapt.compute', () => {
  beforeEach(() => {
    setRuntimeTuning({
      DEADBAND: TUNING.DEADBAND,
      MAX_DELTA_RATIO: TUNING.MAX_DELTA_RATIO,
      EMA_ALPHA: TUNING.EMA_ALPHA,
      COOLDOWN_MS: TUNING.COOLDOWN_MS,
      MIN_SAMPLE_SIZE: TUNING.MIN_SAMPLE_SIZE,
    });
  });

  test('no-op when no errors', () => {
    const w = initialWidths();
    const next = compute(emptyMatrix(), new Map(), w, 0);
    for (const [k, v] of next) {
      expect(v.currentWidth).toBe(w.get(k)!.currentWidth);
    }
  });

  test('no-op when sample size below MIN_SAMPLE_SIZE', () => {
    const w = initialWidths();
    const stats = new Map<KeyId, PerKeyStat>([
      ['e', { keyId: 'e', pressCount: 5, intendedCount: 5, errorCount: 3 }],
    ]);
    const matrix = emptyMatrix();
    incConfusion(matrix, 'r', 'e', 3);
    const next = compute(matrix, stats, w, 1000);
    expect(next.get('e')!.currentWidth).toBe(w.get('e')!.currentWidth);
  });

  test('E widens toward R when R is top confuser', () => {
    const w = initialWidths();
    const stats = new Map<KeyId, PerKeyStat>([
      ['e', { keyId: 'e', pressCount: 100, intendedCount: 100, errorCount: 30 }],
    ]);
    const matrix = emptyMatrix();
    incConfusion(matrix, 'r', 'e', 30); // 30 % de confusion R→E
    // On doit d'abord avoir ema > deadband — force via plusieurs passes ou set direct
    w.get('e')!.emaErrorRate = 0.3;
    const next = compute(matrix, stats, w, 1_000_000);
    expect(next.get('e')!.currentWidth).toBeGreaterThan(w.get('e')!.baseWidth);
    expect(next.get('r')!.currentWidth).toBeLessThan(w.get('r')!.baseWidth);
    // Cooldown activé
    expect(next.get('e')!.cooldownUntilTs).toBeGreaterThan(1_000_000);
  });

  test('row width invariant', () => {
    const w = initialWidths();
    const stats = new Map<KeyId, PerKeyStat>([
      ['e', { keyId: 'e', pressCount: 100, intendedCount: 100, errorCount: 30 }],
    ]);
    const matrix = emptyMatrix();
    incConfusion(matrix, 'r', 'e', 30);
    w.get('e')!.emaErrorRate = 0.3;
    const next = compute(matrix, stats, w, 1_000_000);
    // Ligne 0 = azerty (rangée de E/R)
    const row0 = AZERTY_LETTERS[0];
    const before = rowWidth(row0);
    const afterSum = row0.reduce((s, k) => s + (next.get(k.id)?.currentWidth ?? k.baseWidth), 0);
    expect(afterSum).toBeCloseTo(before, 5);
  });

  test('cooldown prevents re-adjustment', () => {
    const w = initialWidths();
    const stats = new Map<KeyId, PerKeyStat>([
      ['e', { keyId: 'e', pressCount: 100, intendedCount: 100, errorCount: 30 }],
    ]);
    const matrix = emptyMatrix();
    incConfusion(matrix, 'r', 'e', 30);
    w.get('e')!.emaErrorRate = 0.3;
    w.get('e')!.cooldownUntilTs = 5_000_000;
    const next = compute(matrix, stats, w, 1_000_000);
    expect(next.get('e')!.currentWidth).toBe(w.get('e')!.currentWidth);
  });

  test('resetAllWidths restores base', () => {
    const w = initialWidths();
    w.get('e')!.currentWidth = 1.15;
    w.get('e')!.emaErrorRate = 0.3;
    const reset = resetAllWidths(w, 1000);
    expect(reset.get('e')!.currentWidth).toBe(w.get('e')!.baseWidth);
    expect(reset.get('e')!.emaErrorRate).toBe(0);
  });
});

describe('redistribute row invariant (property-like)', () => {
  test('sum preserved for random deltas', () => {
    const w = initialWidths();
    const row0 = AZERTY_LETTERS[0];
    const base = rowWidth(row0);
    for (let trial = 0; trial < 20; trial++) {
      const target = row0[Math.floor(Math.random() * (row0.length - 1))].id;
      const side = Math.random() > 0.5 ? 'left' : 'right';
      const delta = (Math.random() - 0.5) * 0.3;
      const next = redistribute(w, target, side as 'left' | 'right', delta);
      const sum = row0.reduce((s, k) => s + (next.get(k.id)?.currentWidth ?? k.baseWidth), 0);
      expect(sum).toBeCloseTo(base, 5);
    }
  });
});
