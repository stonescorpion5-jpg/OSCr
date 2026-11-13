import React from 'react';
import { View } from 'react-native';
import type { SliderProps } from '@react-native-community/slider';
// The browser's range input supports keyboard input and rotated hit testing.
export default function Slider({ style, value = 0, minimumValue = 0, maximumValue = 1, step = 0.001, disabled, minimumTrackTintColor, accessibilityLabel, onValueChange, onSlidingComplete }: SliderProps) {
  return <View style={[{ height: 40, justifyContent: 'center' }, style]}><input type="range" aria-label={accessibilityLabel} min={minimumValue} max={maximumValue} step={step || 0.001} value={value} disabled={disabled} onChange={e => onValueChange?.(Number(e.target.value))} onPointerUp={e => onSlidingComplete?.(Number(e.currentTarget.value))} style={{ width: '100%', margin: 0, accentColor: String(minimumTrackTintColor || '#6de0bc'), opacity: disabled ? .3 : 1, cursor: disabled ? 'default' : 'pointer' }} /></View>;
}
