import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, TrendingDown } from 'lucide-react-native';
import { Card, LoadingState, ErrorState, EmptyState } from '@/components/ui';
import { Colors, Spacing, Typography, formatCurrency, formatShortDate } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';
import { useFetch } from '@/lib/useFetch';
import * as moneyApi from '@/api/money';
import type { AgingBucket } from '@/lib/types';

const BUCKET_COLORS: Record<string, string> = {
  'Current': Colors.success[500],
  '1-30': Colors.warning[500],
  '31-60': '#f97316',
  '61-90': Colors.error[500],
  '90+': Colors.error[700],
};

export default function PayablesScreen() {
  const router = useRouter();
  const { organization } = useAuth();
  const currency = organization?.currency ?? 'USD';
  const payables = useFetch(() => moneyApi.getPayables(), []);
  const aging = useFetch(() => moneyApi.getPayableAging(), []);

  const total = payables.data?.reduce((s, p) => s + p.amount, 0) ?? 0;
  const maxBucketAmount = aging.data ? Math.max(...aging.data.map((b) => b.amount), 1) : 1;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={Colors.neutral[700]} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Accounts Payable</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Card padding="lg" style={styles.totalCard}>
          <View style={styles.totalHeader}>
            <TrendingDown size={20} color={Colors.error[600]} strokeWidth={2} />
            <Text style={styles.totalLabel}>Total Owed</Text>
          </View>
          <Text style={[styles.totalValue, { color: Colors.error[700] }]}>{formatCurrency(total, currency)}</Text>
          <Text style={styles.totalSub}>{payables.data?.length ?? 0} unpaid bills</Text>
        </Card>

        {aging.data && aging.data.length > 0 && (
          <View style={styles.agingSection}>
            <Text style={styles.sectionLabel}>Aging Buckets</Text>
            <View style={styles.agingChart}>
              {aging.data.map((bucket: AgingBucket) => (
                <View key={bucket.bucket} style={styles.agingBar}>
                  <View style={styles.agingBarTrack}>
                    <View style={[styles.agingBarFill, { width: `${(bucket.amount / maxBucketAmount) * 100}%`, backgroundColor: BUCKET_COLORS[bucket.bucket] }]} />
                  </View>
                  <Text style={styles.agingBucket}>{bucket.bucket}</Text>
                  <Text style={styles.agingAmount}>{formatCurrency(bucket.amount, currency)}</Text>
                  <Text style={styles.agingCount}>{bucket.count} {bucket.count === 1 ? 'bill' : 'bills'}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <Text style={styles.sectionLabel}>Outstanding Bills</Text>
        {payables.loading && !payables.data ? (
          <LoadingState />
        ) : payables.error ? (
          <ErrorState message={payables.error} onRetry={payables.refetch} />
        ) : payables.data && payables.data.length === 0 ? (
          <EmptyState title="Nothing owed!" message="No outstanding payables right now." />
        ) : (
          payables.data?.map((item) => (
            <Card key={item.id} padding="md" style={styles.billRow}>
              <View style={styles.billInfo}>
                <Text style={styles.billRef}>{item.bill_reference}</Text>
                <Text style={styles.billSupplier}>{item.supplier_name}</Text>
                <Text style={styles.billDue}>Due {formatShortDate(item.due_date)}</Text>
              </View>
              <View style={styles.billRight}>
                <Text style={styles.billAmount}>{formatCurrency(item.amount, currency)}</Text>
                {item.days_overdue > 0 ? (
                  <View style={[styles.overdueBadge, { backgroundColor: item.days_overdue > 30 ? Colors.error[50] : Colors.warning[50] }]}>
                    <Text style={[styles.overdueText, { color: item.days_overdue > 30 ? Colors.error[700] : Colors.warning[700] }]}>
                      {item.days_overdue}d overdue
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.overdueBadge, { backgroundColor: Colors.success[50] }]}>
                    <Text style={[styles.overdueText, { color: Colors.success[700] }]}>Current</Text>
                  </View>
                )}
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md, backgroundColor: Colors.neutral[0], borderBottomWidth: 1, borderBottomColor: Colors.neutral[200] },
  backBtn: { padding: Spacing.xs, marginRight: Spacing.sm },
  topTitle: { fontFamily: Typography.fontFamilyBold, fontSize: Typography.sizes.xl, color: Colors.neutral[900] },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  totalCard: { alignItems: 'center', marginBottom: Spacing.lg },
  totalHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  totalLabel: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.sm, color: Colors.neutral[500] },
  totalValue: { fontFamily: Typography.fontFamilyBold, fontSize: Typography.sizes.xxxl, marginTop: Spacing.xs },
  totalSub: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[400], marginTop: 4 },
  agingSection: { marginBottom: Spacing.lg },
  sectionLabel: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.md, color: Colors.neutral[900], marginBottom: Spacing.md },
  agingChart: { gap: Spacing.sm },
  agingBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  agingBarTrack: { flex: 1, height: 12, backgroundColor: Colors.neutral[100], borderRadius: 6, overflow: 'hidden' },
  agingBarFill: { height: '100%', borderRadius: 6 },
  agingBucket: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.xs, color: Colors.neutral[600], width: 50 },
  agingAmount: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.xs, color: Colors.neutral[900], width: 80, textAlign: 'right' },
  agingCount: { fontFamily: Typography.fontFamilyRegular, fontSize: 10, color: Colors.neutral[400] },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  billInfo: { flex: 1 },
  billRef: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.sm, color: Colors.neutral[900] },
  billSupplier: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.sm, color: Colors.neutral[600], marginTop: 2 },
  billDue: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.xs, color: Colors.neutral[400], marginTop: 2 },
  billRight: { alignItems: 'flex-end' },
  billAmount: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.md, color: Colors.neutral[900] },
  overdueBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: 6, marginTop: 4 },
  overdueText: { fontFamily: Typography.fontFamilyMedium, fontSize: 10 },
});
