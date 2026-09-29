import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Search, Package, AlertTriangle } from 'lucide-react-native';
import { Card, LoadingState, ErrorState, EmptyState, Button } from '@/components/ui';
import { Colors, Spacing, Typography, formatCurrency } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';
import { useFetch } from '@/lib/useFetch';
import * as salesApi from '@/api/sales';
import type { Product } from '@/lib/types';

export default function ProductsScreen() {
  const router = useRouter();
  const { organization } = useAuth();
  const currency = organization?.currency ?? 'USD';
  const products = useFetch(() => salesApi.getProducts(), []);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');

  const filtered = useMemo(() => {
    if (!products.data) return [];
    let result = products.data;
    if (filter === 'low') result = result.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold);
    if (filter === 'out') result = result.filter((p) => p.stock_quantity === 0);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    }
    return result;
  }, [products.data, search, filter]);

  const filters = [
    { label: 'All', value: 'all' as const },
    { label: 'Low Stock', value: 'low' as const },
    { label: 'Out of Stock', value: 'out' as const },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={Colors.neutral[700]} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Products & Inventory</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/sales/product-edit')} style={styles.addBtn}>
          <Plus size={22} color={Colors.primary[600]} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Search size={18} color={Colors.neutral[400]} strokeWidth={2} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          placeholderTextColor={Colors.neutral[400]}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.filterRow}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.value}
            onPress={() => setFilter(f.value)}
            style={[styles.filterChip, filter === f.value && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, filter === f.value && styles.filterChipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {products.loading && !products.data ? (
        <LoadingState />
      ) : products.error ? (
        <ErrorState message={products.error} onRetry={products.refetch} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Package size={48} color={Colors.neutral[300]} strokeWidth={1.5} />}
          title="No products found"
          message="Add your first product to start tracking inventory."
          actionLabel="Add Product"
          onAction={() => router.push('/(tabs)/sales/product-edit')}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ProductRow product={item} currency={currency} onPress={() => router.push({ pathname: '/(tabs)/sales/product-edit', params: { id: item.id } })} />
          )}
        />
      )}
    </View>
  );
}

function ProductRow({ product, currency, onPress }: { product: Product; currency: string; onPress: () => void }) {
  const isOut = product.stock_quantity === 0;
  const isLow = product.stock_quantity > 0 && product.stock_quantity <= product.low_stock_threshold;

  return (
    <TouchableOpacity onPress={onPress}>
      <Card padding="md" style={styles.productCard}>
        <View style={styles.productLeft}>
          <View style={[styles.productIcon, isOut ? styles.iconOut : isLow ? styles.iconLow : styles.iconNormal]}>
            {isOut || isLow ? (
              <AlertTriangle size={18} color={isOut ? Colors.error[600] : Colors.warning[600]} strokeWidth={2} />
            ) : (
              <Package size={18} color={Colors.neutral[500]} strokeWidth={2} />
            )}
          </View>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productSku}>{product.sku} · {product.category}</Text>
            <Text style={styles.productPrice}>{formatCurrency(product.price, currency)}</Text>
          </View>
        </View>
        <View style={styles.productRight}>
          <Text style={[styles.stockValue, isOut && styles.stockOut, isLow && styles.stockLow]}>{product.stock_quantity}</Text>
          <Text style={styles.stockUnit}>{product.unit}</Text>
          {(isOut || isLow) && (
            <View style={[styles.stockBadge, isOut ? styles.badgeOut : styles.badgeLow]}>
              <Text style={[styles.stockBadgeText, isOut ? styles.badgeOutText : styles.badgeLowText]}>
                {isOut ? 'Out' : 'Low'}
              </Text>
            </View>
          )}
        </View>
      </Card>
    </TouchableOpacity>
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
  filterRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  filterChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: 12, borderWidth: 1, borderColor: Colors.neutral[300], backgroundColor: Colors.neutral[0] },
  filterChipActive: { borderColor: Colors.primary[500], backgroundColor: Colors.primary[50] },
  filterChipText: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.sm, color: Colors.neutral[600] },
  filterChipTextActive: { color: Colors.primary[700] },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  productCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  productLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  productIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  iconNormal: { backgroundColor: Colors.neutral[100] },
  iconLow: { backgroundColor: Colors.warning[50] },
  iconOut: { backgroundColor: Colors.error[50] },
  productInfo: { flex: 1 },
  productName: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.md, color: Colors.neutral[900] },
  productSku: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.xs, color: Colors.neutral[400], marginTop: 2 },
  productPrice: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.sm, color: Colors.neutral[600], marginTop: 4 },
  productRight: { alignItems: 'flex-end' },
  stockValue: { fontFamily: Typography.fontFamilyBold, fontSize: Typography.sizes.lg, color: Colors.neutral[900] },
  stockOut: { color: Colors.error[600] },
  stockLow: { color: Colors.warning[600] },
  stockUnit: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.xs, color: Colors.neutral[400] },
  stockBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  badgeOut: { backgroundColor: Colors.error[50] },
  badgeLow: { backgroundColor: Colors.warning[50] },
  stockBadgeText: { fontFamily: Typography.fontFamilyMedium, fontSize: 10 },
  badgeOutText: { color: Colors.error[700] },
  badgeLowText: { color: Colors.warning[700] },
});
