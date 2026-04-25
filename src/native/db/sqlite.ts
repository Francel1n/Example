import * as SQLite from 'expo-sqlite';
import {
  AdaptiveWidth,
  ErrorEvent,
  KeyId,
  PerKeyStat,
  Repo,
  Word,
} from '@engine/types';

/**
 * Implémentation Repo via expo-sqlite (API JSI async, SDK 15).
 * Seul point de contact RN / persistance.
 */
export class SqliteRepo implements Repo {
  private db: SQLite.SQLiteDatabase | null = null;

  async init() {
    this.db = await SQLite.openDatabaseAsync('adaptive_keyboard.db');
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS word (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        started_ts INTEGER NOT NULL,
        finalized_ts INTEGER NOT NULL,
        typed_raw TEXT NOT NULL,
        final_text TEXT NOT NULL,
        reason TEXT NOT NULL,
        was_autocorrected INTEGER NOT NULL,
        was_manually_edited INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS error_event (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word_id INTEGER,
        pressed_key TEXT,
        intended_key TEXT,
        op TEXT NOT NULL,
        position INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_error_event_word ON error_event(word_id);
      CREATE TABLE IF NOT EXISTS confusion (
        pressed_key TEXT NOT NULL,
        intended_key TEXT NOT NULL,
        count INTEGER NOT NULL,
        PRIMARY KEY (pressed_key, intended_key)
      );
      CREATE INDEX IF NOT EXISTS idx_confusion_intended ON confusion(intended_key);
      CREATE TABLE IF NOT EXISTS key_stat (
        key_id TEXT PRIMARY KEY,
        press_count INTEGER NOT NULL DEFAULT 0,
        intended_count INTEGER NOT NULL DEFAULT 0,
        error_count INTEGER NOT NULL DEFAULT 0,
        updated_ts INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS adaptive_width (
        key_id TEXT PRIMARY KEY,
        base_width REAL NOT NULL,
        current_width REAL NOT NULL,
        ema_error_rate REAL NOT NULL,
        last_adjusted_ts INTEGER NOT NULL,
        cooldown_until_ts INTEGER NOT NULL
      );
    `);
  }

  async saveWord(word: Word): Promise<number> {
    const db = this.requireDb();
    const result = await db.runAsync(
      'INSERT INTO word (started_ts, finalized_ts, typed_raw, final_text, reason, was_autocorrected, was_manually_edited) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        word.startedTs,
        word.finalizedTs,
        JSON.stringify(word.typedRaw),
        word.finalText,
        word.reason,
        word.wasAutocorrected ? 1 : 0,
        word.wasManuallyEdited ? 1 : 0,
      ]
    );
    return result.lastInsertRowId;
  }

  async saveErrorEvents(events: ErrorEvent[]) {
    if (!events.length) return;
    const db = this.requireDb();
    await db.withTransactionAsync(async () => {
      for (const e of events) {
        await db.runAsync(
          'INSERT INTO error_event (word_id, pressed_key, intended_key, op, position) VALUES (?, ?, ?, ?, ?)',
          [e.wordId ?? null, e.pressedKey, e.intendedKey, e.op, e.position]
        );
      }
    });
  }

  async incrementConfusion(pressed: KeyId, intended: KeyId, by: number) {
    const db = this.requireDb();
    await db.runAsync(
      `INSERT INTO confusion (pressed_key, intended_key, count) VALUES (?, ?, ?)
       ON CONFLICT(pressed_key, intended_key) DO UPDATE SET count = count + excluded.count`,
      [pressed, intended, by]
    );
  }

  async upsertKeyStat(stat: PerKeyStat) {
    const db = this.requireDb();
    await db.runAsync(
      `INSERT INTO key_stat (key_id, press_count, intended_count, error_count, updated_ts)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(key_id) DO UPDATE SET
         press_count = excluded.press_count,
         intended_count = excluded.intended_count,
         error_count = excluded.error_count,
         updated_ts = excluded.updated_ts`,
      [stat.keyId, stat.pressCount, stat.intendedCount, stat.errorCount, Date.now()]
    );
  }

  async upsertAdaptiveWidth(w: AdaptiveWidth) {
    const db = this.requireDb();
    await db.runAsync(
      `INSERT INTO adaptive_width (key_id, base_width, current_width, ema_error_rate, last_adjusted_ts, cooldown_until_ts)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(key_id) DO UPDATE SET
         current_width = excluded.current_width,
         ema_error_rate = excluded.ema_error_rate,
         last_adjusted_ts = excluded.last_adjusted_ts,
         cooldown_until_ts = excluded.cooldown_until_ts`,
      [w.keyId, w.baseWidth, w.currentWidth, w.emaErrorRate, w.lastAdjustedTs, w.cooldownUntilTs]
    );
  }

  async loadConfusion() {
    const db = this.requireDb();
    const rows = await db.getAllAsync<{
      pressed_key: string;
      intended_key: string;
      count: number;
    }>('SELECT pressed_key, intended_key, count FROM confusion');
    return rows.map((r) => ({ pressed: r.pressed_key, intended: r.intended_key, count: r.count }));
  }

  async loadKeyStats() {
    const db = this.requireDb();
    const rows = await db.getAllAsync<{
      key_id: string;
      press_count: number;
      intended_count: number;
      error_count: number;
    }>('SELECT key_id, press_count, intended_count, error_count FROM key_stat');
    return rows.map((r) => ({
      keyId: r.key_id,
      pressCount: r.press_count,
      intendedCount: r.intended_count,
      errorCount: r.error_count,
    }));
  }

  async loadAdaptiveWidths() {
    const db = this.requireDb();
    const rows = await db.getAllAsync<{
      key_id: string;
      base_width: number;
      current_width: number;
      ema_error_rate: number;
      last_adjusted_ts: number;
      cooldown_until_ts: number;
    }>('SELECT * FROM adaptive_width');
    return rows.map((r) => ({
      keyId: r.key_id,
      baseWidth: r.base_width,
      currentWidth: r.current_width,
      emaErrorRate: r.ema_error_rate,
      lastAdjustedTs: r.last_adjusted_ts,
      cooldownUntilTs: r.cooldown_until_ts,
    }));
  }

  async resetAll() {
    const db = this.requireDb();
    await db.execAsync(
      'DELETE FROM word; DELETE FROM error_event; DELETE FROM confusion; DELETE FROM key_stat; DELETE FROM adaptive_width;'
    );
  }

  private requireDb(): SQLite.SQLiteDatabase {
    if (!this.db) throw new Error('SqliteRepo not initialized');
    return this.db;
  }
}
