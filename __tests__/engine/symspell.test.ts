import { SymSpell, damerauLevenshtein } from '@engine/autocorrect/symspell';
import { buildDefaultSymSpell } from '@engine/autocorrect/dictionary';

describe('damerauLevenshtein', () => {
  test('identity', () => {
    expect(damerauLevenshtein('hello', 'hello', 5)).toBe(0);
  });
  test('substitution', () => {
    expect(damerauLevenshtein('hello', 'hallo', 5)).toBe(1);
  });
  test('insertion', () => {
    expect(damerauLevenshtein('helo', 'hello', 5)).toBe(1);
  });
  test('transposition (Damerau)', () => {
    expect(damerauLevenshtein('hlelo', 'hello', 5)).toBe(1);
  });
  test('early exit when exceeds max', () => {
    expect(damerauLevenshtein('abcdef', 'xyz123', 1)).toBeGreaterThan(1);
  });
});

describe('SymSpell', () => {
  const sym = buildDefaultSymSpell();

  test('exact word matches', () => {
    const sugs = sym.lookup('bonjour');
    expect(sugs[0].word).toBe('bonjour');
    expect(sugs[0].distance).toBe(0);
  });

  test('single-typo correction', () => {
    // "bonjoue" (single sub) should suggest "bonjour"
    const sugs = sym.lookup('bonjoue');
    expect(sugs[0].word).toBe('bonjour');
    expect(sugs[0].distance).toBe(1);
  });

  test('two-typo correction within distance', () => {
    const sugs = sym.lookup('mrcii'); // "merci" avec transposition + dup
    const words = sugs.map((s) => s.word);
    expect(words).toContain('merci');
  });

  test('empty input', () => {
    expect(sym.lookup('')).toEqual([]);
  });
});
