import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useKeyboardStore } from '../store/keyboardStore';
import { getTuning } from '@engine/tuning';

/**
 * Barre de 3 suggestions + chip "revert" pour annuler l'autocorrect.
 * La chip disparaît après UNDO_AUTOCORRECT_MS.
 */
export function SuggestionBar() {
  const engine = useKeyboardStore((s) => s.engine);
  const suggestions = useKeyboardStore((s) => s.suggestions);
  const pendingUndo = useKeyboardStore((s) => s.pendingUndo);
  const setPendingUndo = useKeyboardStore((s) => s.setPendingUndo);
  const text = useKeyboardStore((s) => s.text);
  const setText = useKeyboardStore((s) => s.setText);

  useEffect(() => {
    if (!pendingUndo) return;
    const t = setTimeout(() => setPendingUndo(null), getTuning().UNDO_AUTOCORRECT_MS);
    return () => clearTimeout(t);
  }, [pendingUndo]);

  const accept = async (word: string) => {
    if (!engine) return;
    const finalized = await engine.acceptSuggestion(word);
    if (finalized) {
      useKeyboardStore.getState().onWordFinalized(finalized);
    }
  };

  const revert = () => {
    if (!pendingUndo) return;
    // Remet le mot original à la place du mot corrigé.
    // text se termine par `${corrected}${separator}` — on reconstruit.
    const { from, to } = pendingUndo;
    const idx = text.lastIndexOf(to);
    if (idx >= 0) {
      setText(text.slice(0, idx) + from + text.slice(idx + to.length));
    }
    setPendingUndo(null);
  };

  return (
    <View style={styles.bar}>
      {pendingUndo && (
        <Pressable style={[styles.chip, styles.revertChip]} onPress={revert}>
          <Text style={styles.revertText}>↶ {pendingUndo.from}</Text>
        </Pressable>
      )}
      {suggestions.slice(0, 3).map((s, i) => (
        <Pressable key={i} style={styles.chip} onPress={() => accept(s.word)}>
          <Text style={styles.chipText}>{s.word}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    height: 36,
    alignItems: 'center',
    paddingHorizontal: 6,
    gap: 6,
    backgroundColor: '#dfe4eb',
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#ffffff',
    borderRadius: 14,
  },
  revertChip: {
    backgroundColor: '#fce4a6',
  },
  chipText: {
    fontSize: 13,
    color: '#222',
  },
  revertText: {
    fontSize: 13,
    color: '#6b4f00',
    fontStyle: 'italic',
  },
});
