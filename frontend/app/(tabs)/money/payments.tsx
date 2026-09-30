import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';
import { Card, LoadingState, ErrorState, EmptyState } from '@/components/ui';
import { Colors, Spacing, Typography, formatCurrency, formatShortDate } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';
import { useFetch } from '@/lib/useFetch';
import * as moneyApi from '@/api/money';

export default function PaymentsScreen() {
  const router = useRouter();
  const { organization } = useAuth();
  const currency = organization?.currency ?? 'USD';
  const payments = useFetch(() => moneyApi.getPayments(), []);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={Colors.neutral[700]} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Payments</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/money/payment-add')} style={styles.addBtn}>
          <Text style={styles.addText}>Record</Text>
        </TouchableOpacity>
      </View>

      {payments.loading && !payments.data ? (
        <LoadingState />
      ) : payments.error ? (
        <ErrorState message={payments.error} onRetry={payments.refetch} />
      ) : payments.data && payments.data.length === 0 ? (
        <EmptyState title="No payments yet" message="Record payments received from customers or made to suppliers." actionLabel="Record Payment" onAction={() => router.push('/(tabs)/money/payment-add')} />
      ) : (
        <FlatList
          data={payments.data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card padding="md" style={styles.paymentRow}>
              <View style={styles.paymentLeft}>
                <View style={[styles.paymentIcon, item.type === 'received' ? styles.iconReceived : styles.iconMade]}>
                  {item.type === 'received' ? (
                    <ArrowDownLeft size={18} color={Colors.success[600]} strokeWidth={2.5} />
                  ) : (
                    <ArrowUpRight size={18} color={Colors.error[600]} strokeWidth={2.5} />
                  )}
                </View>
                <View>
                  <Text style={styles.paymentRef}>{item.reference}</Text>
                  <Text style={styles.paymentParty}>{item.party_name}</Text>
                  <Text style={styles.paymentMeta}>{item.method.replace('_', ' ')} · {formatShortDate(item.date)}</Text>
                </View>
              </View>
              <View style={styles.paymentRight}>
                <Text style={[styles.paymentAmount, item.type === 'received' ? { color: Colors.success[700] } : { color: Colors.error[700] }]}>
                  {item.type === 'received' ? '+' : '-'}{formatCurrency(item.amount, currency)}
                </Text>
                {item.allocations.length > 1 && (
                  <Text style={styles.allocText}>{item.allocations.length} invoices allocated</Text>
                )}
              </View>
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
  addBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.primary[600], borderRadius: 12 },
  addText: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.sm, color: Colors.neutral[0] },
  list: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xxl },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  paymentLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  paymentIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  iconReceived: { backgroundColor: Colors.success[50] },
  iconMade: { backgroundColor: Colors.error[50] },
  paymentRef: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.sm, color: Colors.neutral[900] },
  paymentParty: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.sm, color: Colors.neutral[600], marginTop: 2 },
  paymentMeta: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.xs, color: Colors.neutral[400], marginTop: 2, textTransform: 'capitalize' },
  paymentRight: { alignItems: 'flex-end' },
  paymentAmount: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.md },
  allocText: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.xs, color: Colors.neutral[400], marginTop: 2 },
});
