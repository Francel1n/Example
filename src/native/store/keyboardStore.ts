import { create } from 'zustand';
import { Engine } from '@engine/index';
import {
  AdaptiveWidth,
  ErrorMatrix,
  KeyId,
  PerKeyStat,
  Word,
} from '@engine/types';
import { Suggestion } from '@engine/autocorrect/symspell';

/**
 * Store Zustand central pour l'état runtime du clavier :
 *  - text courant dans le TextInput
 *  - suggestions affichées
 *  - widths adaptatives (alimente Reanimated)
 *  - matrix + stats pour l'écran Stats
 *  - undo autocorrect pending
 */

interface KeyboardState {
  engine: Engine | null;
  text: string; // texte complet du TextInput (mots validés + mot en cours)
  currentWord: string;
  suggestions: Suggestion[];
  widths: Map<KeyId, AdaptiveWidth>;
  matrix: ErrorMatrix;
  stats: PerKeyStat[];
  pendingUndo: { from: string; to: string; ts: number } | null;
  layoutMode: 'letters' | 'digits';
  shift: boolean;

  setEngine: (e: Engine) => void;
  setText: (t: string) => void;
  setCurrentWord: (w: string) => void;
  setSuggestions: (s: Suggestion[]) => void;
  setWidths: (w: Map<KeyId, AdaptiveWidth>) => void;
  setStats: (m: ErrorMatrix, s: PerKeyStat[]) => void;
  setPendingUndo: (u: KeyboardState['pendingUndo']) => void;
  setLayoutMode: (m: 'letters' | 'digits') => void;
  setShift: (s: boolean) => void;
  onWordFinalized: (w: Word, autocorrect?: { from: string; to: string }) => void;
}

export const useKeyboardStore = create<KeyboardState>((set, get) => ({
  engine: null,
  text: '',
  currentWord: '',
  suggestions: [],
  widths: new Map(),
  matrix: new Map(),
  stats: [],
  pendingUndo: null,
  layoutMode: 'letters',
  shift: false,

  setEngine: (engine) => set({ engine }),
  setText: (text) => set({ text }),
  setCurrentWord: (currentWord) => set({ currentWord }),
  setSuggestions: (suggestions) => set({ suggestions }),
  setWidths: (widths) => set({ widths }),
  setStats: (matrix, stats) => set({ matrix, stats }),
  setPendingUndo: (pendingUndo) => set({ pendingUndo }),
  setLayoutMode: (layoutMode) => set({ layoutMode }),
  setShift: (shift) => set({ shift }),

  onWordFinalized: (word, autocorrect) => {
    // Construit le texte final à partir de l'ancien texte moins le mot
    // en cours + le mot finalisé + le séparateur déclencheur.
    const { text, currentWord } = get();
    const separator = word.reason === 'space'
      ? ' '
      : word.reason === 'newline'
      ? '\n'
      : word.reason === 'punctuation'
      ? lastPunctuationFromRaw(word.typedRaw)
      : '';
    // On retire la saisie visible en cours (currentWord) et on ajoute le mot finalisé
    const committed = text.endsWith(currentWord)
      ? text.slice(0, text.length - currentWord.length)
      : text;
    const newText = committed + word.finalText + separator;
    set({
      text: newText,
      currentWord: '',
      pendingUndo: autocorrect ? { ...autocorrect, ts: Date.now() } : null,
    });
  },
}));

function lastPunctuationFromRaw(raw: ReadonlyArray<{ keyId: string }>): string {
  const last = raw[raw.length - 1];
  return last?.keyId ?? '';
}
