import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useBusiness } from '@/context/BusinessContext';
import { useInvoices } from '@/hooks/useBusinessData';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { formatCurrency, formatDate } from '@/lib/format';
import { colors, spacing, fontSizes, fontWeights } from '@/theme';
import { ArrowDownToLine } from 'lucide-react-native';

export default function ReceivablesScreen() {
  const { currentBusiness } = useBusiness();
  const { data: invoices, loading } = useInvoices();

  if (loading) return <LoadingState message="Loading receivables..." />;

  const currency = currentBusiness?.currency ?? 'USD';
  const outstanding = invoices.filter((i) => i.status !== 'paid' && i.status !== 'void');
  const totalOutstanding = outstanding.reduce((sum, i) => sum + (Number(i.total) - Number(i.paid_amount)), 0);
  const overdue = outstanding.filter((i) => new Date(i.due_date) < new Date());
  const totalOverdue = overdue.reduce((sum, i) => sum + (Number(i.total) - Number(i.paid_amount)), 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Receivables</Text>
        <Text style={styles.pageSubtitle}>Money owed to your business</Text>
      </View>

      <View style={styles.kpiRow}>
        <Card style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Total Outstanding</Text>
          <Text style={styles.kpiValue}>{formatCurrency(totalOutstanding, currency)}</Text>
          <Text style={styles.kpiMeta}>{outstanding.length} invoices</Text>
        </Card>
        <Card style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Overdue</Text>
          <Text style={[styles.kpiValue, { color: colors.danger }]}>{formatCurrency(totalOverdue, currency)}</Text>
          <Text style={styles.kpiMeta}>{overdue.length} invoices overdue</Text>
        </Card>
      </View>

      {outstanding.length === 0 ? (
        <Card>
          <EmptyState title="No outstanding receivables" message="All invoices are paid. Great job!" icon={<ArrowDownToLine size={28} color={colors.textSecondary} />} />
        </Card>
      ) : (
        <Card padding="md">
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colCustomer]}>Customer</Text>
            <Text style={[styles.tableHeaderText, styles.colDue]}>Due Date</Text>
            <Text style={[styles.tableHeaderText, styles.colOutstanding]}>Outstanding</Text>
            <Text style={[styles.tableHeaderText, styles.colStatus]}>Status</Text>
          </View>
          {outstanding.map((inv) => {
            const isOverdue = new Date(inv.due_date) < new Date();
            const outstandingAmt = Number(inv.total) - Number(inv.paid_amount);
            return (
              <View key={inv.id} style={styles.tableRow}>
                <Text style={[styles.colCustomer, styles.cell]} numberOfLines={1}>{inv.contact_name}</Text>
                <Text style={[styles.colDue, styles.cellMeta, isOverdue && { color: colors.danger }]}>{formatDate(inv.due_date, { month: 'short', day: 'numeric' })}</Text>
                <Text style={[styles.colOutstanding, styles.cellBold]}>{formatCurrency(outstandingAmt, currency)}</Text>
                <View style={styles.colStatus}>
                  <Badge label={isOverdue ? 'overdue' : inv.status} tone={isOverdue ? 'danger' : 'warning'} />
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
  tableHeader: { flexDirection: 'row', paddingVertical: spacing.md, paddingHorizontal: spacing.sm, borderBottomWidth: 2, borderBottomColor: colors.border } as any,
  tableHeaderText: { fontSize: fontSizes.xs, fontWeight: fontWeights.semibold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 } as any,
  tableRow: { flexDirection: 'row', paddingVertical: spacing.md, paddingHorizontal: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: 'center' } as any,
  colCustomer: { flex: 1.5 } as any, colDue: { flex: 1 } as any, colOutstanding: { flex: 1, alignItems: 'flex-end' } as any, colStatus: { flex: 1, alignItems: 'flex-end' } as any,
  cell: { fontSize: fontSizes.sm, color: colors.text } as any, cellMeta: { fontSize: fontSizes.sm, color: colors.textSecondary } as any, cellBold: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.text } as any,
});
