import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useBusiness } from '@/context/BusinessContext';
import { useProducts } from '@/hooks/useBusinessData';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/States';
import { formatCurrency } from '@/lib/format';
import { colors, spacing, fontSizes, fontWeights } from '@/theme';
import { Plus, Search, Package, AlertTriangle } from 'lucide-react-native';

export default function ProductsScreen() {
  const router = useRouter();
  const { currentBusiness } = useBusiness();
  const { data: products, loading, error, refetch } = useProducts();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase()) ||
    p.barcode?.includes(search)
  );

  if (loading) return <LoadingState message="Loading products..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Products & Services</Text>
          <Text style={styles.pageSubtitle}>{products.length} items</Text>
        </View>
        <Button label="Add Product" onPress={() => router.push('/(app)/products/add' as any)} leftIcon={<Plus size={18} color={colors.textInverse} />} />
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, SKU, or barcode..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      </View>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            title={search ? "No matching products" : "No products yet"}
            message={search ? "Try a different search term." : "Add your first product to start tracking inventory and sales."}
            icon={<Package size={28} color={colors.textSecondary} />}
          />
        </Card>
      ) : (
        <Card padding="md">
          {/* Table header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colName]}>Product</Text>
            <Text style={[styles.tableHeaderText, styles.colPrice]}>Price</Text>
            <Text style={[styles.tableHeaderText, styles.colStock]}>Stock</Text>
            <Text style={[styles.tableHeaderText, styles.colStatus]}>Status</Text>
          </View>
          {filtered.map((product) => {
            const isLowStock = Number(product.stock_quantity) <= Number(product.reorder_threshold);
            const isOutOfStock = Number(product.stock_quantity) <= 0;
            return (
              <View key={product.id} style={styles.tableRow}>
                <View style={styles.colName}>
                  <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                  {product.sku && <Text style={styles.productSku}>SKU: {product.sku}</Text>}
                </View>
                <View style={styles.colPrice}>
                  <Text style={styles.productPrice}>{formatCurrency(Number(product.selling_price), currentBusiness?.currency)}</Text>
                  <Text style={styles.productCost}>cost: {formatCurrency(Number(product.cost_price), currentBusiness?.currency)}</Text>
                </View>
                <View style={styles.colStock}>
                  <Text style={styles.stockValue}>{Number(product.stock_quantity)} {product.unit}</Text>
                  {isLowStock && (
                    <View style={styles.stockWarning}>
                      <AlertTriangle size={12} color={isOutOfStock ? colors.danger : colors.warning} />
                      <Text style={[styles.stockWarningText, { color: isOutOfStock ? colors.danger : colors.warning }]}>
                        {isOutOfStock ? 'Out' : 'Low'}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.colStatus}>
                  <Badge label={product.is_active ? 'Active' : 'Inactive'} tone={product.is_active ? 'success' : 'neutral'} />
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
  searchInput: {
    flex: 1,
    fontSize: fontSizes.md,
    color: colors.text,
    outlineStyle: 'none',
  } as any,
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
  colName: { flex: 2 } as any,
  colPrice: { flex: 1.5 } as any,
  colStock: { flex: 1.2, flexDirection: 'row', alignItems: 'center', gap: spacing.xs } as any,
  colStatus: { flex: 1, alignItems: 'flex-end' } as any,
  productName: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.text } as any,
  productSku: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: 2 } as any,
  productPrice: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.text } as any,
  productCost: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: 2 } as any,
  stockValue: { fontSize: fontSizes.sm, color: colors.text, fontWeight: fontWeights.medium } as any,
  stockWarning: { flexDirection: 'row', alignItems: 'center', gap: 2 } as any,
  stockWarningText: { fontSize: fontSizes.xs, fontWeight: fontWeights.semibold } as any,
});
