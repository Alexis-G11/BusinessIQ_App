import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useBusiness } from '@/context/BusinessContext';
import { useSales } from '@/hooks/useBusinessData';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/States';
import { formatCurrency, formatDate } from '@/lib/format';
import { colors, spacing, fontSizes, fontWeights } from '@/theme';
import { Plus, Search, ShoppingCart } from 'lucide-react-native';

export default function SalesScreen() {
  const router = useRouter();
  const { currentBusiness } = useBusiness();
  const { data: sales, loading, error, refetch } = useSales();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const filtered = sales.filter((s) =>
    (s.contact_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    s.sale_number.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingState message="Loading sales..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const currency = currentBusiness?.currency ?? 'USD';
  const totalRevenue = sales.filter((s) => s.status === 'completed').reduce((sum, s) => sum + Number(s.total), 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Sales & POS</Text>
          <Text style={styles.pageSubtitle}>{sales.length} sales · {formatCurrency(totalRevenue, currency)} total</Text>
        </View>
        <Button label="New Sale" onPress={() => router.push('/(app)/sales/new' as any)} leftIcon={<Plus size={18} color={colors.textInverse} />} />
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by customer or sale number..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      </View>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            title={search ? "No matching sales" : "No sales yet"}
            message={search ? "Try a different search." : "Record your first sale to start tracking revenue."}
            icon={<ShoppingCart size={28} color={colors.textSecondary} />}
          />
        </Card>
      ) : (
        <Card padding="md">
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colNum]}>Sale #</Text>
            <Text style={[styles.tableHeaderText, styles.colCustomer]}>Customer</Text>
            <Text style={[styles.tableHeaderText, styles.colDate]}>Date</Text>
            <Text style={[styles.tableHeaderText, styles.colTotal]}>Total</Text>
            <Text style={[styles.tableHeaderText, styles.colStatus]}>Status</Text>
          </View>
          {filtered.map((sale) => (
            <TouchableOpacity
              key={sale.id}
              style={styles.tableRow}
              onPress={() => router.push(`/(app)/sales/${sale.id}` as any)}
            >
              <Text style={[styles.colNum, styles.cellMono]}>{sale.sale_number}</Text>
              <Text style={[styles.colCustomer, styles.cell]} numberOfLines={1}>{sale.contact_name ?? 'Walk-in'}</Text>
              <Text style={[styles.colDate, styles.cellMeta]}>{formatDate(sale.created_at, { month: 'short', day: 'numeric' })}</Text>
              <Text style={[styles.colTotal, styles.cellBold]}>{formatCurrency(Number(sale.total), currency)}</Text>
              <View style={styles.colStatus}>
                <Badge
                  label={sale.status}
                  tone={sale.status === 'completed' ? 'success' : sale.status === 'voided' ? 'neutral' : sale.status === 'refunded' ? 'danger' : 'warning'}
                />
              </View>
            </TouchableOpacity>
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
  searchRow: { flexDirection: 'row', gap: spacing.md } as any,
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    gap: spacing.sm,
  } as any,
  searchInput: { flex: 1, fontSize: fontSizes.md, color: colors.text, outlineStyle: 'none' } as any,
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  } as any,
  tableHeaderText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as any,
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  } as any,
  colNum: { flex: 1 } as any,
  colCustomer: { flex: 1.5 } as any,
  colDate: { flex: 1 } as any,
  colTotal: { flex: 1, alignItems: 'flex-end' } as any,
  colStatus: { flex: 1, alignItems: 'flex-end' } as any,
  cell: { fontSize: fontSizes.sm, color: colors.text } as any,
  cellMono: { fontSize: fontSizes.sm, color: colors.textSecondary, fontFamily: 'monospace' } as any,
  cellMeta: { fontSize: fontSizes.sm, color: colors.textSecondary } as any,
  cellBold: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.text } as any,
});
