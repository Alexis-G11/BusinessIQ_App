import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Search, Truck } from 'lucide-react-native';
import { Card, LoadingState, ErrorState, EmptyState } from '@/components/ui';
import { Colors, Spacing, Typography, formatCurrency } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';
import { useFetch } from '@/lib/useFetch';
import * as contactsApi from '@/api/contacts';

export default function SuppliersScreen() {
  const router = useRouter();
  const { organization } = useAuth();
  const currency = organization?.currency ?? 'USD';
  const suppliers = useFetch(() => contactsApi.getSuppliers(), []);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!suppliers.data) return [];
    const q = search.toLowerCase();
    return suppliers.data.filter((s) => s.name.toLowerCase().includes(q) || s.phone.includes(q) || s.email.toLowerCase().includes(q));
  }, [suppliers.data, search]);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={Colors.neutral[700]} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Suppliers</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/more/supplier-edit')} style={styles.addBtn}>
          <Plus size={22} color={Colors.primary[600]} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Search size={18} color={Colors.neutral[400]} strokeWidth={2} />
        <TextInput style={styles.searchInput} placeholder="Search suppliers..." placeholderTextColor={Colors.neutral[400]} value={search} onChangeText={setSearch} />
      </View>

      {suppliers.loading && !suppliers.data ? (
        <LoadingState />
      ) : suppliers.error ? (
        <ErrorState message={suppliers.error} onRetry={suppliers.refetch} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Truck size={48} color={Colors.neutral[300]} strokeWidth={1.5} />}
          title="No suppliers found"
          message="Add your first supplier to track purchases and balances."
          actionLabel="Add Supplier"
          onAction={() => router.push('/(tabs)/more/supplier-edit')}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => router.push({ pathname: '/(tabs)/more/supplier-detail', params: { id: item.id } })}>
              <Card padding="md" style={styles.supplierRow}>
                <View style={styles.supplierAvatar}>
                  <Text style={styles.supplierInitial}>{item.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.supplierInfo}>
                  <Text style={styles.supplierName}>{item.name}</Text>
                  <Text style={styles.supplierMeta}>{item.phone || 'No phone'}</Text>
                </View>
                <View style={styles.supplierRight}>
                  <Text style={styles.supplierPurchased}>{formatCurrency(item.total_purchased, currency)}</Text>
                  {item.outstanding_balance > 0 && (
                    <Text style={styles.supplierBalance}>Owes {formatCurrency(item.outstanding_balance, currency)}</Text>
                  )}
                </View>
              </Card>
            </TouchableOpacity>
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
  addBtn: { padding: Spacing.xs },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.neutral[0], borderRadius: 12, borderWidth: 1, borderColor: Colors.neutral[300], paddingHorizontal: Spacing.md, margin: Spacing.lg, gap: Spacing.sm },
  searchInput: { flex: 1, fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.md, color: Colors.neutral[900], paddingVertical: Spacing.md },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  supplierRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  supplierAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.secondary[100], alignItems: 'center', justifyContent: 'center' },
  supplierInitial: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.lg, color: Colors.secondary[700] },
  supplierInfo: { flex: 1 },
  supplierName: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.md, color: Colors.neutral[900] },
  supplierMeta: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.xs, color: Colors.neutral[400], marginTop: 2 },
  supplierRight: { alignItems: 'flex-end' },
  supplierPurchased: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.sm, color: Colors.neutral[900] },
  supplierBalance: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.xs, color: Colors.warning[600], marginTop: 2 },
});
