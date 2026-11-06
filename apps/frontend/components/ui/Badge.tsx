import React from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { colors, spacing, radius, fontSizes, fontWeights } from '@/theme';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'blue';

interface BadgeProps {
  label: string;
  tone?: Tone;
  size?: 'sm' | 'md';
}

export function Badge({ label, tone = 'neutral', size = 'sm' }: BadgeProps) {
  const { bg, fg } = toneColors(tone);
  return (
    <View style={[styles.badge, { backgroundColor: bg }, sizeStyles[size]]}>
      <Text style={[styles.label, { color: fg }, sizeTextStyles[size]]}>{label}</Text>
    </View>
  );
}

function toneColors(tone: Tone): { bg: string; fg: string } {
  switch (tone) {
    case 'success': return { bg: colors.successBg, fg: colors.success };
    case 'warning': return { bg: colors.warningBg, fg: colors.warning };
    case 'danger': return { bg: colors.dangerBg, fg: colors.danger };
    case 'info': return { bg: colors.infoBg, fg: colors.info };
    case 'blue': return { bg: '#E0EAFB', fg: colors.blue };
    default: return { bg: colors.surfaceAlt, fg: colors.textSecondary };
  }
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  } as ViewStyle,
  label: {
    fontWeight: fontWeights.medium,
  } as TextStyle,
});

const sizeStyles: Record<'sm' | 'md', ViewStyle> = {
  sm: { paddingVertical: 3, paddingHorizontal: spacing.sm },
  md: { paddingVertical: 5, paddingHorizontal: spacing.md },
};

const sizeTextStyles: Record<'sm' | 'md', TextStyle> = {
  sm: { fontSize: fontSizes.xs },
  md: { fontSize: fontSizes.sm },
};
