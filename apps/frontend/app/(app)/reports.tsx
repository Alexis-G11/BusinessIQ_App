import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useBusiness } from '@/context/BusinessContext';
import { useSales, useExpenses } from '@/hooks/useBusinessData';
import { Card } from '@/components/ui/Card';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { formatCurrency, formatDate } from '@/lib/format';
import { backendReportsApi, type BackendBalanceSheet, type BackendIncomeStatement } from '@/lib/backend';
import { colors, spacing, fontSizes, fontWeights } from '@/theme';
import { TrendingUp, TrendingDown, DollarSign, Wallet, ChevronDown, ChevronUp } from 'lucide-react-native';

type ReportType = 'income-statement' | 'balance-sheet' | 'cash-flow' | 'sales-summary' | 'expense-summary';

function currentMonthInTimezone(timezone: string, now: Date): { start: string; end: string } {
  let parts: Record<string, string>;
  try {
    parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now).map((part) => [part.type, part.value]));
  } catch {
    parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now).map((part) => [part.type, part.value]));
  }
  return {
    start: `${parts.year}-${parts.month}-01`,
    end: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

export default function ReportsScreen() {
  const { currentBusiness } = useBusiness();
  const { data: sales, loading: salesLoading } = useSales();
  const { data: expenses, loading: expensesLoading } = useExpenses();
  const [statement, setStatement] = useState<BackendIncomeStatement | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BackendBalanceSheet | null>(null);
  const [statementLoading, setStatementLoading] = useState(true);
  const [statementError, setStatementError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [openReport, setOpenReport] = useState<ReportType | null>('income-statement');

  const period = currentMonthInTimezone(currentBusiness?.timezone ?? 'UTC', new Date());
  const periodStart = period.start;
  const periodEnd = period.end;

  const loadStatement = useCallback(async () => {
    if (!currentBusiness) {
      setStatement(null);
      setBalanceSheet(null);
      setStatementLoading(false);
      return;
    }
    setStatementLoading(true);
    setStatementError(null);
    try {
      const [income, balance] = await Promise.all([
        backendReportsApi.incomeStatement(currentBusiness.id, periodStart, periodEnd),
        backendReportsApi.balanceSheet(currentBusiness.id, periodEnd),
      ]);
      setStatement(income);
      setBalanceSheet(balance);
    } catch (error) {
      setStatement(null);
      setBalanceSheet(null);
      setStatementError(error instanceof Error ? error.message : 'Could not load the income statement.');
    } finally {
      setStatementLoading(false);
    }
  }, [currentBusiness?.id, periodStart, periodEnd]);

  useEffect(() => {
    void loadStatement();
  }, [loadStatement]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStatement();
    setRefreshing(false);
  }, [loadStatement]);

  if (salesLoading || expensesLoading || statementLoading) return <LoadingState message="Loading reports..." />;
  if (!currentBusiness) return <EmptyState title="No business selected" message="Select a business to view its reports." />;

  const currency = statement?.currency ?? currentBusiness.currency;
  const currencyExponent = currentBusiness.currency_exponent ?? 2;

  const completedSales = sales.filter((s) => s.status === 'completed' && (s.sale_date ?? s.created_at.slice(0, 10)) >= periodStart && (s.sale_date ?? s.created_at.slice(0, 10)) <= periodEnd);
  const periodExpenses = expenses.filter((expense) => expense.expense_date >= periodStart && expense.expense_date <= periodEnd);
  const totalSalesRevenue = statement ? Number(statement.revenue) : 0;
  const totalExpensesAmount = statement ? Number(statement.operating_expenses) + Number(statement.other_expenses) : 0;
  const netIncome = statement ? Number(statement.net_income) : 0;

  const expenseByCat = periodExpenses.reduce((acc, e) => {
    const key = e.category;
    acc[key] = (acc[key] || 0) + Number(e.amount);
    return acc;
  }, {} as Record<string, number>);

  const reports: { id: ReportType; label: string; desc: string; icon: React.ReactNode }[] = [
    { id: 'income-statement', label: 'Income Statement', desc: 'Accrual basis · posted journal entries', icon: <TrendingUp size={20} color={colors.blue} /> },
    { id: 'balance-sheet', label: 'Balance Sheet', desc: `As of ${periodEnd} · current earnings included in equity`, icon: <DollarSign size={20} color={colors.info} /> },
    { id: 'cash-flow', label: 'Cash Flow Statement', desc: 'Not available until cash-flow classifications are implemented', icon: <Wallet size={20} color={colors.success} /> },
    { id: 'sales-summary', label: 'Sales Summary', desc: 'Completed sales in this period', icon: <DollarSign size={20} color={colors.info} /> },
    { id: 'expense-summary', label: 'Expense Summary', desc: 'Expenses by category', icon: <TrendingDown size={20} color={colors.danger} /> },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Reports</Text>
        <Text style={styles.pageSubtitle}>Financial reporting for {currentBusiness.name} · {periodStart} to {periodEnd}</Text>
      </View>

      {statementError && <Text accessibilityRole="alert" style={styles.errorText}>{statementError}</Text>}
      {statement && <Text style={styles.reportMeta}>Accrual basis · {currency} · Source: posted journal entries</Text>}

      <View style={styles.summaryRow}>
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Revenue</Text>
          <Text style={styles.summaryValue}>{statement ? formatCurrency(totalSalesRevenue, currency, currencyExponent) : '—'}</Text>
        </Card>
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Expenses (excludes COGS)</Text>
          <Text style={[styles.summaryValue, { color: colors.danger }]}>{statement ? formatCurrency(totalExpensesAmount, currency, currencyExponent) : '—'}</Text>
        </Card>
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Net Income</Text>
          <Text style={[styles.summaryValue, { color: netIncome >= 0 ? colors.success : colors.danger }]}>{statement ? formatCurrency(netIncome, currency, currencyExponent) : '—'}</Text>
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
                {!statement || statement.lines.length === 0 ? <Text style={styles.emptyText}>No posted income-statement activity in this period.</Text> : <>
                  <StatementRow label="Revenue, net of returns" value={Number(statement.revenue)} currency={currency} exponent={currencyExponent} />
                  <StatementRow label="Cost of goods sold" value={-Number(statement.cost_of_goods_sold)} currency={currency} exponent={currencyExponent} />
                  <View style={styles.statementDivider} />
                  <StatementRow label="Gross profit" value={Number(statement.gross_profit)} currency={currency} exponent={currencyExponent} bold />
                  <StatementRow label="Operating expenses" value={-Number(statement.operating_expenses)} currency={currency} exponent={currencyExponent} />
                  <StatementRow label="Operating income" value={Number(statement.operating_income)} currency={currency} exponent={currencyExponent} bold />
                  <StatementRow label="Other income" value={Number(statement.other_income)} currency={currency} exponent={currencyExponent} />
                  <StatementRow label="Other expenses" value={-Number(statement.other_expenses)} currency={currency} exponent={currencyExponent} />
                  <View style={styles.statementDivider} />
                  <StatementRow label="Net income" value={Number(statement.net_income)} currency={currency} exponent={currencyExponent} bold />
                </>}
              </View>
            )}

            {isOpen && report.id === 'cash-flow' && (
              <View style={styles.reportBody}>
                <Text style={styles.emptyText}>A cash-flow statement is not available yet. BusinessIQ needs cash-flow classifications and a reconciled report method before it can present this figure.</Text>
              </View>
            )}

            {isOpen && report.id === 'balance-sheet' && (
              <View style={styles.reportBody}>
                {!balanceSheet?.has_activity ? <Text style={styles.emptyText}>No posted balance-sheet activity exists as of this date.</Text> : <>
                  <Text style={styles.cfSection}>Assets</Text>
                  {balanceSheet.assets.map((line) => <FinancialLine key={line.account_code} label={`${line.account_code} ${line.account_name}`} value={Number(line.amount)} currency={currency} exponent={currencyExponent} />)}
                  <StatementRow label="Total assets" value={Number(balanceSheet.total_assets)} currency={currency} exponent={currencyExponent} bold />
                  <View style={styles.statementDivider} />
                  <Text style={styles.cfSection}>Liabilities</Text>
                  {balanceSheet.liabilities.map((line) => <FinancialLine key={line.account_code} label={`${line.account_code} ${line.account_name}`} value={Number(line.amount)} currency={currency} exponent={currencyExponent} />)}
                  <StatementRow label="Total liabilities" value={Number(balanceSheet.total_liabilities)} currency={currency} exponent={currencyExponent} bold />
                  <View style={styles.statementDivider} />
                  <Text style={styles.cfSection}>Equity</Text>
                  {balanceSheet.equity_accounts.map((line) => <FinancialLine key={line.account_code} label={`${line.account_code} ${line.account_name}`} value={Number(line.amount)} currency={currency} exponent={currencyExponent} />)}
                  <StatementRow label="Current earnings" value={Number(balanceSheet.current_earnings)} currency={currency} exponent={currencyExponent} />
                  <StatementRow label="Total equity" value={Number(balanceSheet.total_equity)} currency={currency} exponent={currencyExponent} bold />
                  <View style={styles.statementDivider} />
                  <StatementRow label="Liabilities and equity" value={Number(balanceSheet.liabilities_and_equity)} currency={currency} exponent={currencyExponent} bold />
                  <StatementRow label="Balance difference" value={Number(balanceSheet.difference)} currency={currency} exponent={currencyExponent} bold />
                  {!balanceSheet.is_balanced && <Text accessibilityRole="alert" style={styles.errorText}>This statement does not balance. Review posted journals and account setup.</Text>}
                </>}
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
                        <Text style={styles.listMeta}>{sale.sale_number} · {formatDate(sale.sale_date ?? sale.created_at)}</Text>
                      </View>
                      <Text style={styles.listAmount}>{formatCurrency(Number(sale.total), currency, currencyExponent)}</Text>
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
                      <Text style={styles.statementSubValue}>{formatCurrency(amount, currency, currencyExponent)}</Text>
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
  reportMeta: { fontSize: fontSizes.xs, color: colors.textSecondary },
  errorText: { color: colors.danger, fontSize: fontSizes.sm },
});

function StatementRow({ label, value, currency, exponent, bold = false }: { label: string; value: number; currency: string; exponent: number; bold?: boolean }) {
  const style = bold ? styles.statementBold : styles.statementValue;
  return (
    <View style={styles.statementRow}>
      <Text style={bold ? styles.statementBold : styles.statementLabel}>{label}</Text>
      <Text style={[style, value < 0 ? { color: colors.danger } : null]}>{value < 0 ? `(${formatCurrency(-value, currency, exponent)})` : formatCurrency(value, currency, exponent)}</Text>
    </View>
  );
}

function FinancialLine({ label, value, currency, exponent }: { label: string; value: number; currency: string; exponent: number }) {
  return <StatementRow label={label} value={value} currency={currency} exponent={exponent} />;
}
