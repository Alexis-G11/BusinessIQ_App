import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useBusiness } from '@/context/BusinessContext';
import { useDashboardStats } from '@/hooks/useBusinessData';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { formatCompactCurrency } from '@/lib/format';
import { colors, spacing, fontSizes, fontWeights } from '@/theme';
import { Activity, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react-native';

export default function HealthScreen() {
  const { currentBusiness } = useBusiness();
  const { stats, loading } = useDashboardStats();

  if (loading) return <LoadingState message="Checking business health..." />;
  if (!currentBusiness || !stats) return <EmptyState title="No data" message="Record transactions to see your business health." />;

  const currency = currentBusiness.currency;
  const currencyExponent = currentBusiness.currency_exponent ?? 2;
  const profitMargin = stats.revenue > 0 ? (stats.profit / stats.revenue) * 100 : 0;
  const isProfitable = stats.profit > 0;
  const hasLowStock = stats.lowStockCount > 0;
  const hasReceivables = stats.receivables > 0;
  const hasPayables = stats.payables > 0;

  const checks = [
    {
      label: 'Profitability',
      status: isProfitable ? 'good' : 'warning',
      message: isProfitable
        ? `Your business is profitable with a ${profitMargin.toFixed(1)}% profit margin.`
        : `Your expenses exceed revenue. Consider reducing costs or increasing prices.`,
      icon: TrendingUp,
    },
    {
      label: 'Cash Position',
      status: stats.revenue - stats.expenses > 0 ? 'good' : 'warning',
      message: `Net cash flow is ${formatCompactCurrency(stats.revenue - stats.expenses, currency, currencyExponent)}.`,
      icon: Activity,
    },
    {
      label: 'Inventory',
      status: hasLowStock ? 'warning' : 'good',
      message: hasLowStock
        ? `${stats.lowStockCount} product(s) need restocking.`
        : 'All products are above reorder thresholds.',
      icon: AlertTriangle,
    },
    {
      label: 'Receivables',
      status: hasReceivables ? 'info' : 'good',
      message: hasReceivables
        ? `${formatCompactCurrency(stats.receivables, currency, currencyExponent)} outstanding from customers.`
        : 'No outstanding receivables.',
      icon: CheckCircle,
    },
    {
      label: 'Payables',
      status: hasPayables ? 'info' : 'good',
      message: hasPayables
        ? `${formatCompactCurrency(stats.payables, currency, currencyExponent)} owed to suppliers.`
        : 'No outstanding payables.',
      icon: CheckCircle,
    },
  ];

  const overallScore = checks.filter((c) => c.status === 'good').length;
  const healthPercent = (overallScore / checks.length) * 100;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Business Health</Text>
        <Text style={styles.pageSubtitle}>{currentBusiness.name}</Text>
      </View>

      <Card>
        <View style={styles.scoreRow}>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreValue}>{healthPercent.toFixed(0)}</Text>
            <Text style={styles.scoreUnit}>%</Text>
          </View>
          <View style={styles.scoreInfo}>
            <Text style={styles.scoreTitle}>Overall Health Score</Text>
            <Text style={styles.scoreDesc}>
              {healthPercent >= 80 ? 'Your business is in excellent shape.' :
               healthPercent >= 60 ? 'Your business is doing well with some areas to improve.' :
               'Several areas need attention to improve business health.'}
            </Text>
          </View>
        </View>
      </Card>

      {checks.map((check) => {
        const Icon = check.icon;
        const tone = check.status === 'good' ? 'success' : check.status === 'warning' ? 'warning' : 'info';
        const color = check.status === 'good' ? colors.success : check.status === 'warning' ? colors.warning : colors.info;
        const bg = check.status === 'good' ? colors.successBg : check.status === 'warning' ? colors.warningBg : colors.infoBg;
        return (
          <Card key={check.label}>
            <View style={styles.checkRow}>
              <View style={[styles.checkIcon, { backgroundColor: bg }]}>
                <Icon size={20} color={color} />
              </View>
              <View style={styles.checkContent}>
                <View style={styles.checkHeader}>
                  <Text style={styles.checkLabel}>{check.label}</Text>
                  <Badge label={check.status === 'good' ? 'Good' : check.status === 'warning' ? 'Attention' : 'Info'} tone={tone as any} />
                </View>
                <Text style={styles.checkMsg}>{check.message}</Text>
              </View>
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background } as any,
  content: { padding: spacing.xl, gap: spacing.lg } as any,
  header: { marginBottom: spacing.sm } as any,
  pageTitle: { fontSize: fontSizes.xxl, fontWeight: fontWeights.bold, color: colors.text } as any,
  pageSubtitle: { fontSize: fontSizes.md, color: colors.textSecondary, marginTop: 4 } as any,
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl } as any,
  scoreCircle: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: colors.blue, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' } as any,
  scoreValue: { fontSize: fontSizes.xxl, fontWeight: fontWeights.bold, color: colors.blue } as any,
  scoreUnit: { fontSize: fontSizes.md, color: colors.blue, marginTop: 6 } as any,
  scoreInfo: { flex: 1 } as any,
  scoreTitle: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.text, marginBottom: 4 } as any,
  scoreDesc: { fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 22 } as any,
  checkRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' } as any,
  checkIcon: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' } as any,
  checkContent: { flex: 1 } as any,
  checkHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 } as any,
  checkLabel: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.text } as any,
  checkMsg: { fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 22 } as any,
});
