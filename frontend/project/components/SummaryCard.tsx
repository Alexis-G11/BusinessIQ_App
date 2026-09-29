// Summary Card — used in Today screen and dashboard views

import { type ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from './ui';
import { Colors, Spacing, Typography, formatCurrency, formatCompact } from '../lib/theme';

interface SummaryCardProps {
  label: string;
  value: number | string;
  currency?: string;
  icon?: ReactNode;
  color?: string;
  isCurrency?: boolean;
  subtitle?: string;
  trend?: { value: number; isPositive: boolean };
}

export function SummaryCard({ label, value, currency = 'USD', icon, color = Colors.primary[600], isCurrency = true, subtitle, trend }: SummaryCardProps) {
  const displayValue = isCurrency ? formatCurrency(value as number, currency) : formatCompact(value as number);

  return (
    <Card padding="md" style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: `${color}15` }]}>
          {icon}
        </View>
        {trend && (
          <View style={[styles.trendBadge, { backgroundColor: trend.isPositive ? Colors.success[50] : Colors.error[50] }]}>
            <Text style={[styles.trendText, { color: trend.isPositive ? Colors.success[700] : Colors.error[700] }]}>
              {trend.isPositive ? '▲' : '▼'} {Math.abs(trend.value)}%
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{displayValue}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 120,
  justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: 6,
  },
  trendText: {
    fontFamily: Typography.fontFamilySemiBold,
    fontSize: Typography.sizes.xs,
  },
  label: {
    fontFamily: Typography.fontFamilyMedium,
    fontSize: Typography.sizes.sm,
    color: Colors.neutral[500],
    marginTop: Spacing.sm,
  },
  value: {
    fontFamily: Typography.fontFamilyBold,
    fontSize: Typography.sizes.xl,
    color: Colors.neutral[900],
    marginTop: Spacing.xs,
  },
  subtitle: {
    fontFamily: Typography.fontFamilyRegular,
    fontSize: Typography.sizes.xs,
    color: Colors.neutral[400],
    marginTop: 2,
  },
});
