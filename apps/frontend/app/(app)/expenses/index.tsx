import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useBusiness } from '@/context/BusinessContext';
import { useExpenses } from '@/hooks/useBusinessData';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/States';
import { formatCurrency, formatDate } from '@/lib/format';
import { colors, spacing, fontSizes, fontWeights } from '@/theme';
import { Plus, Search, Receipt } from 'lucide-react-native';

const CATEGORY_LABELS: Record<string, string> = {
  rent: 'Rent', utilities: 'Utilities', salaries: 'Salaries', supplies: 'Supplies',
  marketing: 'Marketing', transport: 'Transport', maintenance: 'Maintenance',
  professional_fees: 'Professional Fees', insurance: 'Insurance', taxes: 'Taxes', other: 'Other',
};

export default function ExpensesScreen() {
  const router = useRouter();
  const { currentBusiness } = useBusiness();
  const { data: expenses, loading, error, refetch } = useExpenses();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const filtered = expenses.filter((e) =>
    e.description.toLowerCase().includes(search.toLowerCase()) ||
    e.category.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingState message="Loading expenses..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const currency = currentBusiness?.currency ?? 'USD';
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Expenses</Text>
          <Text style={styles.pageSubtitle}>{expenses.length} records · {formatCurrency(totalExpenses, currency)} total</Text>
        </View>
        <Button label="Add Expense" onPress={() => router.push('/(app)/expenses/new' as any)} leftIcon={<Plus size={18} color={colors.textInverse} />} />
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput style={styles.searchInput} placeholder="Search expenses..." value={search} onChangeText={setSearch} placeholderTextColor={colors.textSecondary} />
        </View>
      </View>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            title={search ? "No matching expenses" : "No expenses yet"}
            message={search ? "Try a different search." : "Record your first expense to track spending."}
            icon={<Receipt size={28} color={colors.textSecondary} />}
          />
        </Card>
      ) : (
        <Card padding="md">
          {filtered.map((expense) => (
            <View key={expense.id} style={styles.tableRow}>
              <View style={styles.expenseInfo}>
                <Text style={styles.expenseDesc} numberOfLines={1}>{expense.description}</Text>
                <View style={styles.expenseMeta}>
                  <Badge label={CATEGORY_LABELS[expense.category] ?? expense.category} tone="neutral" />
                  <Text style={styles.expenseDate}>{formatDate(expense.expense_date)}</Text>
                  {expense.recurring && <Badge label="Recurring" tone="info" />}
                </View>
              </View>
              <Text style={styles.expenseAmount}>-{formatCurrency(Number(expense.amount), currency)}</Text>
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background } as any,
  content: { padding: spacing.xl, gap: spacing.lg } as any,
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } as any,
  pageTitle: { fontSize: fontSizes.xxl, fontWeight: fontWeights.bold, color: colors.text } as any,
  pageSubtitle: { fontSize: fontSizes.md, color: colors.textSecondary, marginTop: 4 } as any,
  searchRow: { flexDirection: 'row' } as any,
  searchInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: spacing.md, minHeight: 48, gap: spacing.sm,
  } as any,
  searchInput: { flex: 1, fontSize: fontSizes.md, color: colors.text, outlineStyle: 'none' } as any,
  tableRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  } as any,
  expenseInfo: { flex: 1 } as any,
  expenseDesc: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.text } as any,
  expenseMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 6 } as any,
  expenseDate: { fontSize: fontSizes.xs, color: colors.textSecondary } as any,
  expenseAmount: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.danger } as any,
});
