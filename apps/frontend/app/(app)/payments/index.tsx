import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useBusiness } from '@/context/BusinessContext';
import { usePayments } from '@/hooks/useBusinessData';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { formatCurrency, formatDate } from '@/lib/format';
import { colors, spacing, fontSizes, fontWeights } from '@/theme';
import { Plus, Search, CreditCard, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react-native';

export default function PaymentsScreen() {
  const router = useRouter();
  const { currentBusiness } = useBusiness();
  const { data: payments, loading } = usePayments();
  const [search, setSearch] = useState('');

  const filtered = payments.filter((p) =>
    p.contact_name.toLowerCase().includes(search.toLowerCase()) ||
    p.payment_number.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingState message="Loading payments..." />;

  const currency = currentBusiness?.currency ?? 'USD';
  const currencyExponent = currentBusiness?.currency_exponent ?? 2;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Payments</Text>
          <Text style={styles.pageSubtitle}>{payments.length} payment records</Text>
        </View>
        <Button label="Record Payment" onPress={() => router.push('/(app)/payments/new' as any)} leftIcon={<Plus size={18} color={colors.textInverse} />} />
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput style={styles.searchInput} placeholder="Search payments..." value={search} onChangeText={setSearch} placeholderTextColor={colors.textSecondary} />
        </View>
      </View>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState title={search ? "No matching payments" : "No payments yet"} message={search ? "Try a different search." : "Record a payment from a customer or to a supplier."} icon={<CreditCard size={28} color={colors.textSecondary} />} />
        </Card>
      ) : (
        <Card padding="md">
          {filtered.map((payment) => (
            <View key={payment.id} style={styles.tableRow}>
              <View style={styles.paymentInfo}>
                <View style={styles.paymentTop}>
                  {payment.contact_type === 'customer' ? (
                    <ArrowDownToLine size={16} color={colors.success} />
                  ) : (
                    <ArrowUpFromLine size={16} color={colors.danger} />
                  )}
                  <Text style={styles.paymentContact}>{payment.contact_name}</Text>
                </View>
                <Text style={styles.paymentMeta}>{payment.payment_number} · {formatDate(payment.payment_date)} · {payment.payment_method}</Text>
              </View>
              <Text style={[styles.paymentAmount, { color: payment.contact_type === 'customer' ? colors.success : colors.danger }]}>
                {payment.contact_type === 'customer' ? '+' : '-'}{formatCurrency(Number(payment.amount), currency, currencyExponent)}
              </Text>
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
  searchInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: spacing.md, minHeight: 48, gap: spacing.sm } as any,
  searchInput: { flex: 1, fontSize: fontSizes.md, color: colors.text, outlineStyle: 'none' } as any,
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border } as any,
  paymentInfo: { flex: 1 } as any,
  paymentTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm } as any,
  paymentContact: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.text } as any,
  paymentMeta: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: 4, marginLeft: 20 } as any,
  paymentAmount: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold } as any,
});
