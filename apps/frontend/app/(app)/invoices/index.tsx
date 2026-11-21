import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useBusiness } from '@/context/BusinessContext';
import { useInvoices } from '@/hooks/useBusinessData';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { formatCurrency, formatDate } from '@/lib/format';
import { colors, spacing, fontSizes, fontWeights } from '@/theme';
import { Plus, Search, FileText } from 'lucide-react-native';

export default function InvoicesScreen() {
  const router = useRouter();
  const { currentBusiness } = useBusiness();
  const { data: invoices, loading } = useInvoices();
  const [search, setSearch] = useState('');

  const filtered = invoices.filter((i) =>
    i.contact_name.toLowerCase().includes(search.toLowerCase()) ||
    i.invoice_number.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingState message="Loading invoices..." />;

  const currency = currentBusiness?.currency ?? 'USD';
  const currencyExponent = currentBusiness?.currency_exponent ?? 2;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Invoices</Text>
          <Text style={styles.pageSubtitle}>{invoices.length} invoices</Text>
        </View>
        <Button label="New Invoice" onPress={() => router.push('/(app)/invoices/new' as any)} leftIcon={<Plus size={18} color={colors.textInverse} />} />
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput style={styles.searchInput} placeholder="Search invoices..." value={search} onChangeText={setSearch} placeholderTextColor={colors.textSecondary} />
        </View>
      </View>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState title={search ? "No matching invoices" : "No invoices yet"} message={search ? "Try a different search." : "Create your first invoice to bill customers."} icon={<FileText size={28} color={colors.textSecondary} />} />
        </Card>
      ) : (
        <Card padding="md">
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colNum]}>Invoice #</Text>
            <Text style={[styles.tableHeaderText, styles.colCustomer]}>Customer</Text>
            <Text style={[styles.tableHeaderText, styles.colDate]}>Due Date</Text>
            <Text style={[styles.tableHeaderText, styles.colTotal]}>Total</Text>
            <Text style={[styles.tableHeaderText, styles.colStatus]}>Status</Text>
          </View>
          {filtered.map((invoice) => {
            const overdue = invoice.status !== 'paid' && new Date(invoice.due_date) < new Date();
            return (
              <View key={invoice.id} style={styles.tableRow}>
                <Text style={[styles.colNum, styles.cellMono]}>{invoice.invoice_number}</Text>
                <Text style={[styles.colCustomer, styles.cell]} numberOfLines={1}>{invoice.contact_name}</Text>
                <Text style={[styles.colDate, styles.cellMeta]}>{formatDate(invoice.due_date, { month: 'short', day: 'numeric' })}</Text>
                <Text style={[styles.colTotal, styles.cellBold]}>{formatCurrency(Number(invoice.total), currency, currencyExponent)}</Text>
                <View style={styles.colStatus}>
                  <Badge
                    label={overdue && invoice.status !== 'paid' ? 'overdue' : invoice.status}
                    tone={
                      invoice.status === 'paid' ? 'success' :
                      overdue ? 'danger' :
                      invoice.status === 'partial' ? 'warning' :
                      invoice.status === 'sent' ? 'info' : 'neutral'
                    }
                  />
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } as any,
  pageTitle: { fontSize: fontSizes.xxl, fontWeight: fontWeights.bold, color: colors.text } as any,
  pageSubtitle: { fontSize: fontSizes.md, color: colors.textSecondary, marginTop: 4 } as any,
  searchRow: { flexDirection: 'row' } as any,
  searchInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: spacing.md, minHeight: 48, gap: spacing.sm } as any,
  searchInput: { flex: 1, fontSize: fontSizes.md, color: colors.text, outlineStyle: 'none' } as any,
  tableHeader: { flexDirection: 'row', paddingVertical: spacing.md, paddingHorizontal: spacing.sm, borderBottomWidth: 2, borderBottomColor: colors.border } as any,
  tableHeaderText: { fontSize: fontSizes.xs, fontWeight: fontWeights.semibold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 } as any,
  tableRow: { flexDirection: 'row', paddingVertical: spacing.md, paddingHorizontal: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: 'center' } as any,
  colNum: { flex: 1 } as any, colCustomer: { flex: 1.5 } as any, colDate: { flex: 1 } as any, colTotal: { flex: 1, alignItems: 'flex-end' } as any, colStatus: { flex: 1, alignItems: 'flex-end' } as any,
  cell: { fontSize: fontSizes.sm, color: colors.text } as any, cellMono: { fontSize: fontSizes.sm, color: colors.textSecondary, fontFamily: 'monospace' } as any, cellMeta: { fontSize: fontSizes.sm, color: colors.textSecondary } as any, cellBold: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.text } as any,
});
