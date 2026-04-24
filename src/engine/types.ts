/**
 * Types partagés — zéro dépendance React Native.
 * Ce fichier est la source de vérité des structures manipulées par l'engine.
 */

export type KeyId = string; // ex: 'a', 'e', 'SPACE', 'SHIFT', 'BACKSPACE'

export interface KeyDescriptor {
  id: KeyId;
  label: string;
  row: number;       // 0=haut, 3=bas
  col: number;       // position dans la rangée
  baseWidth: number; // unités relatives (somme d'une rangée = largeur ligne)
  kind: 'letter' | 'digit' | 'symbol' | 'modifier';
}

export interface KeyPress {
  keyId: KeyId;
  ts: number;
  deleted?: boolean; // marqué a posteriori si suivi d'un backspace
}

export type FinalizationReason =
  | 'space'
  | 'punctuation'
  | 'suggestion-tap'
  | 'newline'
  | 'blur';

export interface Word {
  id?: number;
  startedTs: number;
  finalizedTs: number;
  typedRaw: KeyPress[];
  finalText: string;
  reason: FinalizationReason;
  wasAutocorrected: boolean;
  wasManuallyEdited: boolean;
}

export type ErrorOp = 'sub' | 'ins' | 'del';

export interface ErrorEvent {
  wordId?: number;
  pressedKey: KeyId;
  intendedKey: KeyId;
  op: ErrorOp;
  position: number;
}

/** Matrice de confusion : pour chaque touche intended, compteurs par pressed. */
export type ErrorMatrix = Map<KeyId, Map<KeyId, number>>;

export interface PerKeyStat {
  keyId: KeyId;
  pressCount: number;    // nombre de fois pressée
  intendedCount: number; // nombre de fois attendue (basé sur final_text)
  errorCount: number;    // pressed ≠ intended
}

export interface AdaptiveWidth {
  keyId: KeyId;
  baseWidth: number;
  currentWidth: number;
  emaErrorRate: number;
  lastAdjustedTs: number;
  cooldownUntilTs: number;
}

/**
 * Interface de persistance — implémentée côté native/db/sqlite.ts,
 * injectée dans l'engine au démarrage. L'engine n'importe jamais expo-sqlite.
 */
export interface Repo {
  init(): Promise<void>;
  saveWord(word: Word): Promise<number>;
  saveErrorEvents(events: ErrorEvent[]): Promise<void>;
  incrementConfusion(pressed: KeyId, intended: KeyId, by: number): Promise<void>;
  upsertKeyStat(stat: PerKeyStat): Promise<void>;
  upsertAdaptiveWidth(w: AdaptiveWidth): Promise<void>;
  loadConfusion(): Promise<Array<{ pressed: KeyId; intended: KeyId; count: number }>>;
  loadKeyStats(): Promise<PerKeyStat[]>;
  loadAdaptiveWidths(): Promise<AdaptiveWidth[]>;
  resetAll(): Promise<void>;
}
