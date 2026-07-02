// Deterministic negotiation engine. Given the same seed and the same
// sequence of player actions, every device replays the exact same game.

import { createRng } from './rng.js';
import { SCENARIOS, PERSONALITIES } from './data.js';

export const MAX_ROUNDS = 5;

// Game #1 launched July 2, 2026 (UTC).
const EPOCH_UTC = Date.UTC(2026, 6, 2);

export function todayInfo(now = new Date()) {
  const dayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const gameNo = Math.floor((dayStart - EPOCH_UTC) / 86400000) + 1;
  const dateStr = new Date(dayStart).toISOString().slice(0, 10);
  return { gameNo, seedStr: `lowball-${dateStr}`, nextGameAt: dayStart + 86400000 };
}

function priceStep(price) {
  if (price >= 10000) return 100;
  if (price >= 2000) return 50;
  if (price >= 500) return 10;
  if (price >= 100) return 5;
  return 1;
}

function roundToStep(value, step) {
  return Math.round(value / step) * step;
}

export function fmtMoney(n) {
  return '€' + Math.round(n).toLocaleString('en-US');
}

export class Negotiation {
  constructor(seedStr, gameNo, mode = 'daily') {
    this.seedStr = seedStr;
    this.gameNo = gameNo;
    this.mode = mode;
    this.rng = createRng(seedStr);

    this.scenario = this.rng.pick(SCENARIOS);
    this.persona = PERSONALITIES[this.scenario.personality];

    const rawList = this.rng.range(this.scenario.priceMin, this.scenario.priceMax);
    this.step = priceStep(rawList);
    this.list = roundToStep(rawList, this.step);
    const floorPct = this.rng.range(this.scenario.floorMin, this.scenario.floorMax);
    this.floor = roundToStep(this.list * floorPct, this.step);

    // Hidden price the seller would accept right now. Drops as you negotiate.
    this.willing = this.floor + (this.list - this.floor) * this.persona.greed;

    // "Par": the best price achievable with perfect play on this seed —
    // alternating the two most effective tactics at maximum pressure with
    // zero anger. Scoring against par keeps hard sellers fair.
    const affs = Object.values(this.persona.affinity).sort((a, b) => b - a);
    let w = this.willing;
    for (let r = 0; r < MAX_ROUNDS; r++) {
      const eff = affs[r % 2] * Math.pow(0.55, Math.floor(r / 2));
      w -= (w - this.floor) * Math.min(0.6, this.persona.concession * eff * 1.1);
    }
    this.par = w;

    this.ask = this.list;
    this.anger = 0;
    this.round = 0; // offers made so far
    this.tacticUse = {};
    this.lastOffer = 0;
    this.history = []; // { tactic, offer, outcome } for the share grid
    this.status = 'open'; // open | final | deal | bust | walked
    this.price = null;
  }

  get moodEmoji() {
    const f = this.anger / this.persona.angerLimit;
    if (f >= 0.75) return '🤬';
    if (f >= 0.5) return '😠';
    if (f >= 0.25) return '😐';
    return '🙂';
  }

  say(pool, price) {
    const lines = this.persona.dialogue[pool];
    const line = lines && lines.length ? this.rng.pick(lines) : '{counter}.';
    return line
      .replace('{counter}', fmtMoney(price ?? this.ask))
      .replace('{price}', fmtMoney(price ?? this.ask))
      .replace('{item}', this.scenario.item);
  }

  greeting() {
    return this.scenario.greeting.replace('{list}', fmtMoney(this.list));
  }

  validateOffer(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return 'Enter a real number.';
    if (amount >= this.ask) return null; // meeting their price is always allowed
    if (amount < this.lastOffer) return `You already offered ${fmtMoney(this.lastOffer)} — you can't go backwards.`;
    return null;
  }

