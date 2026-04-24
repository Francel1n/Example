import React, { useEffect } from 'react';
import { StyleSheet, Text, Pressable, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { KeyDescriptor } from '@engine/types';
import { getTuning } from '@engine/tuning';

interface Props {
  desc: KeyDescriptor;
  currentWidth: number;   // ratio (ex: 1.0, 1.15, 0.85)
  unit: number;           // px par unité de baseWidth
  heatColor?: string;     // couleur d'arrière-plan (heatmap Stats)
  pressed?: boolean;
  shift?: boolean;
  onPress: (id: string) => void;
}

/**
 * Touche unique animée. La shared value `flex` est driven par currentWidth.
 * Durée d'animation = getTuning().ANIMATION_MS.
 */
export function Key({ desc, currentWidth, unit, heatColor, pressed, shift, onPress }: Props) {
  const animated = useSharedValue(currentWidth * unit);

  useEffect(() => {
    animated.value = withTiming(currentWidth * unit, {
      duration: getTuning().ANIMATION_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [currentWidth, unit]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: animated.value,
  }));

  const label = shift && desc.kind === 'letter' ? desc.label.toUpperCase() : desc.label;
  const isModifier = desc.kind === 'modifier';

  return (
    <Animated.View style={[styles.wrapper, animatedStyle]}>
      <Pressable
        style={({ pressed: pr }) => [
          styles.key,
          { backgroundColor: heatColor ?? (isModifier ? '#cfd5dd' : '#ffffff') },
          pr || pressed ? styles.keyPressed : null,
        ]}
        onPress={() => {
          Haptics.selectionAsync();
          onPress(desc.id);
        }}
      >
        <Text style={[styles.label, isModifier ? styles.labelModifier : null]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 2,
    paddingVertical: 3,
  },
  key: {
    height: 46,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 1,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  keyPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  label: {
    fontSize: 16,
    color: '#222',
    fontWeight: '500',
  },
  labelModifier: {
    fontSize: 13,
    color: '#555',
  },
});
