import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useBusiness } from '@/context/BusinessContext';
import { usePurchases } from '@/hooks/useBusinessData';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/States';
import { formatCurrency, formatDate } from '@/lib/format';
import { colors, spacing, fontSizes, fontWeights } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Truck, Search, Plus } from 'lucide-react-native';

export default function PurchasesScreen() {
  const router = useRouter();
  const { currentBusiness } = useBusiness();
  const { data: purchases, loading, error, refetch } = usePurchases();
  const [search, setSearch] = useState('');

  const filtered = purchases.filter((p) =>
    p.contact_name.toLowerCase().includes(search.toLowerCase()) ||
    p.purchase_number.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingState message="Loading purchases..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const currency = currentBusiness?.currency ?? 'USD';
  const currencyExponent = currentBusiness?.currency_exponent ?? 2;
  const totalPurchases = purchases.reduce((sum, p) => sum + Number(p.total), 0);
  const totalOutstanding = purchases.reduce((sum, p) => sum + (Number(p.total) - Number(p.paid_amount)), 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Purchases</Text>
          <Text style={styles.pageSubtitle}>{purchases.length} purchase orders · {formatCurrency(totalPurchases, currency, currencyExponent)} total</Text>
        </View>
        <Button label="New Purchase" onPress={() => router.push('/(app)/purchases/new' as any)} leftIcon={<Plus size={18} color={colors.textInverse} />} />
      </View>

      <View style={styles.kpiRow}>
        <Card style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Total Purchases</Text>
          <Text style={styles.kpiValue}>{formatCurrency(totalPurchases, currency, currencyExponent)}</Text>
        </Card>
        <Card style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Outstanding</Text>
          <Text style={[styles.kpiValue, { color: colors.danger }]}>{formatCurrency(totalOutstanding, currency, currencyExponent)}</Text>
        </Card>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput style={styles.searchInput} placeholder="Search purchases..." value={search} onChangeText={setSearch} placeholderTextColor={colors.textSecondary} />
        </View>
      </View>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState title={search ? "No matching purchases" : "No purchases yet"} message={search ? "Try a different search." : "Record a purchase from a supplier to track inventory and expenses."} icon={<Truck size={28} color={colors.textSecondary} />} />
        </Card>
      ) : (
        <Card padding="md">
          {filtered.map((purch) => {
            const outstanding = Number(purch.total) - Number(purch.paid_amount);
            return (
              <View key={purch.id} style={styles.tableRow}>
                <View style={styles.purchaseInfo}>
                  <Text style={styles.purchaseSupplier}>{purch.contact_name}</Text>
                  <Text style={styles.purchaseMeta}>{purch.purchase_number} · {formatDate(purch.created_at)}</Text>
                </View>
                <View style={styles.purchaseRight}>
                  <Text style={styles.purchaseTotal}>{formatCurrency(Number(purch.total), currency, currencyExponent)}</Text>
                  {outstanding > 0 && <Text style={styles.purchaseOutstanding}>{formatCurrency(outstanding, currency, currencyExponent)} due</Text>}
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
  searchRow: { flexDirection: 'row' } as any,
  searchInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: spacing.md, minHeight: 48, gap: spacing.sm } as any,
  searchInput: { flex: 1, fontSize: fontSizes.md, color: colors.text, outlineStyle: 'none' } as any,
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border } as any,
  purchaseInfo: { flex: 1 } as any,
  purchaseSupplier: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.text } as any,
  purchaseMeta: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: 4 } as any,
  purchaseRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm } as any,
  purchaseTotal: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.text } as any,
  purchaseOutstanding: { fontSize: fontSizes.xs, color: colors.danger } as any,
});
