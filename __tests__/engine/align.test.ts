import { align, normalizeForAlign } from '@engine/correction/align';

describe('Needleman-Wunsch align', () => {
  test('identical strings produce all matches', () => {
    const r = align('hello', 'hello');
    expect(r.ops.every((o) => o.op === 'match')).toBe(true);
    expect(r.ops).toHaveLength(5);
  });

  test('single substitution at position', () => {
    const r = align('heilo', 'hello');
    const subs = r.ops.filter((o) => o.op === 'sub');
    expect(subs).toHaveLength(1);
    const sub = subs[0] as Extract<(typeof subs)[number], { op: 'sub' }>;
    expect(sub.a).toBe('i');
    expect(sub.b).toBe('l');
    expect(sub.j).toBe(2);
  });

  test('insertion: missing letter in typed', () => {
    const r = align('helo', 'hello');
    const ops = r.ops.map((o) => o.op);
    expect(ops).toContain('ins');
    expect(ops.filter((o) => o === 'ins')).toHaveLength(1);
  });

  test('deletion: extra letter in typed', () => {
    const r = align('helllo', 'hello');
    const ops = r.ops.map((o) => o.op);
    expect(ops).toContain('del');
  });

  test('R → E substitution adjacent keys is cheap', () => {
    const r = align('rntrer', 'entrer');
    const sub = r.ops.find((o) => o.op === 'sub');
    expect(sub).toBeDefined();
  });

  test('normalize removes diacritics', () => {
    expect(normalizeForAlign('Été')).toBe('ete');
    expect(normalizeForAlign('çà')).toBe('ca');
  });
});
