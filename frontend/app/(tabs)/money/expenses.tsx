import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus } from 'lucide-react-native';
import { Card, LoadingState, ErrorState, EmptyState } from '@/components/ui';
import { Colors, Spacing, Typography, formatCurrency, formatShortDate } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';
import { useFetch } from '@/lib/useFetch';
import * as moneyApi from '@/api/money';
import type { ExpenseCategory } from '@/lib/types';

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  rent: 'Rent',
  utilities: 'Utilities',
  salaries: 'Salaries',
  supplies: 'Supplies',
  marketing: 'Marketing',
  transport: 'Transport',
  maintenance: 'Maintenance',
  professional_fees: 'Professional Fees',
  taxes: 'Taxes',
  other: 'Other',
};

export default function ExpensesScreen() {
  const router = useRouter();
  const { organization } = useAuth();
  const currency = organization?.currency ?? 'USD';
  const expenses = useFetch(() => moneyApi.getExpenses(), []);
  const summary = useFetch(() => moneyApi.getExpenseSummary(), []);

  const total = expenses.data?.reduce((s, e) => s + e.amount, 0) ?? 0;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={Colors.neutral[700]} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Expenses</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/money/expense-add')} style={styles.addBtn}>
          <Plus size={22} color={Colors.primary[600]} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <View style={styles.summaryRow}>
        <Card padding="md" style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Expenses</Text>
          <Text style={styles.totalValue}>{formatCurrency(total, currency)}</Text>
        </Card>
      </View>

      {summary.data && summary.data.length > 0 && (
        <View style={styles.categoryBar}>
          {summary.data.slice(0, 5).map((s) => (
            <View key={s.category} style={styles.categoryPill}>
              <Text style={styles.categoryPillLabel}>{CATEGORY_LABELS[s.category]}</Text>
              <Text style={styles.categoryPillAmount}>{formatCurrency(s.total, currency)}</Text>
            </View>
          ))}
        </View>
      )}

      {expenses.loading && !expenses.data ? (
        <LoadingState />
      ) : expenses.error ? (
        <ErrorState message={expenses.error} onRetry={expenses.refetch} />
      ) : expenses.data && expenses.data.length === 0 ? (
        <EmptyState
          title="No expenses yet"
          message="Track your business spending by recording expenses."
          actionLabel="Add Expense"
          onAction={() => router.push('/(tabs)/money/expense-add')}
        />
      ) : (
        <FlatList
          data={expenses.data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card padding="md" style={styles.expenseRow}>
              <View style={styles.expenseInfo}>
                <View style={styles.categoryIcon}>
                  <Text style={styles.categoryIconText}>{CATEGORY_LABELS[item.category][0]}</Text>
                </View>
                <View>
                  <Text style={styles.expenseDesc}>{item.description}</Text>
                  <Text style={styles.expenseMeta}>{CATEGORY_LABELS[item.category]} · {formatShortDate(item.date)}</Text>
                </View>
              </View>
              <Text style={styles.expenseAmount}>-{formatCurrency(item.amount, currency)}</Text>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md, backgroundColor: Colors.neutral[0], borderBottomWidth: 1, borderBottomColor: Colors.neutral[200] },
  backBtn: { padding: Spacing.xs, marginRight: Spacing.sm },
  topTitle: { flex: 1, fontFamily: Typography.fontFamilyBold, fontSize: Typography.sizes.xl, color: Colors.neutral[900] },
  addBtn: { padding: Spacing.xs },
  summaryRow: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  totalCard: { alignItems: 'center' },
  totalLabel: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.sm, color: Colors.neutral[500] },
  totalValue: { fontFamily: Typography.fontFamilyBold, fontSize: Typography.sizes.xxxl, color: Colors.error[700], marginTop: Spacing.xs },
  categoryBar: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  categoryPill: { backgroundColor: Colors.neutral[100], borderRadius: 12, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  categoryPillLabel: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.xs, color: Colors.neutral[500] },
  categoryPillAmount: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.sm, color: Colors.neutral[900], marginTop: 2 },
  list: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xxl },
  expenseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  expenseInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  categoryIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.neutral[100], alignItems: 'center', justifyContent: 'center' },
  categoryIconText: { fontFamily: Typography.fontFamilyBold, fontSize: Typography.sizes.md, color: Colors.neutral[500] },
  expenseDesc: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.sm, color: Colors.neutral[900] },
  expenseMeta: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.xs, color: Colors.neutral[400], marginTop: 2 },
  expenseAmount: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.md, color: Colors.error[700] },
});
