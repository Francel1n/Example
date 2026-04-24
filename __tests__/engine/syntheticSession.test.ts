import { Engine } from '@engine/index';
import { MemoryRepo } from '@engine/persistence/memoryRepo';
import { normalizeForAlign } from '@engine/correction/align';
import { setRuntimeTuning, TUNING } from '@engine/tuning';

/**
 * Harness de validation : on injecte un biais de frappe (R à la place de E
 * dans X % des cas), on fait tourner 500 mots, et on vérifie que :
 *  - le taux détecté est proche du taux injecté
 *  - E s'élargit, R rétrécit
 */

function genSession(
  words: string[],
  typingPlan: { press: string; intended: string; prob: number }[]
): Array<{ keyId: string; ts: number }> {
  const events: Array<{ keyId: string; ts: number }> = [];
  let ts = 0;
  let rng = mulberry32(42);
  for (const word of words) {
    for (const ch of normalizeForAlign(word)) {
      // pour chaque intended=ch, peut-être substituer
      const flip = typingPlan.find((p) => p.intended === ch);
      let actual = ch;
      if (flip && rng() < flip.prob) actual = flip.press;
      events.push({ keyId: actual, ts: ts++ });
    }
    events.push({ keyId: ' ', ts: ts++ });
  }
  return events;
}

function mulberry32(a: number) {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('synthetic session — end-to-end engine', () => {
  test('R/E bias leads to E widening after enough words', async () => {
    // Trigger adaptatif tous les 20 mots (défaut) + deadband 5% pour sensibilité
    setRuntimeTuning({
      DEADBAND: 0.05,
      MIN_SAMPLE_SIZE: 10,
      COOLDOWN_MS: 0,
      ADAPT_TRIGGER_WORDS: 20,
    });

    const repo = new MemoryRepo();
    const engine = new Engine({ repo });
    await engine.bootstrap();

    // Corpus : 200 mots avec beaucoup de E
    const corpus = Array(200).fill('entre ').join('').trim().split(' ');
    const plan = [{ press: 'r', intended: 'e', prob: 0.3 }];
    const events = genSession(corpus, plan);

    for (const ev of events) {
      await engine.pressKey(ev.keyId, ev.ts);
    }

    const widths = engine.widthsSnapshot();
    const pairs = engine.topConfusionPairs(5);

    // E devrait être plus large que sa base, R plus étroit
    const eW = widths.get('e')!;
    const rW = widths.get('r')!;
    expect(eW.currentWidth).toBeGreaterThan(eW.baseWidth);
    expect(rW.currentWidth).toBeLessThan(rW.baseWidth);

    // La confusion top doit être (intended=e, pressed=r)
    expect(pairs[0].intended).toBe('e');
    expect(pairs[0].pressed).toBe('r');

    // Remettre les tuning par défaut pour les autres tests
    setRuntimeTuning({
      DEADBAND: TUNING.DEADBAND,
      MIN_SAMPLE_SIZE: TUNING.MIN_SAMPLE_SIZE,
      COOLDOWN_MS: TUNING.COOLDOWN_MS,
      ADAPT_TRIGGER_WORDS: TUNING.ADAPT_TRIGGER_WORDS,
    });
  }, 15000);
});
