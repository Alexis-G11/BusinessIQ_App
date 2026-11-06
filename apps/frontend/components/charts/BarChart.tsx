import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, spacing, fontSizes } from '@/theme';

export interface BarChartDatum {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarChartDatum[];
  height?: number;
  currency?: string;
}

export function BarChart({ data, height = 200, currency = 'USD' }: BarChartProps) {
  if (data.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>No data</Text>
      </View>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const chartHeight = height - 40;

  return (
    <View style={{ height }}>
      <View style={styles.chartArea}>
        {data.map((d, i) => {
          const h = (d.value / maxVal) * chartHeight;
          return (
            <View key={i} style={styles.barCol}>
              <View style={styles.barSpace}>
                <View
                  style={[
                    styles.bar,
                    { height: Math.max(h, 2), backgroundColor: d.color ?? colors.chart.primary },
                  ]}
                />
              </View>
              <Text style={styles.barLabel} numberOfLines={2}>{d.label}</Text>
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
    marginHorizontal: 2,
  } as ViewStyle,
  barSpace: {
    width: '70%',
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
