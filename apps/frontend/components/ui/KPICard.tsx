import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { colors, spacing, fontSizes, fontWeights, shadows, radius } from '@/theme';

interface KPICardProps {
  label: string;
  value: string;
  delta?: { value: string; positive: boolean } | null;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function KPICard({ label, value, delta, icon, style }: KPICardProps) {
  return (
    <View style={[styles.container, shadows.sm, style]}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        {icon && <View style={styles.iconWrap}>{icon}</View>}
      </View>
      <Text style={styles.value}>{value}</Text>
      {delta && (
        <View style={styles.deltaRow}>
          <Text style={[styles.delta, { color: delta.positive ? colors.success : colors.danger }]}>
            {delta.positive ? '↑' : '↓'} {delta.value}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    flex: 1,
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  } as ViewStyle,
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  label: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
    flexShrink: 1,
  } as TextStyle,
  value: {
    fontSize: fontSizes.xxl,
    color: colors.text,
    fontWeight: fontWeights.bold,
    marginTop: spacing.xs,
  } as TextStyle,
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  } as ViewStyle,
  delta: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
  } as TextStyle,
});
