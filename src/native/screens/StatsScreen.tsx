import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useKeyboardStore } from '../store/keyboardStore';
import { AZERTY_LETTERS, rowWidth } from '@engine/layout/azerty';
import { topPairs } from '@engine/stats/errorMatrix';

/**
 * Stats screen :
 *  - heatmap par touche (couleur = ema_error_rate)
 *  - top 10 paires de confusion
 *  - deltas current vs base pour voir quelles touches ont bougé
 */
export function StatsScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const widths = useKeyboardStore((s) => s.widths);
  const matrix = useKeyboardStore((s) => s.matrix);

  const totalUnits = rowWidth(AZERTY_LETTERS[0]);
  const unit = (screenWidth - 32) / totalUnits;

  const pairs = useMemo(() => topPairs(matrix, 10), [matrix]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.h1}>Stats</Text>

        <Text style={styles.h2}>Heatmap — taux d'erreur (EMA)</Text>
        <Text style={styles.muted}>
          Vert = 0 %, rouge = ≥ 30 %. Seules les touches lettres sont affichées.
        </Text>
        <View style={styles.keyboard}>
          {AZERTY_LETTERS.map((row, rIdx) => (
            <View key={rIdx} style={styles.row}>
              {row.map((k) => {
                const aw = widths.get(k.id);
                const ema = aw?.emaErrorRate ?? 0;
                const color = heatColor(ema);
                const w = (aw?.currentWidth ?? k.baseWidth) * unit;
                return (
                  <View key={k.id} style={[styles.cell, { width: w, backgroundColor: color }]}>
                    <Text style={styles.cellLabel}>{k.label}</Text>
                    <Text style={styles.cellPct}>{(ema * 100).toFixed(0)}%</Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        <Text style={styles.h2}>Top confusions</Text>
        {pairs.length === 0 && <Text style={styles.muted}>Pas encore d'erreur détectée.</Text>}
        {pairs.map((p, i) => (
          <View key={i} style={styles.pairRow}>
            <Text style={styles.pairText}>
              {p.intended.toUpperCase()} <Text style={styles.arrow}>→</Text>{' '}
              {p.pressed.toUpperCase()}
            </Text>
            <Text style={styles.pairCount}>×{p.count}</Text>
          </View>
        ))}

        <Text style={styles.h2}>Deltas largeurs</Text>
        <Text style={styles.muted}>Δ = (current − base) / base</Text>
        {[...widths.values()]
          .filter((w) => Math.abs(w.currentWidth - w.baseWidth) > 1e-4)
          .sort((a, b) => Math.abs(b.currentWidth - b.baseWidth) - Math.abs(a.currentWidth - a.baseWidth))
          .slice(0, 10)
          .map((w) => {
            const delta = (w.currentWidth - w.baseWidth) / w.baseWidth;
            return (
              <View key={w.keyId} style={styles.pairRow}>
                <Text style={styles.pairText}>{w.keyId.toUpperCase()}</Text>
                <Text style={[styles.pairCount, { color: delta > 0 ? '#187c18' : '#a33' }]}>
                  {delta >= 0 ? '+' : ''}
                  {(delta * 100).toFixed(1)}%
                </Text>
              </View>
            );
          })}
      </ScrollView>
    </SafeAreaView>
  );
}

function heatColor(ema: number): string {
  // 0 → vert, 0.3 → rouge
  const clamped = Math.max(0, Math.min(1, ema / 0.3));
  const r = Math.round(120 + 135 * clamped);
  const g = Math.round(200 - 130 * clamped);
  const b = 120;
  return `rgb(${r},${g},${b})`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fafafa' },
  content: { padding: 16, paddingBottom: 40 },
  h1: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  h2: { fontSize: 16, fontWeight: '600', marginTop: 18, marginBottom: 6 },
  muted: { fontSize: 12, color: '#666', marginBottom: 8, fontStyle: 'italic' },
  keyboard: { gap: 4, marginVertical: 8 },
  row: { flexDirection: 'row', justifyContent: 'center' },
  cell: {
    height: 38,
    marginHorizontal: 1,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellLabel: { fontSize: 13, fontWeight: '600', color: '#222' },
  cellPct: { fontSize: 9, color: '#333' },
  pairRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  pairText: { fontSize: 14, color: '#222' },
  arrow: { color: '#aaa' },
  pairCount: { fontSize: 14, color: '#666', fontVariant: ['tabular-nums'] },
});
