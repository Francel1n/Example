import { create } from 'zustand';
import { TUNING } from '@engine/tuning';

/**
 * Store des réglages modifiables depuis l'écran Settings.
 * ⚠️ Ces valeurs sont des OVERRIDES sur TUNING (qui fournit les defaults).
 * Lues par le Keyboard et par Engine.compute() via engine.setRuntimeTuning().
 *
 * Pour ajouter un nouveau knob :
 *   1) Ajouter la constante dans src/engine/tuning.ts
 *   2) Ajouter le state + setter ici
 *   3) Ajouter un slider dans SettingsScreen.tsx
 */
interface SettingsState {
  adaptiveEnabled: boolean;
  autocorrectEnabled: boolean;
  deadband: number;
  maxDelta: number;
  emaAlpha: number;
  cooldownMs: number;
  setAdaptiveEnabled: (v: boolean) => void;
  setAutocorrectEnabled: (v: boolean) => void;
  setDeadband: (v: number) => void;
  setMaxDelta: (v: number) => void;
  setEmaAlpha: (v: number) => void;
  setCooldownMs: (v: number) => void;
  reset: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  adaptiveEnabled: true,
  autocorrectEnabled: true,
  deadband: TUNING.DEADBAND,
  maxDelta: TUNING.MAX_DELTA_RATIO,
  emaAlpha: TUNING.EMA_ALPHA,
  cooldownMs: TUNING.COOLDOWN_MS,
  setAdaptiveEnabled: (adaptiveEnabled) => set({ adaptiveEnabled }),
  setAutocorrectEnabled: (autocorrectEnabled) => set({ autocorrectEnabled }),
  setDeadband: (deadband) => set({ deadband }),
  setMaxDelta: (maxDelta) => set({ maxDelta }),
  setEmaAlpha: (emaAlpha) => set({ emaAlpha }),
  setCooldownMs: (cooldownMs) => set({ cooldownMs }),
  reset: () =>
    set({
      adaptiveEnabled: true,
      autocorrectEnabled: true,
      deadband: TUNING.DEADBAND,
      maxDelta: TUNING.MAX_DELTA_RATIO,
      emaAlpha: TUNING.EMA_ALPHA,
      cooldownMs: TUNING.COOLDOWN_MS,
    }),
}));
