import {
  AdaptiveWidth,
  ErrorEvent,
  KeyId,
  PerKeyStat,
  Repo,
  Word,
} from '../types';

/**
 * Repo in-memory : utile pour les tests (harness synthétique) et pour un
 * fallback "no storage" si SQLite n'est pas dispo.
 */
export class MemoryRepo implements Repo {
  private words: Word[] = [];
  private events: ErrorEvent[] = [];
  private confusion = new Map<string, number>();
  private stats = new Map<KeyId, PerKeyStat>();
  private widths = new Map<KeyId, AdaptiveWidth>();
  private nextId = 1;

  async init() {}

  async saveWord(word: Word): Promise<number> {
    const id = this.nextId++;
    this.words.push({ ...word, id });
    return id;
  }

  async saveErrorEvents(events: ErrorEvent[]) {
    this.events.push(...events);
  }

  async incrementConfusion(pressed: KeyId, intended: KeyId, by: number) {
    const key = `${pressed}|${intended}`;
    this.confusion.set(key, (this.confusion.get(key) ?? 0) + by);
  }

  async upsertKeyStat(stat: PerKeyStat) {
    this.stats.set(stat.keyId, stat);
  }

  async upsertAdaptiveWidth(w: AdaptiveWidth) {
    this.widths.set(w.keyId, w);
  }

  async loadConfusion() {
    return Array.from(this.confusion.entries()).map(([k, count]) => {
      const [pressed, intended] = k.split('|');
      return { pressed, intended, count };
    });
  }

  async loadKeyStats() {
    return Array.from(this.stats.values());
  }

  async loadAdaptiveWidths() {
    return Array.from(this.widths.values());
  }

  async resetAll() {
    this.words = [];
    this.events = [];
    this.confusion.clear();
    this.stats.clear();
    this.widths.clear();
    this.nextId = 1;
  }
}
