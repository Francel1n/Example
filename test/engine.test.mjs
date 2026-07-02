// Run with: node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { Negotiation, todayInfo, MAX_ROUNDS } from '../js/engine.js';
import { TACTICS, SCENARIOS, PERSONALITIES } from '../js/data.js';
import { buildShareText } from '../js/share.js';

test('todayInfo is stable within a day and starts at game #1 on launch day', () => {
  const launch = todayInfo(new Date(Date.UTC(2026, 6, 2, 15, 30)));
  assert.equal(launch.gameNo, 1);
  assert.equal(launch.seedStr, 'lowball-2026-07-02');
  const nextDay = todayInfo(new Date(Date.UTC(2026, 6, 3, 0, 0, 1)));
  assert.equal(nextDay.gameNo, 2);
});

test('same seed and same actions replay to the identical game', () => {
  const play = () => {
    const g = new Negotiation('lowball-2026-07-05', 4, 'daily');
    const transcript = [g.greeting()];
    let r = g.makeOffer('silence', Math.round(g.list * 0.6));
    transcript.push(r.line);
    if (g.status === 'open') {
      r = g.makeOffer('cash', Math.round(g.list * 0.75));
      transcript.push(r.line);
    }
    if (g.status === 'open' || g.status === 'final') g.acceptAsk();
    return { transcript: transcript.join('|'), price: g.price, score: g.score(), history: JSON.stringify(g.history) };
  };
  assert.deepEqual(play(), play());
});

test('every scenario references a real personality and sane price bounds', () => {
  for (const s of SCENARIOS) {
    assert.ok(PERSONALITIES[s.personality], `${s.id} has unknown personality`);
    assert.ok(s.priceMin < s.priceMax, `${s.id} price range`);
    assert.ok(s.floorMin < s.floorMax && s.floorMax < 1, `${s.id} floor range`);
    assert.ok(s.greeting.includes('{list}'), `${s.id} greeting shows the asking price`);
  }
});

test('every personality has dialogue for every pool the engine uses', () => {
  const required = ['counter', 'bigDrop', 'insulted', 'accept', 'bust', 'final'];
  for (const [id, p] of Object.entries(PERSONALITIES)) {
    for (const pool of required) {
      assert.ok(Array.isArray(p.dialogue[pool]) && p.dialogue[pool].length > 0, `${id}.${pool} missing`);
    }
    if (p.backfires.length > 0) {
      assert.ok(p.dialogue.backfire.length > 0, `${id} backfires but has no backfire lines`);
    }
    for (const t of TACTICS) assert.ok(p.affinity[t.id] !== undefined, `${id} missing affinity for ${t.id}`);
  }
});

test('fuzz: 500 games never crash, always terminate, scores stay in [0,100]', () => {
  for (let i = 0; i < 500; i++) {
    const g = new Negotiation(`fuzz-${i}`, i, 'practice');
    assert.ok(g.floor < g.list, 'floor below list');
    assert.ok(g.willing >= g.floor && g.willing <= g.list, 'willing within bounds');

    let guard = 0;
    while (g.status === 'open' && guard++ < 20) {
      const tactic = TACTICS[(i + guard) % TACTICS.length].id;
      // Mix of strategies: aggressive lowballs, timid creep, jumps to ask.
      const pct = 0.35 + ((i * 7 + guard * 13) % 60) / 100;
      const offer = Math.max(g.lastOffer, Math.round(g.ask * pct));
      const err = g.validateOffer(offer);
      if (err) { g.acceptAsk(); break; }
      g.makeOffer(tactic, offer);
    }
    if (g.status === 'final') (i % 2 === 0) ? g.acceptAsk() : g.walkAway();
    assert.ok(['deal', 'bust', 'walked'].includes(g.status), `game ${i} ended (${g.status})`);
    assert.ok(g.round <= MAX_ROUNDS, 'round cap respected');

    const score = g.score();
    assert.ok(Number.isInteger(score) && score >= 0 && score <= 100, `score ${score} in range`);
    if (g.status === 'deal') {
      assert.ok(g.price >= g.floor, `deal ${g.price} never below floor ${g.floor}`);
      assert.ok(g.price <= g.list, `deal ${g.price} never above list ${g.list}`);
    }
    assert.ok(g.history.length > 0, 'history recorded for the share grid');
  }
});

test('the ask only ever goes down', () => {
  for (let i = 0; i < 100; i++) {
    const g = new Negotiation(`mono-${i}`, i, 'practice');
    let prevAsk = g.ask;
    let guard = 0;
    while (g.status === 'open' && guard++ < 10) {
      g.makeOffer('polite', Math.max(g.lastOffer, Math.round(g.ask * 0.7)));
      assert.ok(g.ask <= prevAsk, 'ask is monotonically non-increasing');
      prevAsk = g.ask;
    }
  }
});

test('good tactics beat bad tactics on the same seed', () => {
  // On a sentimental seller, flattery should extract a better deal than flaw-hunting.
  const seed = SCENARIOS.findIndex((s) => s.personality === 'sentimental');
  const run = (tactic) => {
    for (let i = 0; i < 200; i++) {
      const g = new Negotiation(`tactic-${i}`, i, 'practice');
      if (g.persona.id !== 'sentimental') continue;
      let guard = 0;
      while (g.status === 'open' && guard++ < 10) {
        g.makeOffer(tactic, Math.max(g.lastOffer, Math.round(g.ask * 0.72)));
      }
      if (g.status === 'final') g.acceptAsk();
      return { status: g.status, score: g.score(), seedIdx: i };
    }
    throw new Error('no sentimental seller found');
  };
  const flatter = run('flatter');
  const flaw = run('flaw');
  assert.ok(flatter.score >= flaw.score, `flattery (${flatter.score}) should beat flaw-hunting (${flaw.score}) on a sentimental seller`);
});

test('walking away and busts produce shareable text', () => {
  const g = new Negotiation('share-test', 42, 'daily');
  g.makeOffer('polite', Math.round(g.ask * 0.7));
  if (g.status === 'open') g.walkAway();
  const text = buildShareText(g, g.score(), 3, 'https://example.com');
  assert.match(text, /LOWBALL #42/);
  assert.match(text, /\/100/);
  assert.match(text, /https:\/\/example\.com/);
});
