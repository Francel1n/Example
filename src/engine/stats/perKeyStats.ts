import { KeyId, PerKeyStat } from '../types';

/** Store in-memory des stats par touche. */
export class PerKeyStatsStore {
  private stats = new Map<KeyId, PerKeyStat>();

  get(keyId: KeyId): PerKeyStat {
    return this.stats.get(keyId) ?? { keyId, pressCount: 0, intendedCount: 0, errorCount: 0 };
  }

  bumpIntended(keyId: KeyId, by = 1) {
    const s = this.get(keyId);
    this.stats.set(keyId, { ...s, intendedCount: s.intendedCount + by });
  }

  bumpPressed(keyId: KeyId, by = 1) {
    const s = this.get(keyId);
    this.stats.set(keyId, { ...s, pressCount: s.pressCount + by });
  }

  bumpError(keyId: KeyId, by = 1) {
    const s = this.get(keyId);
    this.stats.set(keyId, { ...s, errorCount: s.errorCount + by });
  }

  all(): PerKeyStat[] {
    return Array.from(this.stats.values());
  }

  load(stats: PerKeyStat[]) {
    this.stats.clear();
    for (const s of stats) this.stats.set(s.keyId, s);
  }

  reset() {
    this.stats.clear();
  }
}
