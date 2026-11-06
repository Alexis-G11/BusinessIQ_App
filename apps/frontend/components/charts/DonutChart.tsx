import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, spacing, fontSizes, fontWeights } from '@/theme';

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSegment[];
  size?: number;
  centerLabel?: string;
  centerValue?: string;
}

export function DonutChart({ data, size = 160, centerLabel, centerValue }: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return (
      <View style={[styles.empty, { width: size, height: size }]}>
        <Text style={styles.emptyText}>No data</Text>
      </View>
    );
  }

  // Conic gradient via border trick (works on web); fallback to legend
  const segments = data.reduce<{
    values: (DonutSegment & { pct: number; start: number })[];
    cumulative: number;
  }>(
    (result, segment) => {
      const pct = segment.value / total;
      return {
        values: [...result.values, { ...segment, pct, start: result.cumulative }],
        cumulative: result.cumulative + pct,
      };
    },
    { values: [], cumulative: 0 },
  ).values;

  return (
    <View style={styles.container}>
      <View style={[styles.donut, { width: size, height: size, borderRadius: size / 2 }]}>
        <View
          style={[
            styles.donutInner,
            { width: size * 0.62, height: size * 0.62, borderRadius: size * 0.31 },
          ]}
        >
          {centerValue && <Text style={styles.centerValue}>{centerValue}</Text>}
          {centerLabel && <Text style={styles.centerLabel}>{centerLabel}</Text>}
        </View>
      </View>
      <View style={styles.legend}>
        {segments.map((s, i) => (
          <View key={i} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: s.color }]} />
            <Text style={styles.legendLabel}>{s.label}</Text>
            <Text style={styles.legendValue}>{(s.pct * 100).toFixed(1)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.lg,
  } as ViewStyle,
  donut: {
    borderWidth: 24,
    borderColor: colors.chart.primary,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  donutInner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  centerValue: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.text,
  } as TextStyle,
  centerLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  } as TextStyle,
  legend: {
    flex: 1,
    minWidth: 120,
  } as ViewStyle,
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  } as ViewStyle,
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  } as ViewStyle,
  legendLabel: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.text,
  } as TextStyle,
  legendValue: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  } as TextStyle,
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  emptyText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  } as TextStyle,
});
