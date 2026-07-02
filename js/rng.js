// Deterministic seeded PRNG. Same seed string => same game for everyone.

function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seedStr) {
  const seed = xmur3(seedStr);
  const rand = mulberry32(seed());
  return {
    // float in [0, 1)
    next: () => rand(),
    // integer in [min, max] inclusive
    int: (min, max) => min + Math.floor(rand() * (max - min + 1)),
    // float in [min, max)
    range: (min, max) => min + rand() * (max - min),
    pick: (arr) => arr[Math.floor(rand() * arr.length)],
  };
}
