import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { DemoScreen } from './native/screens/DemoScreen';
import { StatsScreen } from './native/screens/StatsScreen';
import { SettingsScreen } from './native/screens/SettingsScreen';
import { SqliteRepo } from './native/db/sqlite';
import { useKeyboardStore } from './native/store/keyboardStore';
import { Engine } from './engine/index';

const Tab = createBottomTabNavigator();

export default function App() {
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const setEngine = useKeyboardStore((s) => s.setEngine);
  const setWidths = useKeyboardStore((s) => s.setWidths);
  const setStats = useKeyboardStore((s) => s.setStats);

  useEffect(() => {
    (async () => {
      try {
        const repo = new SqliteRepo();
        const engine = new Engine({
          repo,
          events: {
            onWidthsChanged: (widths) => setWidths(widths),
            onStatsChanged: (m, s) => setStats(m, s),
          },
        });
        await engine.bootstrap();
        setEngine(engine);
        setWidths(engine.widthsSnapshot());
        setStats(engine.matrixSnapshot(), engine.statsSnapshot());
        setReady(true);
      } catch (e: any) {
        setErr(String(e?.message ?? e));
      }
    })();
  }, []);

  if (err) {
    return (
      <View style={styles.center}>
        <Text style={styles.err}>Init failed: {err}</Text>
      </View>
    );
  }
  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.loading}>Loading…</Text>
      </View>
    );
  }
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Tab.Navigator screenOptions={{ headerShown: false }}>
            <Tab.Screen name="Demo" component={DemoScreen} />
            <Tab.Screen name="Stats" component={StatsScreen} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
          </Tab.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loading: { marginTop: 8, color: '#666' },
  err: { color: '#a33', fontSize: 14, textAlign: 'center' },
});
