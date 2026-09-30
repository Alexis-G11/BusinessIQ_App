import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Receipt, ShoppingBag, ArrowLeftRight, TrendingDown, TrendingUp, ArrowRight } from 'lucide-react-native';
import { Header, Card, SectionHeader, LoadingState, ErrorState } from '@/components/ui';
import { Colors, Spacing, Typography, formatCurrency, formatShortDate } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';
import { useFetch } from '@/lib/useFetch';
import * as moneyApi from '@/api/money';

export default function MoneyHome() {
  const router = useRouter();
  const { organization } = useAuth();
  const currency = organization?.currency ?? 'USD';
  const expenses = useFetch(() => moneyApi.getExpenses(), []);
  const payments = useFetch(() => moneyApi.getPayments(), []);
  const receivables = useFetch(() => moneyApi.getReceivables(), []);
  const payables = useFetch(() => moneyApi.getPayables(), []);

  const totalReceivable = receivables.data?.reduce((s, r) => s + r.amount, 0) ?? 0;
  const totalPayable = payables.data?.reduce((s, p) => s + p.amount, 0) ?? 0;
  const totalExpenses = expenses.data?.reduce((s, e) => s + e.amount, 0) ?? 0;

  const actions = [
    { label: 'Add Expense', icon: <Receipt size={22} color={Colors.neutral[0]} strokeWidth={2} />, color: Colors.error[600], route: '/(tabs)/money/expense-add' as const },
    { label: 'Purchases', icon: <ShoppingBag size={22} color={Colors.neutral[0]} strokeWidth={2} />, color: Colors.primary[600], route: '/(tabs)/money/purchases' as const },
    { label: 'Record Payment', icon: <ArrowLeftRight size={22} color={Colors.neutral[0]} strokeWidth={2} />, color: Colors.secondary[600], route: '/(tabs)/money/payment-add' as const },
  ];

  return (
    <View style={styles.container}>
      <Header title="Money" subtitle="Expenses, payments, and balances" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.actionRow}>
          {actions.map((a) => (
            <TouchableOpacity key={a.label} onPress={() => router.push(a.route)} style={[styles.actionBtn, { backgroundColor: a.color }]}>
              {a.icon}
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.balanceRow}>
          <Card padding="md" style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <TrendingUp size={18} color={Colors.success[600]} strokeWidth={2} />
              <Text style={styles.balanceLabel}>Receivable</Text>
            </View>
            <Text style={[styles.balanceValue, { color: Colors.success[700] }]}>{formatCurrency(totalReceivable, currency)}</Text>
            <Text style={styles.balanceSub}>{receivables.data?.length ?? 0} outstanding invoices</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/money/receivables')} style={styles.balanceLink}>
              <Text style={styles.balanceLinkText}>View details</Text>
              <ArrowRight size={14} color={Colors.success[600]} strokeWidth={2} />
            </TouchableOpacity>
          </Card>

          <Card padding="md" style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <TrendingDown size={18} color={Colors.error[600]} strokeWidth={2} />
              <Text style={styles.balanceLabel}>Payable</Text>
            </View>
            <Text style={[styles.balanceValue, { color: Colors.error[700] }]}>{formatCurrency(totalPayable, currency)}</Text>
            <Text style={styles.balanceSub}>{payables.data?.length ?? 0} unpaid bills</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/money/payables')} style={styles.balanceLink}>
              <Text style={styles.balanceLinkText}>View details</Text>
              <ArrowRight size={14} color={Colors.error[600]} strokeWidth={2} />
            </TouchableOpacity>
          </Card>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Recent Expenses" actionLabel="See all" onAction={() => router.push('/(tabs)/money/expenses')} />
          {expenses.loading && !expenses.data ? (
            <LoadingState />
          ) : expenses.error ? (
            <ErrorState message={expenses.error} onRetry={expenses.refetch} />
          ) : expenses.data && expenses.data.length > 0 ? (
            expenses.data.slice(0, 4).map((exp) => (
              <Card key={exp.id} padding="md" style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle}>{exp.description}</Text>
                  <Text style={styles.itemMeta}>{exp.category.replace('_', ' ')} · {formatShortDate(exp.date)}</Text>
                </View>
                <Text style={[styles.itemAmount, { color: Colors.error[700] }]}>-{formatCurrency(exp.amount, currency)}</Text>
              </Card>
            ))
          ) : (
            <Text style={styles.emptyText}>No expenses recorded yet</Text>
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader title="Recent Payments" actionLabel="See all" onAction={() => router.push('/(tabs)/money/payments')} />
          {payments.loading && !payments.data ? (
            <LoadingState />
          ) : payments.data && payments.data.length > 0 ? (
            payments.data.slice(0, 4).map((pay) => (
              <Card key={pay.id} padding="md" style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle}>{pay.reference} · {pay.party_name}</Text>
                  <Text style={styles.itemMeta}>{pay.type === 'received' ? 'Received' : 'Paid'} · {pay.method.replace('_', ' ')} · {formatShortDate(pay.date)}</Text>
                </View>
                <Text style={[styles.itemAmount, pay.type === 'received' ? { color: Colors.success[700] } : { color: Colors.error[700] }]}>
                  {pay.type === 'received' ? '+' : '-'}{formatCurrency(pay.amount, currency)}
                </Text>
              </Card>
            ))
          ) : (
            <Text style={styles.emptyText}>No payments recorded yet</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  actionBtn: { flex: 1, borderRadius: 16, padding: Spacing.md, alignItems: 'center', gap: Spacing.xs },
  actionLabel: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.xs, color: Colors.neutral[0], textAlign: 'center' },
  balanceRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  balanceCard: { flex: 1 },
  balanceHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xs },
  balanceLabel: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.sm, color: Colors.neutral[500] },
  balanceValue: { fontFamily: Typography.fontFamilyBold, fontSize: Typography.sizes.xl, marginTop: Spacing.xs },
  balanceSub: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.xs, color: Colors.neutral[400], marginTop: 2 },
  balanceLink: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.sm },
  balanceLinkText: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.sm, color: Colors.primary[600] },
  section: { marginBottom: Spacing.lg },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  itemInfo: { flex: 1 },
  itemTitle: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.sm, color: Colors.neutral[900] },
  itemMeta: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.xs, color: Colors.neutral[400], marginTop: 2, textTransform: 'capitalize' },
  itemAmount: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.md },
  emptyText: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[400], textAlign: 'center', paddingVertical: Spacing.lg },
});
