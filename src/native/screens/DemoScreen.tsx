import React from 'react';
import { View, StyleSheet, TextInput, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Keyboard } from '../keyboard/Keyboard';
import { useKeyboardStore } from '../store/keyboardStore';

/**
 * Écran principal : zone de texte + clavier custom.
 * Le TextInput est readonly (showSoftInputOnFocus={false}) et piloté
 * par le store Zustand pour éviter tout conflit avec le clavier système.
 */
export function DemoScreen() {
  const text = useKeyboardStore((s) => s.text);
  const currentWord = useKeyboardStore((s) => s.currentWord);
  const setText = useKeyboardStore((s) => s.setText);

  const clear = () => {
    setText('');
    useKeyboardStore.getState().setCurrentWord('');
    useKeyboardStore.getState().setSuggestions([]);
    useKeyboardStore.getState().setPendingUndo(null);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.top}>
        <View style={styles.header}>
          <Text style={styles.title}>Demo</Text>
          <Pressable onPress={clear} style={styles.clearBtn}>
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        </View>
        <TextInput
          style={styles.input}
          value={text + currentWord}
          multiline
          editable={false}
          showSoftInputOnFocus={false}
          placeholder="Tapez ici pour voir le clavier s'adapter."
        />
        <Text style={styles.hint}>
          Tape des mots. Force volontairement des confusions R↔E, A↔Q, etc. —
          après ~20 mots validés, la touche attendue commence à s'élargir.
          {'\n'}Ajuste les seuils dans l'onglet Settings.
        </Text>
      </View>
      <Keyboard />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fafafa' },
  top: { flex: 1, padding: 12 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: { fontSize: 18, fontWeight: '600' },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#ddd',
    borderRadius: 4,
  },
  clearText: { color: '#333' },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderColor: '#ccc',
    borderWidth: 1,
    padding: 10,
    fontSize: 16,
    borderRadius: 6,
    textAlignVertical: 'top',
    minHeight: 140,
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});
