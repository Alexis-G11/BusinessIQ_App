import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useBusiness } from '@/context/BusinessContext';
import { useDashboardStats, useSales, useExpenses } from '@/hooks/useBusinessData';
import { Card } from '@/components/ui/Card';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { formatCurrency, formatDate } from '@/lib/format';
import { colors, spacing, fontSizes, fontWeights } from '@/theme';
import { TrendingUp, TrendingDown, DollarSign, Wallet, ChevronDown, ChevronUp } from 'lucide-react-native';

type ReportType = 'income-statement' | 'cash-flow' | 'sales-summary' | 'expense-summary';

export default function ReportsScreen() {
  const { currentBusiness } = useBusiness();
  const { stats, loading } = useDashboardStats();
  const { data: sales } = useSales();
  const { data: expenses } = useExpenses();
  const [refreshing, setRefreshing] = useState(false);
  const [openReport, setOpenReport] = useState<ReportType | null>('income-statement');

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  if (loading) return <LoadingState message="Loading reports..." />;
  if (!currentBusiness || !stats) return <EmptyState title="No data" message="Record transactions to generate reports." />;

  const currency = currentBusiness.currency;

  const completedSales = sales.filter((s) => s.status === 'completed');
  const totalSalesRevenue = completedSales.reduce((sum, s) => sum + Number(s.total), 0);
  const totalExpensesAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const netProfit = totalSalesRevenue - totalExpensesAmount;

  const expenseByCat = expenses.reduce((acc, e) => {
    const key = e.category;
    acc[key] = (acc[key] || 0) + Number(e.amount);
    return acc;
  }, {} as Record<string, number>);

  const paymentsIn = sales.filter((s) => s.status === 'completed').reduce((sum, s) => sum + Number(s.paid_amount), 0);
  const paymentsOut = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const netCashFlow = paymentsIn - paymentsOut;

  const reports: { id: ReportType; label: string; desc: string; icon: React.ReactNode }[] = [
    { id: 'income-statement', label: 'Income Statement', desc: 'Revenue, expenses, and profit', icon: <TrendingUp size={20} color={colors.blue} /> },
    { id: 'cash-flow', label: 'Cash Flow Statement', desc: 'Cash inflows and outflows', icon: <Wallet size={20} color={colors.success} /> },
    { id: 'sales-summary', label: 'Sales Summary', desc: 'All completed sales', icon: <DollarSign size={20} color={colors.info} /> },
    { id: 'expense-summary', label: 'Expense Summary', desc: 'Expenses by category', icon: <TrendingDown size={20} color={colors.danger} /> },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Reports</Text>
        <Text style={styles.pageSubtitle}>Financial reporting for {currentBusiness.name}</Text>
      </View>

      <View style={styles.summaryRow}>
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Revenue</Text>
          <Text style={styles.summaryValue}>{formatCurrency(totalSalesRevenue, currency)}</Text>
        </Card>
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Expenses</Text>
          <Text style={[styles.summaryValue, { color: colors.danger }]}>{formatCurrency(totalExpensesAmount, currency)}</Text>
        </Card>
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Net Profit</Text>
          <Text style={[styles.summaryValue, { color: netProfit >= 0 ? colors.success : colors.danger }]}>{formatCurrency(netProfit, currency)}</Text>
        </Card>
      </View>

      <Text style={styles.sectionTitle}>Available Reports</Text>
      {reports.map((report) => {
        const isOpen = openReport === report.id;
        return (
          <Card key={report.id} style={styles.reportCard}>
            <TouchableOpacity style={styles.reportHeader} onPress={() => setOpenReport(isOpen ? null : report.id)}>
              <View style={styles.reportIcon}>{report.icon}</View>
              <View style={styles.reportInfo}>
                <Text style={styles.reportLabel}>{report.label}</Text>
                <Text style={styles.reportDesc}>{report.desc}</Text>
              </View>
              {isOpen ? <ChevronUp size={18} color={colors.textSecondary} /> : <ChevronDown size={18} color={colors.textSecondary} />}
            </TouchableOpacity>

            {isOpen && report.id === 'income-statement' && (
              <View style={styles.reportBody}>
                <View style={styles.statementRow}>
                  <Text style={styles.statementLabel}>Revenue (Sales)</Text>
                  <Text style={styles.statementValue}>{formatCurrency(totalSalesRevenue, currency)}</Text>
                </View>
                <View style={styles.statementDivider} />
                {Object.entries(expenseByCat).map(([cat, amount]) => (
                  <View key={cat} style={styles.statementRow}>
                    <Text style={styles.statementSubLabel}>{cat.replace(/_/g, ' ')}</Text>
                    <Text style={[styles.statementSubValue, { color: colors.danger }]}>({formatCurrency(amount, currency)})</Text>
                  </View>
                ))}
                <View style={styles.statementDivider} />
                <View style={styles.statementRow}>
                  <Text style={styles.statementBold}>Net Profit</Text>
                  <Text style={[styles.statementBold, { color: netProfit >= 0 ? colors.success : colors.danger }]}>{formatCurrency(netProfit, currency)}</Text>
                </View>
              </View>
            )}

            {isOpen && report.id === 'cash-flow' && (
              <View style={styles.reportBody}>
                <Text style={styles.cfSection}>Cash Inflows</Text>
                <View style={styles.statementRow}>
                  <Text style={styles.statementLabel}>Sales Payments Received</Text>
                  <Text style={[styles.statementValue, { color: colors.success }]}>{formatCurrency(paymentsIn, currency)}</Text>
                </View>
                <View style={styles.statementDivider} />
                <Text style={styles.cfSection}>Cash Outflows</Text>
                <View style={styles.statementRow}>
                  <Text style={styles.statementLabel}>Expenses Paid</Text>
                  <Text style={[styles.statementValue, { color: colors.danger }]}>({formatCurrency(paymentsOut, currency)})</Text>
                </View>
                <View style={styles.statementDivider} />
                <View style={styles.statementRow}>
                  <Text style={styles.statementBold}>Net Cash Flow</Text>
                  <Text style={[styles.statementBold, { color: netCashFlow >= 0 ? colors.success : colors.danger }]}>{formatCurrency(netCashFlow, currency)}</Text>
                </View>
              </View>
            )}

            {isOpen && report.id === 'sales-summary' && (
              <View style={styles.reportBody}>
                {completedSales.length === 0 ? (
                  <Text style={styles.emptyText}>No completed sales yet.</Text>
                ) : (
                  completedSales.slice(0, 20).map((sale) => (
                    <View key={sale.id} style={styles.listRow}>
                      <View>
                        <Text style={styles.listTitle}>{sale.contact_name ?? 'Walk-in'}</Text>
                        <Text style={styles.listMeta}>{sale.sale_number} · {formatDate(sale.created_at)}</Text>
                      </View>
                      <Text style={styles.listAmount}>{formatCurrency(Number(sale.total), currency)}</Text>
                    </View>
                  ))
                )}
              </View>
            )}

            {isOpen && report.id === 'expense-summary' && (
              <View style={styles.reportBody}>
                {Object.entries(expenseByCat).length === 0 ? (
                  <Text style={styles.emptyText}>No expenses recorded yet.</Text>
                ) : (
                  Object.entries(expenseByCat).sort((a, b) => b[1] - a[1]).map(([cat, amount]) => (
                    <View key={cat} style={styles.statementRow}>
                      <Text style={styles.statementSubLabel}>{cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</Text>
                      <Text style={styles.statementSubValue}>{formatCurrency(amount, currency)}</Text>
                    </View>
                  ))
                )}
              </View>
            )}
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
  summaryRow: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' } as any,
  summaryCard: { flex: 1, minWidth: 200 } as any,
  summaryLabel: { fontSize: fontSizes.sm, color: colors.textSecondary, fontWeight: fontWeights.medium } as any,
  summaryValue: { fontSize: fontSizes.xl, fontWeight: fontWeights.bold, color: colors.text, marginTop: spacing.xs } as any,
  sectionTitle: { fontSize: fontSizes.lg, fontWeight: fontWeights.semibold, color: colors.text, marginTop: spacing.md } as any,
  reportCard: { marginBottom: spacing.sm } as any,
  reportHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md } as any,
  reportIcon: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#E0EAFB', alignItems: 'center', justifyContent: 'center' } as any,
  reportInfo: { flex: 1 } as any,
  reportLabel: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.text } as any,
  reportDesc: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2 } as any,
  reportBody: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border } as any,
  statementRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs } as any,
  statementLabel: { fontSize: fontSizes.sm, color: colors.text } as any,
  statementValue: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.text } as any,
  statementSubLabel: { fontSize: fontSizes.sm, color: colors.textSecondary, textTransform: 'capitalize' } as any,
  statementSubValue: { fontSize: fontSizes.sm, color: colors.text } as any,
  statementDivider: { borderTopWidth: 1, borderTopColor: colors.border, marginVertical: spacing.sm } as any,
  statementBold: { fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.text } as any,
  cfSection: { fontSize: fontSizes.xs, fontWeight: fontWeights.semibold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.xs, marginTop: spacing.xs } as any,
  emptyText: { fontSize: fontSizes.sm, color: colors.textSecondary, paddingVertical: spacing.md, textAlign: 'center' } as any,
  listRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border } as any,
  listTitle: { fontSize: fontSizes.sm, fontWeight: fontWeights.medium, color: colors.text } as any,
  listMeta: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: 2 } as any,
  listAmount: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.text } as any,
});
