import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useBusiness } from '@/context/BusinessContext';
import { useDashboardStats } from '@/hooks/useBusinessData';
import { Card } from '@/components/ui/Card';
import { LineChart } from '@/components/charts/LineChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { formatCompactCurrency } from '@/lib/format';
import { colors, spacing, fontSizes, fontWeights } from '@/theme';
import { TrendingUp, TrendingDown, DollarSign, Users, Package, ShoppingCart } from 'lucide-react-native';

export default function AnalyticsScreen() {
  const { currentBusiness } = useBusiness();
  const { stats, loading } = useDashboardStats();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  if (loading) return <LoadingState message="Loading analytics..." />;
  if (!currentBusiness || !stats) return <EmptyState title="No data" message="Start recording transactions to see analytics." />;

  const currency = currentBusiness.currency;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Business Analytics</Text>
        <Text style={styles.pageSubtitle}>{currentBusiness.name}</Text>
      </View>

      <View style={styles.metricsGrid}>
        <Card style={styles.metricCard}>
          <View style={styles.metricTop}>
            <View style={[styles.metricIcon, { backgroundColor: colors.infoBg }]}><DollarSign size={18} color={colors.info} /></View>
            <Text style={styles.metricLabel}>Revenue</Text>
          </View>
          <Text style={styles.metricValue}>{formatCompactCurrency(stats.revenue, currency)}</Text>
        </Card>
        <Card style={styles.metricCard}>
          <View style={styles.metricTop}>
            <View style={[styles.metricIcon, { backgroundColor: colors.dangerBg }]}><TrendingDown size={18} color={colors.danger} /></View>
            <Text style={styles.metricLabel}>Expenses</Text>
          </View>
          <Text style={styles.metricValue}>{formatCompactCurrency(stats.expenses, currency)}</Text>
        </Card>
        <Card style={styles.metricCard}>
          <View style={styles.metricTop}>
            <View style={[styles.metricIcon, { backgroundColor: colors.successBg }]}><TrendingUp size={18} color={colors.success} /></View>
            <Text style={styles.metricLabel}>Profit</Text>
          </View>
          <Text style={styles.metricValue}>{formatCompactCurrency(stats.profit, currency)}</Text>
        </Card>
        <Card style={styles.metricCard}>
          <View style={styles.metricTop}>
            <View style={[styles.metricIcon, { backgroundColor: '#E0EAFB' }]}><ShoppingCart size={18} color={colors.blue} /></View>
            <Text style={styles.metricLabel}>Sales</Text>
          </View>
          <Text style={styles.metricValue}>{String(stats.salesCount)}</Text>
        </Card>
        <Card style={styles.metricCard}>
          <View style={styles.metricTop}>
            <View style={[styles.metricIcon, { backgroundColor: colors.warningBg }]}><Users size={18} color={colors.warning} /></View>
            <Text style={styles.metricLabel}>Customers</Text>
          </View>
          <Text style={styles.metricValue}>{String(stats.customersCount)}</Text>
        </Card>
        <Card style={styles.metricCard}>
          <View style={styles.metricTop}>
            <View style={[styles.metricIcon, { backgroundColor: colors.surfaceAlt }]}><Package size={18} color={colors.navy} /></View>
            <Text style={styles.metricLabel}>Products</Text>
          </View>
          <Text style={styles.metricValue}>{String(stats.productsCount)}</Text>
        </Card>
      </View>

      <View style={styles.chartsRow}>
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>Revenue Trend (7 days)</Text>
          <LineChart data={stats.salesByDay} height={200} color={colors.blue} />
        </Card>
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>Expense Breakdown</Text>
          {stats.expenseByCategory.length > 0 ? (
            <DonutChart
              data={stats.expenseByCategory.map((e) => ({ label: e.label, value: e.value, color: e.color }))}
              size={140}
              centerLabel="Total"
              centerValue={formatCompactCurrency(stats.expenseByCategory.reduce((s, e) => s + e.value, 0), currency)}
            />
          ) : (
            <View style={styles.noData}><Text style={styles.noDataText}>No expense data</Text></View>
          )}
        </Card>
      </View>

      <View style={styles.chartsRow}>
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>Profit Margin</Text>
          <View style={styles.profitBox}>
            <Text style={[styles.profitValue, { color: stats.profit >= 0 ? colors.success : colors.danger }]}>
              {stats.revenue > 0 ? `${((stats.profit / stats.revenue) * 100).toFixed(1)}%` : '0%'}
            </Text>
            <Text style={styles.profitLabel}>
              {stats.profit >= 0 ? 'Your business is profitable' : 'Expenses exceed revenue'}
            </Text>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background } as any,
  content: { padding: spacing.xl, gap: spacing.lg } as any,
  header: { marginBottom: spacing.sm } as any,
  pageTitle: { fontSize: fontSizes.xxl, fontWeight: fontWeights.bold, color: colors.text } as any,
  pageSubtitle: { fontSize: fontSizes.md, color: colors.textSecondary, marginTop: 4 } as any,
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md } as any,
  metricCard: { flex: 1, minWidth: 180 } as any,
  metricTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md } as any,
  metricIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' } as any,
  metricLabel: { fontSize: fontSizes.sm, color: colors.textSecondary, fontWeight: fontWeights.medium } as any,
  metricValue: { fontSize: fontSizes.xxl, fontWeight: fontWeights.bold, color: colors.text } as any,
  chartsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md } as any,
  chartCard: { flex: 1, minWidth: 320 } as any,
  chartTitle: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.text, marginBottom: spacing.md } as any,
  noData: { height: 200, alignItems: 'center', justifyContent: 'center' } as any,
  noDataText: { color: colors.textSecondary, fontSize: fontSizes.sm } as any,
  profitBox: { paddingVertical: spacing.lg, alignItems: 'center', gap: spacing.sm } as any,
  profitValue: { fontSize: fontSizes.xxxl, fontWeight: fontWeights.bold } as any,
  profitLabel: { fontSize: fontSizes.sm, color: colors.textSecondary } as any,
});
