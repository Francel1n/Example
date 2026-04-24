/**
 * Façade engine — une seule surface d'API pour la couche native.
 * Orchestration : WordBuilder → detect → matrix/stats → compute → widths.
 */

import {
  AdaptiveWidth,
  ErrorMatrix,
  FinalizationReason,
  KeyId,
  PerKeyStat,
  Repo,
  Word,
} from './types';
import { WordBuilder } from './log/wordBuilder';
import { detectErrors } from './correction/detect';
import { emptyMatrix, incConfusion, topPairs } from './stats/errorMatrix';
import { PerKeyStatsStore } from './stats/perKeyStats';
import { compute, resetAllWidths } from './adapt/compute';
import { AZERTY_LETTERS, flattenLayout } from './layout/azerty';
import { buildDefaultSymSpell } from './autocorrect/dictionary';
import { Suggester } from './autocorrect/suggest';
import { SymSpell, Suggestion } from './autocorrect/symspell';
import { getTuning, setRuntimeTuning, TUNING } from './tuning';

export * from './types';
export { TUNING, getTuning, setRuntimeTuning } from './tuning';
export { AZERTY_LETTERS, AZERTY_DIGITS, flattenLayout, rowWidth } from './layout/azerty';
export { topPairs } from './stats/errorMatrix';

export interface EngineEvents {
  onWordFinalized?: (word: Word) => void;
  onWidthsChanged?: (widths: Map<KeyId, AdaptiveWidth>) => void;
  onStatsChanged?: (matrix: ErrorMatrix, stats: PerKeyStat[]) => void;
}

export interface EngineOptions {
  repo: Repo;
  symSpell?: SymSpell;
  events?: EngineEvents;
  adaptiveEnabled?: boolean;
}

export interface PushOutcome {
  visible: string;
  suggestions: Suggestion[];
  autocorrectApplied?: { from: string; to: string };
  finalizedWord?: Word;
}

export class Engine {
  private wb = new WordBuilder();
  private matrix: ErrorMatrix = emptyMatrix();
  private stats = new PerKeyStatsStore();
  private widths = new Map<KeyId, AdaptiveWidth>();
  private repo: Repo;
  private sym: SymSpell;
  private sugg: Suggester;
  private events: EngineEvents;
  private adaptiveEnabled: boolean;

  private wordsSinceLastCompute = 0;
  private lastComputeTs = 0;

  constructor(opts: EngineOptions) {
    this.repo = opts.repo;
    this.sym = opts.symSpell ?? buildDefaultSymSpell();
    this.sugg = new Suggester(this.sym);
    this.events = opts.events ?? {};
    this.adaptiveEnabled = opts.adaptiveEnabled ?? true;

    // Initialise les largeurs à base pour toutes les lettres du layout.
    const letters = flattenLayout(AZERTY_LETTERS).filter((k) => k.kind === 'letter');
    for (const k of letters) {
      this.widths.set(k.id, {
        keyId: k.id,
        baseWidth: k.baseWidth,
        currentWidth: k.baseWidth,
        emaErrorRate: 0,
        lastAdjustedTs: 0,
        cooldownUntilTs: 0,
      });
    }
  }

  async bootstrap(): Promise<void> {
    await this.repo.init();
    // Rehydrate matrix
    const conf = await this.repo.loadConfusion();
    for (const c of conf) incConfusion(this.matrix, c.pressed, c.intended, c.count);
    // Rehydrate stats
    const s = await this.repo.loadKeyStats();
    this.stats.load(s);
    // Rehydrate widths (écrase les defaults si trouvés)
    const w = await this.repo.loadAdaptiveWidths();
    for (const aw of w) this.widths.set(aw.keyId, aw);
    this.lastComputeTs = Date.now();
    this.events.onWidthsChanged?.(new Map(this.widths));
    this.events.onStatsChanged?.(this.matrix, this.stats.all());
  }

