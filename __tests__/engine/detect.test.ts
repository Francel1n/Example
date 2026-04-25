import { detectErrors } from '@engine/correction/detect';
import { WordBuilder } from '@engine/log/wordBuilder';
import { Word } from '@engine/types';

function mkWord(typed: string, final: string, reason: 'space' | 'suggestion-tap' = 'space'): Word {
  return {
    startedTs: 0,
    finalizedTs: 100,
    typedRaw: [...typed].map((c, i) => ({ keyId: c, ts: i })),
    finalText: final,
    reason,
    wasAutocorrected: typed !== final,
    wasManuallyEdited: false,
  };
}

describe('detectErrors', () => {
  test('no errors when typed == final', () => {
    const r = detectErrors(mkWord('hello', 'hello'));
    expect(r.events).toHaveLength(0);
    expect(r.confusions).toHaveLength(0);
    expect(r.intendedCounts.get('e')).toBe(1);
    expect(r.intendedCounts.get('l')).toBe(2);
  });

  test('sub: R pressed, E intended', () => {
    // "hrllo" corrigé vers "hello" — R→E
    const r = detectErrors(mkWord('hrllo', 'hello'));
    const subs = r.events.filter((e) => e.op === 'sub');
    expect(subs).toHaveLength(1);
    expect(subs[0].pressedKey).toBe('r');
    expect(subs[0].intendedKey).toBe('e');
    expect(r.confusions).toEqual([{ pressed: 'r', intended: 'e' }]);
  });

  test('WordBuilder captures backspace-retype as confusion via raw log', () => {
    const wb = new WordBuilder();
    // User types "r", backspace, "e", space → final should have "e" but raw
    // still contains "r" (marked deleted=true)
    wb.push('r', 1);
    wb.push('BACKSPACE', 2);
    wb.push('e', 3);
    const res = wb.push(' ', 4);
    expect(res.finalized).toBeTruthy();
    const word = res.finalized!;
    // Forcer final à "e" (c'est le visible après le backspace)
    expect(word.finalText).toBe('e');
    // Le raw contient R puis E → detect devrait voir une confusion R→E
    const det = detectErrors(word);
    const subs = det.events.filter((e) => e.op === 'sub');
    expect(subs).toHaveLength(1);
    expect(subs[0].pressedKey).toBe('r');
    expect(subs[0].intendedKey).toBe('e');
  });
});
