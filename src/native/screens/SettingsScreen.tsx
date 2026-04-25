import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettingsStore } from '../store/settingsStore';
import { useKeyboardStore } from '../store/keyboardStore';
import { setRuntimeTuning, TUNING, Tuning } from '@engine/tuning';

/**
 * Settings screen — les sliders appellent setRuntimeTuning() pour appliquer
 * en live. Pas de slider natif côté Expo managé — on utilise des boutons +/−.
 *
 * TOUS LES SEUILS SONT ICI + dans src/engine/tuning.ts :
 *  - Deadband (seuil d'erreur déclenchement)
 *  - Max delta (ampleur max)
 *  - EMA α (vitesse d'adaptation)
 *  - Cooldown (délai entre ajustements d'une même touche)
 */
export function SettingsScreen() {
  const adaptiveEnabled = useSettingsStore((s) => s.adaptiveEnabled);
  const autocorrectEnabled = useSettingsStore((s) => s.autocorrectEnabled);
  const deadband = useSettingsStore((s) => s.deadband);
  const maxDelta = useSettingsStore((s) => s.maxDelta);
  const emaAlpha = useSettingsStore((s) => s.emaAlpha);
  const cooldownMs = useSettingsStore((s) => s.cooldownMs);
  const reset = useSettingsStore((s) => s.reset);
  const engine = useKeyboardStore((s) => s.engine);

  const applyTuning = (partial: Partial<Tuning>) => {
    setRuntimeTuning(partial);
  };

  const setAdapt = (v: boolean) => {
    useSettingsStore.getState().setAdaptiveEnabled(v);
    engine?.setAdaptiveEnabled(v);
  };

  const setAutocorrect = (v: boolean) => {
    useSettingsStore.getState().setAutocorrectEnabled(v);
    // Le flag autocorrect est interprété dans Suggester — ici on le met juste dans la freq min
    // en le mettant à Infinity pour le désactiver.
    applyTuning({ AUTOCORRECT_MIN_FREQ: v ? TUNING.AUTOCORRECT_MIN_FREQ : Infinity });
  };

  const step = (
    label: string,
    value: number,
    min: number,
    max: number,
    stepSize: number,
    fmt: (v: number) => string,
    onChange: (v: number) => void
  ) => (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{fmt(value)}</Text>
      </View>
      <Pressable
        style={styles.stepBtn}
        onPress={() => onChange(Math.max(min, +(value - stepSize).toFixed(4)))}
      >
        <Text style={styles.stepText}>−</Text>
      </Pressable>
      <Pressable
        style={styles.stepBtn}
        onPress={() => onChange(Math.min(max, +(value + stepSize).toFixed(4)))}
      >
        <Text style={styles.stepText}>+</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.h1}>Settings</Text>

        <Text style={styles.sectionTitle}>Général</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Adaptatif</Text>
          <Switch value={adaptiveEnabled} onValueChange={setAdapt} />
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Autocorrect</Text>
          <Switch value={autocorrectEnabled} onValueChange={setAutocorrect} />
        </View>

        <Text style={styles.sectionTitle}>Seuils d'adaptation</Text>
        <Text style={styles.muted}>
          ⚙︎ Defaults dans src/engine/tuning.ts. Ici on override en live.
        </Text>

        {step(
          'Deadband (seuil d\'erreur)',
          deadband,
          0.03,
          0.2,
          0.01,
          (v) => `${(v * 100).toFixed(0)}% — en dessous, la touche ne bouge PAS`,
          (v) => {
            useSettingsStore.getState().setDeadband(v);
            applyTuning({ DEADBAND: v });
          }
        )}

        {step(
          'Max delta (ampleur max)',
          maxDelta,
          0.05,
          0.3,
          0.01,
          (v) => `±${(v * 100).toFixed(0)}% de la largeur de base (cap)`,
          (v) => {
            useSettingsStore.getState().setMaxDelta(v);
            applyTuning({ MAX_DELTA_RATIO: v });
          }
        )}

        {step(
          'EMA α (vitesse d\'adaptation)',
          emaAlpha,
          0.05,
          0.5,
          0.05,
          (v) => `α = ${v.toFixed(2)} — haut = réactif, bas = lissé`,
          (v) => {
            useSettingsStore.getState().setEmaAlpha(v);
            applyTuning({ EMA_ALPHA: v });
          }
        )}

        {step(
          'Cooldown entre ajustements',
          cooldownMs,
          0,
          600_000,
          30_000,
          (v) => `${(v / 1000).toFixed(0)}s avant qu'une touche puisse rebouger`,
          (v) => {
            useSettingsStore.getState().setCooldownMs(v);
            applyTuning({ COOLDOWN_MS: v });
          }
        )}

        <Text style={styles.sectionTitle}>Actions</Text>
        <Pressable
          style={[styles.action, styles.danger]}
          onPress={() =>
            Alert.alert('Reset stats', 'Effacer toutes les stats et largeurs ?', [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Effacer', style: 'destructive', onPress: () => engine?.resetAll() },
            ])
          }
        >
          <Text style={styles.actionText}>Reset toutes les stats</Text>
        </Pressable>
        <Pressable
          style={styles.action}
          onPress={() => {
            reset();
            // Applique les defaults en runtime
            setRuntimeTuning({
              DEADBAND: TUNING.DEADBAND,
              MAX_DELTA_RATIO: TUNING.MAX_DELTA_RATIO,
              EMA_ALPHA: TUNING.EMA_ALPHA,
              COOLDOWN_MS: TUNING.COOLDOWN_MS,
              AUTOCORRECT_MIN_FREQ: TUNING.AUTOCORRECT_MIN_FREQ,
            });
          }}
        >
          <Text style={styles.actionText}>Reset paramètres aux defaults</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fafafa' },
  content: { padding: 16, paddingBottom: 40 },
  h1: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginTop: 20, marginBottom: 6, color: '#333' },
  muted: { fontSize: 11, color: '#777', marginBottom: 8, fontStyle: 'italic' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  rowLabel: { fontSize: 14, color: '#222' },
  rowValue: { fontSize: 11, color: '#666', marginTop: 2 },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  stepText: { fontSize: 20, fontWeight: '600', color: '#333' },
  action: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#e8ecef',
    borderRadius: 6,
    alignItems: 'center',
  },
  danger: { backgroundColor: '#fce4e4' },
  actionText: { fontSize: 14, color: '#222' },
});