  makeOffer(tacticId, amount) {
    if (this.status !== 'open') throw new Error('negotiation is over');

    // Offering at or above their current ask closes instantly at the ask.
    if (amount >= this.ask) {
      return this.closeDeal(this.ask, tacticId);
    }

    this.round += 1;
    this.lastOffer = amount;

    const p = this.persona;
    const used = this.tacticUse[tacticId] || 0;
    this.tacticUse[tacticId] = used + 1;
    const eff = (p.affinity[tacticId] ?? 1) * Math.pow(0.55, used);

    // Anger: insulting lowballs + tactics that backfire on this personality.
    let angerAdd = 0;
    const ratio = amount / this.ask;
    if (ratio < 0.5) angerAdd += Math.round(2 * p.insultSens);
    else if (ratio < 0.65) angerAdd += Math.round(1 * p.insultSens);
    const backfired = p.backfires.includes(tacticId);
    if (backfired) angerAdd += 1;
    this.anger += angerAdd;

    if (this.anger >= p.angerLimit) {
      this.status = 'bust';
      this.price = null;
      this.history.push({ tactic: tacticId, outcome: 'bust' });
      return { type: 'bust', line: this.say('bust') };
    }

    // The seller's hidden acceptance price erodes under pressure.
    const angerFactor = Math.max(0.4, 1 - this.anger * 0.12);
    const pressure = 0.7 + 0.6 * Math.min(1, amount / this.willing);
    const drop = (this.willing - this.floor) * Math.min(0.6, p.concession * eff * pressure) * angerFactor;
    this.willing = Math.max(this.floor, this.willing - drop);

    if (amount >= this.willing) {
      return this.closeDeal(amount, tacticId);
    }

    // Counteroffer: concede toward the buyer, more if the tactic landed.
    const k = Math.min(0.6, Math.max(0.05, 0.28 * eff * angerFactor));
    const target = Math.max(amount, this.willing);
    let newAsk = roundToStep(this.ask - (this.ask - target) * k, this.step);
    newAsk = Math.max(newAsk, Math.ceil(this.willing / this.step) * this.step);
    newAsk = Math.min(newAsk, this.ask - this.step);
    const budged = newAsk < this.ask && newAsk >= this.willing;
    if (budged) this.ask = newAsk;

    const bigDrop = budged && (this.ask <= target + (this.list - this.floor) * 0.02 || k >= 0.35);

    let outcome, line;
    if (backfired) {
      outcome = 'anger';
      line = this.say('backfire');
    } else if (angerAdd > 0) {
      outcome = 'anger';
      line = this.say('insulted') + ' ' + this.say('counter');
    } else if (bigDrop) {
      outcome = 'bigdrop';
      line = this.say('bigDrop');
    } else {
      outcome = 'drop';
      line = this.say('counter');
    }
    this.history.push({ tactic: tacticId, outcome });

    if (this.round >= MAX_ROUNDS) {
      this.status = 'final';
      return { type: 'final', line: line + ' ' + this.say('final'), ask: this.ask };
    }
    return { type: 'counter', line, ask: this.ask };
  }

  closeDeal(price, tacticId = null) {
    this.status = 'deal';
    this.price = price;
    this.history.push({ tactic: tacticId, outcome: 'deal' });
    return { type: 'deal', line: this.say('accept', price), price };
  }

  acceptAsk() {
    return this.closeDeal(this.ask);
  }

  walkAway() {
    this.status = 'walked';
    this.price = null;
    this.history.push({ tactic: null, outcome: 'walk' });
  }

  score() {
    if (this.status === 'bust') return 0;
    if (this.status === 'walked') return 10;
    if (this.status !== 'deal') return null;
    const maxSavings = this.list - this.par;
    const raw = maxSavings > 0 ? (this.list - this.price) / maxSavings : 0;
    if (raw <= 0) return 2;
    const speedBonus = Math.max(0, MAX_ROUNDS - this.round);
    return Math.max(2, Math.min(100, Math.round(Math.min(1, raw) * 96 + speedBonus)));
  }
}
