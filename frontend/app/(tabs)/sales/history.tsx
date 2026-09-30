import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search } from 'lucide-react-native';
import { Card, LoadingState, ErrorState, EmptyState } from '@/components/ui';
import { Colors, Spacing, Typography, formatCurrency, formatShortDate } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';
import { useFetch } from '@/lib/useFetch';
import * as salesApi from '@/api/sales';
import type { SaleStatus } from '@/lib/types';

export default function SalesHistoryScreen() {
  const router = useRouter();
  const { organization } = useAuth();
  const currency = organization?.currency ?? 'USD';
  const sales = useFetch(() => salesApi.getSales(), []);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SaleStatus | 'all'>('all');

  const filtered = useMemo(() => {
    if (!sales.data) return [];
    let result = sales.data;
    if (statusFilter !== 'all') result = result.filter((s) => s.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((s) => s.reference.toLowerCase().includes(q) || s.customer_name.toLowerCase().includes(q));
    }
    return result;
  }, [sales.data, search, statusFilter]);

  const filters: { label: string; value: SaleStatus | 'all' }[] = [
    { label: 'All', value: 'all' },
    { label: 'Completed', value: 'completed' },
    { label: 'Refunded', value: 'refunded' },
    { label: 'Pending', value: 'pending' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={Colors.neutral[700]} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Sales History</Text>
      </View>

      <View style={styles.searchWrap}>
        <Search size={18} color={Colors.neutral[400]} strokeWidth={2} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by reference or customer..."
          placeholderTextColor={Colors.neutral[400]}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.filterRow}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.value}
            onPress={() => setStatusFilter(f.value)}
            style={[styles.filterChip, statusFilter === f.value && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, statusFilter === f.value && styles.filterChipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {sales.loading && !sales.data ? (
        <LoadingState />
      ) : sales.error ? (
        <ErrorState message={sales.error} onRetry={sales.refetch} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No sales found" message="Try adjusting your filters or record a new sale." />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => router.push({ pathname: '/(tabs)/sales/sale-detail', params: { id: item.id } })}>
              <Card padding="md" style={styles.saleRow}>
                <View style={styles.saleInfo}>
                  <Text style={styles.saleRef}>{item.reference}</Text>
                  <Text style={styles.saleCustomer}>{item.customer_name}</Text>
                  <Text style={styles.saleDate}>{formatShortDate(item.created_at)} · {item.line_items.length} items</Text>
                </View>
                <View style={styles.saleRight}>
                  <Text style={styles.saleTotal}>{formatCurrency(item.total, currency)}</Text>
                  <View style={[styles.statusBadge, item.status === 'completed' ? styles.statusCompleted : item.status === 'refunded' ? styles.statusRefunded : styles.statusPending]}>
                    <Text style={[styles.statusText, item.status === 'completed' ? styles.statusTextCompleted : item.status === 'refunded' ? styles.statusTextRefunded : styles.statusTextPending]}>
                      {item.status}
                    </Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

import { TextInput } from 'react-native';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md, backgroundColor: Colors.neutral[0], borderBottomWidth: 1, borderBottomColor: Colors.neutral[200] },
  backBtn: { padding: Spacing.xs, marginRight: Spacing.sm },
  topTitle: { fontFamily: Typography.fontFamilyBold, fontSize: Typography.sizes.xl, color: Colors.neutral[900] },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.neutral[0], borderRadius: 12, borderWidth: 1, borderColor: Colors.neutral[300], paddingHorizontal: Spacing.md, margin: Spacing.lg, gap: Spacing.sm },
  searchInput: { flex: 1, fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.md, color: Colors.neutral[900], paddingVertical: Spacing.md },
  filterRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  filterChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: 12, borderWidth: 1, borderColor: Colors.neutral[300], backgroundColor: Colors.neutral[0] },
  filterChipActive: { borderColor: Colors.primary[500], backgroundColor: Colors.primary[50] },
  filterChipText: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.sm, color: Colors.neutral[600] },
  filterChipTextActive: { color: Colors.primary[700] },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  saleRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  saleInfo: { flex: 1 },
  saleRef: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.sm, color: Colors.neutral[900] },
  saleCustomer: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[600], marginTop: 2 },
  saleDate: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.xs, color: Colors.neutral[400], marginTop: 2 },
  saleRight: { alignItems: 'flex-end' },
  saleTotal: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.md, color: Colors.neutral[900] },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  statusCompleted: { backgroundColor: Colors.success[50] },
  statusRefunded: { backgroundColor: Colors.error[50] },
  statusPending: { backgroundColor: Colors.warning[50] },
  statusText: { fontFamily: Typography.fontFamilyMedium, fontSize: 10, textTransform: 'capitalize' },
  statusTextCompleted: { color: Colors.success[700] },
  statusTextRefunded: { color: Colors.error[700] },
  statusTextPending: { color: Colors.warning[700] },
});
