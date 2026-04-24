import { KeyPress, KeyId, FinalizationReason, Word } from '../types';

/**
 * WordBuilder — reconstruit un mot à partir d'un flux de KeyPress.
 *
 * Responsabilités :
 *  - accumuler les keypresses qui composent le mot en cours
 *  - appliquer les backspaces sur la chaîne VISIBLE, en gardant le log brut
 *    (les keys supprimés restent dans raw avec deleted=true — l'aligneur
 *    s'en sert pour détecter une substitution "j'ai tapé R, effacé, tapé E")
 *  - finaliser le mot sur espace / ponctuation / tap suggestion / blur
 *
 * N'imprime rien. Ne touche pas au DOM. Ne parle pas de SQLite.
 */

const BOUNDARY_PUNCT = new Set([' ', '.', ',', ';', ':', '!', '?', "'", '"', '(', ')', '\n']);
const BACKSPACE: KeyId = 'BACKSPACE';

export class WordBuilder {
  private raw: KeyPress[] = [];
  private visible: string[] = []; // chaîne visible après résolution des BS
  private startedTs: number | null = null;

  /** Appuie une touche. Retourne true si un mot vient d'être finalisé. */
  push(keyId: KeyId, ts: number): PushResult {
    if (this.startedTs == null && keyId !== BACKSPACE && !BOUNDARY_PUNCT.has(keyId)) {
      this.startedTs = ts;
    }

    if (keyId === BACKSPACE) {
      // Marque la dernière frappe non-supprimée comme deleted=true
      for (let i = this.raw.length - 1; i >= 0; i--) {
        if (!this.raw[i].deleted) {
          this.raw[i].deleted = true;
          break;
        }
      }
      if (this.visible.length > 0) this.visible.pop();
      this.raw.push({ keyId, ts });
      return { finalized: null, visible: this.visibleText() };
    }

    // Frontière de mot
    if (BOUNDARY_PUNCT.has(keyId)) {
      // Ne pas finaliser un mot vide (espace en début, ponctuation seule…)
      if (this.visible.length === 0) {
        return { finalized: null, visible: '' };
      }
      const reason: FinalizationReason =
        keyId === ' ' ? 'space' : keyId === '\n' ? 'newline' : 'punctuation';
      // La ponctuation reste dans le log brut pour traçabilité
      if (reason === 'punctuation') {
        this.raw.push({ keyId, ts });
      }
      const word = this.snapshot(ts, reason);
      this.reset();
      return { finalized: word, visible: '' };
    }

    this.raw.push({ keyId, ts });
    this.visible.push(keyId);
    return { finalized: null, visible: this.visibleText() };
  }

  /** Finalisation forcée (ex: tap sur suggestion, blur). */
  forceFinalize(ts: number, reason: FinalizationReason, overrideFinal?: string): Word | null {
    if (this.raw.filter((k) => !k.deleted).length === 0) return null;
    const word = this.snapshot(ts, reason, overrideFinal);
    this.reset();
    return word;
  }

  /** Texte courant visible (hors finalisation). */
  visibleText(): string {
    return this.visible.join('');
  }

  rawLog(): ReadonlyArray<KeyPress> {
    return this.raw;
  }

  private snapshot(ts: number, reason: FinalizationReason, overrideFinal?: string): Word {
    return {
      startedTs: this.startedTs ?? ts,
      finalizedTs: ts,
      typedRaw: [...this.raw],
      finalText: overrideFinal ?? this.visible.join(''),
      reason,
      wasAutocorrected: overrideFinal != null && overrideFinal !== this.visible.join(''),
      wasManuallyEdited: this.raw.some((k) => k.deleted),
    };
  }

  private reset() {
    this.raw = [];
    this.visible = [];
    this.startedTs = null;
  }
}

export interface PushResult {
  finalized: Word | null;
  visible: string;
}
