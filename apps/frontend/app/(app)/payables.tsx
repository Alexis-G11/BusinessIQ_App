import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useBusiness } from '@/context/BusinessContext';
import { usePurchases } from '@/hooks/useBusinessData';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { formatCurrency, formatDate } from '@/lib/format';
import { colors, spacing, fontSizes, fontWeights } from '@/theme';
import { ArrowUpFromLine } from 'lucide-react-native';

export default function PayablesScreen() {
  const { currentBusiness } = useBusiness();
  const { data: purchases, loading } = usePurchases();

  if (loading) return <LoadingState message="Loading payables..." />;

  const currency = currentBusiness?.currency ?? 'USD';
  const currencyExponent = currentBusiness?.currency_exponent ?? 2;
  const outstanding = purchases.filter((p) => p.status !== 'voided');
  const totalOutstanding = outstanding.reduce((sum, p) => sum + (Number(p.total) - Number(p.paid_amount)), 0);
  const unpaid = outstanding.filter((p) => Number(p.paid_amount) < Number(p.total));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Payables</Text>
        <Text style={styles.pageSubtitle}>Money your business owes</Text>
      </View>

      <View style={styles.kpiRow}>
        <Card style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Total Outstanding</Text>
          <Text style={[styles.kpiValue, { color: colors.danger }]}>{formatCurrency(totalOutstanding, currency, currencyExponent)}</Text>
          <Text style={styles.kpiMeta}>{unpaid.length} unpaid purchases</Text>
        </Card>
        <Card style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Fully Paid</Text>
          <Text style={[styles.kpiValue, { color: colors.success }]}>{formatCurrency(outstanding.reduce((s, p) => s + Number(p.paid_amount), 0), currency, currencyExponent)}</Text>
          <Text style={styles.kpiMeta}>{outstanding.filter((p) => Number(p.paid_amount) >= Number(p.total)).length} purchases</Text>
        </Card>
      </View>

      {outstanding.length === 0 ? (
        <Card>
          <EmptyState title="No payables" message="No outstanding supplier payments." icon={<ArrowUpFromLine size={28} color={colors.textSecondary} />} />
        </Card>
      ) : (
        <Card padding="md">
          {outstanding.map((purch) => {
            const outstandingAmt = Number(purch.total) - Number(purch.paid_amount);
            return (
              <View key={purch.id} style={styles.tableRow}>
                <View style={styles.purchaseInfo}>
                  <Text style={styles.purchaseSupplier}>{purch.contact_name}</Text>
                  <Text style={styles.purchaseMeta}>{purch.purchase_number} · {formatDate(purch.created_at)}</Text>
                </View>
                <View style={styles.purchaseRight}>
                  <Text style={styles.purchaseOutstanding}>{formatCurrency(outstandingAmt, currency, currencyExponent)}</Text>
                  <Badge label={purch.status} tone={purch.status === 'received' ? 'success' : purch.status === 'partial' ? 'warning' : 'neutral'} />
                </View>
              </View>
            );
          })}
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
  kpiRow: { flexDirection: 'row', gap: spacing.md } as any,
  kpiCard: { flex: 1 } as any,
  kpiLabel: { fontSize: fontSizes.sm, color: colors.textSecondary, fontWeight: fontWeights.medium } as any,
  kpiValue: { fontSize: fontSizes.xxl, fontWeight: fontWeights.bold, color: colors.text, marginTop: spacing.xs } as any,
  kpiMeta: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: 4 } as any,
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border } as any,
  purchaseInfo: { flex: 1 } as any,
  purchaseSupplier: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.text } as any,
  purchaseMeta: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: 4 } as any,
  purchaseRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm } as any,
  purchaseOutstanding: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.danger } as any,
});
