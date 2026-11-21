import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useBusiness } from '@/context/BusinessContext';
import { useDashboardStats, useSales, useExpenses } from '@/hooks/useBusinessData';
import { Card } from '@/components/ui/Card';
import { KPICard } from '@/components/ui/KPICard';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatRelative } from '@/lib/format';
import { colors, spacing, fontSizes, fontWeights } from '@/theme';
import { ShoppingCart, Receipt, TrendingUp, Package, Users } from 'lucide-react-native';

export default function TodayScreen() {
  const router = useRouter();
  const { currentBusiness } = useBusiness();
  const { stats, loading } = useDashboardStats();
  const { data: sales } = useSales();
  const { data: expenses } = useExpenses();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  if (loading) return <LoadingState message="Loading..." />;
  if (!currentBusiness || !stats) return <EmptyState title="No data" message="Start recording transactions to see today's summary." />;

  const currency = currentBusiness.currency;
  const currencyExponent = currentBusiness.currency_exponent;
  const todayStr = new Date().toISOString().split('T')[0];

  const todaySales = sales.filter((s) => s.created_at.startsWith(todayStr));
  const todayExpenses = expenses.filter((e) => e.expense_date === todayStr);

  const quickActions = [
    { label: 'New Sale', icon: ShoppingCart, href: '/(app)/sales/new', color: colors.blue },
    { label: 'Add Expense', icon: Receipt, href: '/(app)/expenses/new', color: colors.danger },
    { label: 'Add Product', icon: Package, href: '/(app)/products/new', color: colors.navy },
    { label: 'Add Customer', icon: Users, href: '/(app)/customers/new', color: colors.success },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Today</Text>
        <Text style={styles.pageSubtitle}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.label}
            style={styles.quickActionBtn}
            onPress={() => router.push(action.href as any)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: action.color }]}>
              <action.icon size={22} color={colors.textInverse} />
            </View>
            <Text style={styles.quickActionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Today Summary */}
      <View style={styles.kpiRow}>
        <KPICard
          label="Today's Sales"
          value={formatCurrency(stats.todaySales, currency, currencyExponent)}
          icon={<ShoppingCart size={16} color={colors.blue} />}
        />
        <KPICard
          label="Today's Expenses"
          value={formatCurrency(stats.todayExpenses, currency, currencyExponent)}
          icon={<Receipt size={16} color={colors.danger} />}
        />
        <KPICard
          label="Net Today"
          value={formatCurrency(stats.todaySales - stats.todayExpenses, currency, currencyExponent)}
          icon={<TrendingUp size={16} color={stats.todaySales >= stats.todayExpenses ? colors.success : colors.danger} />}
        />
      </View>

      {/* Recent Sales */}
      <Card>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Recent Sales</Text>
          <TouchableOpacity onPress={() => router.push('/(app)/sales' as any)}>
            <Text style={styles.viewAll}>View all</Text>
          </TouchableOpacity>
        </View>
        {todaySales.length === 0 ? (
          <Text style={styles.emptyText}>No sales recorded today.</Text>
        ) : (
          todaySales.slice(0, 5).map((sale) => (
            <View key={sale.id} style={styles.listItem}>
              <View style={styles.listItemLeft}>
                <Text style={styles.listItemTitle}>{sale.contact_name ?? 'Walk-in customer'}</Text>
                <Text style={styles.listItemMeta}>{sale.sale_number} · {formatRelative(sale.created_at)}</Text>
              </View>
              <View style={styles.listItemRight}>
                <Text style={styles.listItemAmount}>{formatCurrency(Number(sale.total), currency, currencyExponent)}</Text>
                <Badge label={sale.status} tone={sale.status === 'completed' ? 'success' : 'neutral'} />
              </View>
            </View>
          ))
        )}
      </Card>

      {/* Recent Expenses */}
      <Card>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Recent Expenses</Text>
          <TouchableOpacity onPress={() => router.push('/(app)/expenses' as any)}>
            <Text style={styles.viewAll}>View all</Text>
          </TouchableOpacity>
        </View>
        {todayExpenses.length === 0 ? (
          <Text style={styles.emptyText}>No expenses recorded today.</Text>
        ) : (
          todayExpenses.slice(0, 5).map((expense) => (
            <View key={expense.id} style={styles.listItem}>
              <View style={styles.listItemLeft}>
                <Text style={styles.listItemTitle}>{expense.description}</Text>
                <Text style={styles.listItemMeta}>{expense.category} · {formatRelative(expense.created_at)}</Text>
              </View>
              <View style={styles.listItemRight}>
                <Text style={[styles.listItemAmount, { color: colors.danger }]}>
                  -{formatCurrency(Number(expense.amount), currency, currencyExponent)}
                </Text>
              </View>
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background } as any,
  content: { padding: spacing.xl, gap: spacing.lg } as any,
  header: { marginBottom: spacing.sm } as any,
  pageTitle: { fontSize: fontSizes.xxl, fontWeight: fontWeights.bold, color: colors.text } as any,
  pageSubtitle: { fontSize: fontSizes.md, color: colors.textSecondary, marginTop: 4 } as any,
  quickActions: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  } as any,
  quickActionBtn: {
    flex: 1,
    minWidth: 140,
    alignItems: 'center',
    gap: spacing.sm,
  } as any,
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  } as any,
  quickActionLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.text,
  } as any,
  kpiRow: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' } as any,
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  } as any,
  cardTitle: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.text } as any,
  viewAll: { fontSize: fontSizes.sm, color: colors.blue, fontWeight: fontWeights.medium } as any,
  emptyText: { fontSize: fontSizes.sm, color: colors.textSecondary, paddingVertical: spacing.md } as any,
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  } as any,
  listItemLeft: { flex: 1 } as any,
  listItemTitle: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.text } as any,
  listItemMeta: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: 2 } as any,
  listItemRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm } as any,
  listItemAmount: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.text } as any,
});
