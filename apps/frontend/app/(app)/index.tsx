import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useBusiness } from '@/context/BusinessContext';
import { useDashboardStats } from '@/hooks/useBusinessData';
import { Card } from '@/components/ui/Card';
import { KPICard } from '@/components/ui/KPICard';
import { LineChart } from '@/components/charts/LineChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { formatCompactCurrency } from '@/lib/format';
import { colors, spacing, fontSizes, fontWeights } from '@/theme';
import { DollarSign, TrendingUp, Receipt, Wallet, Users, Package, AlertTriangle, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react-native';

export default function DashboardScreen() {
  const { currentBusiness } = useBusiness();
  const { stats, loading } = useDashboardStats();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  if (loading) return <LoadingState message="Loading dashboard..." />;

  if (!currentBusiness) {
    return <EmptyState title="No business selected" message="Create or select a business to view your dashboard." />;
  }

  if (!stats) return <EmptyState title="No data yet" message="Start recording sales and expenses to see your dashboard." />;

  const currency = currentBusiness.currency;
  const currencyExponent = currentBusiness.currency_exponent ?? 2;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Business Overview</Text>
        <Text style={styles.pageSubtitle}>{currentBusiness.name}</Text>
      </View>

      {/* KPI Row */}
      <View style={styles.kpiRow}>
        <KPICard
          label="Revenue (MTD)"
          value={formatCompactCurrency(stats.monthRevenue, currency, currencyExponent)}
          icon={<TrendingUp size={16} color={colors.blue} />}
        />
        <KPICard
          label="Expenses (MTD)"
          value={formatCompactCurrency(stats.monthExpenses, currency, currencyExponent)}
          icon={<Receipt size={16} color={colors.danger} />}
        />
        <KPICard
          label="Net Profit (MTD)"
          value={formatCompactCurrency(stats.monthRevenue - stats.monthExpenses, currency, currencyExponent)}
          icon={<DollarSign size={16} color={colors.success} />}
          delta={stats.monthRevenue > 0 ? { value: `${((stats.monthRevenue - stats.monthExpenses) / stats.monthRevenue * 100).toFixed(0)}% margin`, positive: stats.monthRevenue > stats.monthExpenses } : null}
        />
        <KPICard
          label="Cash Position"
          value={formatCompactCurrency(stats.revenue - stats.expenses, currency, currencyExponent)}
          icon={<Wallet size={16} color={colors.info} />}
        />
      </View>

      {/* Second KPI Row */}
      <View style={styles.kpiRow}>
        <KPICard
          label="Customers"
          value={String(stats.customersCount)}
          icon={<Users size={16} color={colors.blue} />}
        />
        <KPICard
          label="Products"
          value={String(stats.productsCount)}
          icon={<Package size={16} color={colors.navy} />}
        />
        <KPICard
          label="Receivables"
          value={formatCompactCurrency(stats.receivables, currency, currencyExponent)}
          icon={<ArrowDownToLine size={16} color={colors.warning} />}
        />
        <KPICard
          label="Payables"
          value={formatCompactCurrency(stats.payables, currency, currencyExponent)}
          icon={<ArrowUpFromLine size={16} color={colors.danger} />}
        />
      </View>

      {/* Charts */}
      <View style={styles.chartsRow}>
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>Revenue (Last 7 Days)</Text>
          <LineChart data={stats.salesByDay} height={200} color={colors.blue} />
        </Card>
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>Expenses by Category</Text>
          {stats.expenseByCategory.length > 0 ? (
            <DonutChart
              data={stats.expenseByCategory.map((e) => ({ label: e.label, value: e.value, color: e.color }))}
              size={140}
              centerLabel="Total"
              centerValue={formatCompactCurrency(stats.expenseByCategory.reduce((s, e) => s + e.value, 0), currency, currencyExponent)}
            />
          ) : (
            <View style={styles.noChartData}>
              <Text style={styles.noDataText}>No expense data</Text>
            </View>
          )}
        </Card>
      </View>

      {/* Alerts */}
      {stats.lowStockCount > 0 && (
        <Card style={styles.alertCard}>
          <View style={styles.alertRow}>
            <View style={styles.alertIcon}>
              <AlertTriangle size={20} color={colors.warning} />
            </View>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>{stats.lowStockCount} product{stats.lowStockCount > 1 ? 's' : ''} need restocking</Text>
              <Text style={styles.alertMsg}>Some products have reached or fallen below their reorder threshold.</Text>
            </View>
          </View>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background } as any,
  content: { padding: spacing.xl, gap: spacing.lg } as any,
  header: { marginBottom: spacing.sm } as any,
  pageTitle: { fontSize: fontSizes.xxl, fontWeight: fontWeights.bold, color: colors.text } as any,
  pageSubtitle: { fontSize: fontSizes.md, color: colors.textSecondary, marginTop: 4 } as any,
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  } as any,
  chartsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  } as any,
  chartCard: { flex: 1, minWidth: 320 } as any,
  chartTitle: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.text, marginBottom: spacing.md } as any,
  noChartData: { height: 200, alignItems: 'center', justifyContent: 'center' } as any,
  noDataText: { color: colors.textSecondary, fontSize: fontSizes.sm } as any,
  alertCard: { borderColor: colors.warningBg, borderWidth: 2 } as any,
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md } as any,
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.warningBg,
    alignItems: 'center',
    justifyContent: 'center',
  } as any,
  alertContent: { flex: 1 } as any,
  alertTitle: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.text } as any,
  alertMsg: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2 } as any,
});
