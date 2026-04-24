import React, { useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Key } from './Key';
import { useKeyboardStore } from '../store/keyboardStore';
import { useSettingsStore } from '../store/settingsStore';
import { AZERTY_LETTERS, AZERTY_DIGITS, rowWidth } from '@engine/layout/azerty';
import { KeyDescriptor, KeyId } from '@engine/types';
import { SuggestionBar } from './SuggestionBar';

/**
 * Le clavier complet. Responsabilités :
 *  - router keypress → engine.pressKey()
 *  - relayer les suggestions / widths / undo depuis le store Zustand
 *  - appliquer les currentWidth sur chaque Key (animée via Reanimated)
 *
 * Le composant est délibérément stateless — l'engine est la source de vérité.
 */
export function Keyboard() {
  const { width: screenWidth } = useWindowDimensions();
  const engine = useKeyboardStore((s) => s.engine);
  const widths = useKeyboardStore((s) => s.widths);
  const layoutMode = useKeyboardStore((s) => s.layoutMode);
  const shift = useKeyboardStore((s) => s.shift);
  const setLayoutMode = useKeyboardStore((s) => s.setLayoutMode);
  const setShift = useKeyboardStore((s) => s.setShift);
  const setSuggestions = useKeyboardStore((s) => s.setSuggestions);
  const setCurrentWord = useKeyboardStore((s) => s.setCurrentWord);
  const onWordFinalized = useKeyboardStore((s) => s.onWordFinalized);

  const layout: KeyDescriptor[][] = layoutMode === 'letters' ? AZERTY_LETTERS : AZERTY_DIGITS;
  // Tous les layouts partagent la même largeur totale par ligne
  const totalUnits = useMemo(() => rowWidth(layout[0]), [layout]);
  const horizontalPadding = 4;
  const unit = (screenWidth - horizontalPadding * 2) / totalUnits;

  const handle = async (id: KeyId) => {
    if (id === 'SHIFT') {
      setShift(!shift);
      return;
    }
    if (id === 'LAYOUT_123') {
      setLayoutMode('digits');
      return;
    }
    if (id === 'LAYOUT_ABC' || id === 'LAYOUT_SYM') {
      setLayoutMode('letters');
      return;
    }
    if (!engine) return;
    // Shift s'applique aux lettres uniquement
    const isLetter = id.length === 1 && /[a-zàâçéèêëîïôûùüÿñæœ]/i.test(id);
    const finalId = shift && isLetter ? id.toUpperCase() : id;
    // L'engine ne connait que des IDs lowercase — on normalise
    const engineId = finalId.length === 1 ? finalId.toLowerCase() : finalId;
    const mapped =
      engineId === 'ENTER' ? '\n' : engineId === 'SPACE' ? ' ' : engineId;
    const res = await engine.pressKey(mapped);
    setSuggestions(res.suggestions);
    setCurrentWord(res.visible);
    if (res.finalizedWord) {
      onWordFinalized(res.finalizedWord, res.autocorrectApplied);
    }
    // Auto-disable shift après une lettre
    if (shift && isLetter) setShift(false);
  };

  return (
    <View style={styles.container}>
      <SuggestionBar />
      <View style={[styles.keyboard, { paddingHorizontal: horizontalPadding }]}>
        {layout.map((row, rIdx) => (
          <View key={rIdx} style={styles.row}>
            {row.map((k) => {
              const aw = widths.get(k.id);
              const currentRatio = aw ? aw.currentWidth : k.baseWidth;
              return (
                <Key
                  key={`${rIdx}-${k.id}-${k.col}`}
                  desc={k}
                  currentWidth={currentRatio}
                  unit={unit}
                  shift={shift}
                  onPress={handle}
                />
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#e9ecef',
    paddingBottom: 6,
  },
  keyboard: {
    paddingVertical: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
});