  /**
   * Entrée principale depuis la couche native.
   * @param keyId id logique (lettre, BACKSPACE, SPACE, etc.)
   * @param ts timestamp (ms)
   */
  async pressKey(keyId: KeyId, ts = Date.now()): Promise<PushOutcome> {
    const res = this.wb.push(keyId, ts);

    let finalizedWord: Word | undefined;
    let autocorrectApplied: { from: string; to: string } | undefined;

    if (res.finalized) {
      // Tenter une auto-correction AVANT de figer le mot
      const typed = res.finalized.finalText;
      const auto = this.sugg.pickAutocorrect(typed);
      if (auto && auto.replacement !== typed) {
        res.finalized.finalText = auto.replacement;
        res.finalized.wasAutocorrected = true;
        autocorrectApplied = { from: typed, to: auto.replacement };
      }
      await this.ingestFinalized(res.finalized);
      finalizedWord = res.finalized;
    }

    // Suggestions pour la barre (sur le mot courant visible)
    const suggestions = res.visible ? this.sugg.suggestions(res.visible, 3) : [];
    return { visible: res.visible, suggestions, autocorrectApplied, finalizedWord };
  }

  /** Tap suggestion = finalise avec le mot choisi. */
  async acceptSuggestion(word: string, ts = Date.now()): Promise<Word | null> {
    const finalized = this.wb.forceFinalize(ts, 'suggestion-tap', word);
    if (!finalized) return null;
    await this.ingestFinalized(finalized);
    return finalized;
  }

  currentVisible(): string {
    return this.wb.visibleText();
  }

  widthsSnapshot(): Map<KeyId, AdaptiveWidth> {
    return new Map(this.widths);
  }

  matrixSnapshot(): ErrorMatrix {
    return this.matrix;
  }

  statsSnapshot(): PerKeyStat[] {
    return this.stats.all();
  }

  topConfusionPairs(n: number) {
    return topPairs(this.matrix, n);
  }

  setAdaptiveEnabled(enabled: boolean) {
    this.adaptiveEnabled = enabled;
    if (!enabled) {
      this.widths = resetAllWidths(this.widths, Date.now());
      this.persistWidths();
      this.events.onWidthsChanged?.(new Map(this.widths));
    }
  }

  async resetAll() {
    await this.repo.resetAll();
    this.matrix = emptyMatrix();
    this.stats.reset();
    this.widths = resetAllWidths(this.widths, Date.now());
    this.events.onStatsChanged?.(this.matrix, this.stats.all());
    this.events.onWidthsChanged?.(new Map(this.widths));
  }

  // ─── privé ──────────────────────────────────────────────────────────

  private async ingestFinalized(word: Word) {
    const det = detectErrors(word);
    // Update in-memory structures
    for (const c of det.confusions) incConfusion(this.matrix, c.pressed, c.intended);
    for (const [k, c] of det.intendedCounts) this.stats.bumpIntended(k, c);
    for (const [k, c] of det.pressedCounts) this.stats.bumpPressed(k, c);
    for (const ev of det.events) {
      if (ev.op === 'sub') this.stats.bumpError(ev.intendedKey, 1);
    }

    // Persistence (async, non bloquant sur la réactivité UI)
    const wordId = await this.repo.saveWord(word);
    await this.repo.saveErrorEvents(det.events.map((e) => ({ ...e, wordId })));
    for (const c of det.confusions) {
      await this.repo.incrementConfusion(c.pressed, c.intended, 1);
    }
    for (const s of this.stats.all()) await this.repo.upsertKeyStat(s);

    // Events
    this.events.onWordFinalized?.(word);
    this.events.onStatsChanged?.(this.matrix, this.stats.all());

    // Adaptive compute : toutes les N mots OU après T ms
    this.wordsSinceLastCompute++;
    const now = Date.now();
    const shouldCompute =
      this.adaptiveEnabled &&
      (this.wordsSinceLastCompute >= getTuning().ADAPT_TRIGGER_WORDS ||
        now - this.lastComputeTs >= getTuning().ADAPT_TRIGGER_MS_MAX);
    if (shouldCompute) {
      const statMap = new Map(this.stats.all().map((s) => [s.keyId, s]));
      this.widths = compute(this.matrix, statMap, this.widths, now);
      this.wordsSinceLastCompute = 0;
      this.lastComputeTs = now;
      await this.persistWidths();
      this.events.onWidthsChanged?.(new Map(this.widths));
    }
  }

  private async persistWidths() {
    for (const w of this.widths.values()) {
      await this.repo.upsertAdaptiveWidth(w);
    }
  }
}
