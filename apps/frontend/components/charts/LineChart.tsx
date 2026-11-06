import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, spacing, fontSizes } from '@/theme';

export interface LineChartDatum {
  label: string;
  value: number;
}

interface LineChartProps {
  data: LineChartDatum[];
  height?: number;
  color?: string;
  currency?: string;
}

export function LineChart({ data, height = 180, color = colors.chart.primary, currency = 'USD' }: LineChartProps) {
  if (data.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>No data</Text>
      </View>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const minVal = Math.min(...data.map((d) => d.value), 0);
  const range = maxVal - minVal || 1;
  const chartHeight = height - 30; // Leave space for labels
  const barCount = data.length;
  const labelEvery = barCount > 8 ? Math.ceil(barCount / 6) : 1;

  return (
    <View style={{ height }}>
      <View style={styles.chartArea}>
        {data.map((d, i) => {
          const h = ((d.value - minVal) / range) * chartHeight;
          const showLabel = i % labelEvery === 0;
          return (
            <View key={i} style={styles.barCol}>
              <View style={styles.barSpace}>
                <View style={[styles.bar, { height: Math.max(h, 2), backgroundColor: color }]} />
              </View>
              {showLabel && <Text style={styles.barLabel} numberOfLines={1}>{d.label}</Text>}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  } as ViewStyle,
  barCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  } as ViewStyle,
  barSpace: {
    width: '60%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  } as ViewStyle,
  bar: {
    width: '100%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 2,
  } as ViewStyle,
  barLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
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
