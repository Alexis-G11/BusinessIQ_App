import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useBusiness } from '@/context/BusinessContext';
import { useInventorySummary, useProducts } from '@/hooks/useBusinessData';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/States';
import { formatCurrency } from '@/lib/format';
import { colors, spacing, fontSizes, fontWeights } from '@/theme';
import { AlertTriangle, Boxes } from 'lucide-react-native';

export default function InventoryScreen() {
  const router = useRouter();
  const { currentBusiness } = useBusiness();
  const { data: products, loading, error } = useProducts();
  const { data: summary, loading: summaryLoading, error: summaryError } = useInventorySummary();

  if (loading || summaryLoading) return <LoadingState message="Loading inventory..." />;
  if (error || summaryError) return <ErrorState message={error ?? summaryError ?? 'Failed to load inventory.'} />;

  const currency = currentBusiness?.currency ?? 'USD';

  const activeProducts = products.filter((p) => p.is_active);
  const inventoryValue = (summary?.inventory_value_cents ?? 0) / 100;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Inventory</Text>
        <Text style={styles.pageSubtitle}>Track and manage your stock levels</Text>
      </View>

      <View style={styles.kpiRow}>
        <Card style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Inventory Value</Text>
          <Text style={styles.kpiValue}>{formatCurrency(inventoryValue, currency)}</Text>
          <Text style={styles.kpiMeta}>{summary?.active_products ?? activeProducts.length} active products · weighted average</Text>
        </Card>
        <Card style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Low Stock</Text>
          <Text style={[styles.kpiValue, { color: colors.warning }]}>{String(summary?.low_stock ?? 0)}</Text>
          <Text style={styles.kpiMeta}>At or below reorder threshold</Text>
        </Card>
        <Card style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Out of Stock</Text>
          <Text style={[styles.kpiValue, { color: colors.danger }]}>{String(summary?.out_of_stock ?? 0)}</Text>
          <Text style={styles.kpiMeta}>No stock available</Text>
        </Card>
      </View>

      {products.length === 0 ? (
        <Card>
          <EmptyState title="No products" message="Add products to track inventory." icon={<Boxes size={28} color={colors.textSecondary} />} />
        </Card>
      ) : (
        <Card padding="md">
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colName]}>Product</Text>
            <Text style={[styles.tableHeaderText, styles.colStock]}>Stock</Text>
            <Text style={[styles.tableHeaderText, styles.colValue]}>Value</Text>
            <Text style={[styles.tableHeaderText, styles.colStatus]}>Status</Text>
          </View>
          {products.map((product) => {
            const isLow = Number(product.stock_quantity) > 0 && Number(product.stock_quantity) <= Number(product.reorder_threshold);
            const isOut = Number(product.stock_quantity) <= 0;
            const value = Number(product.cost_price) * Number(product.stock_quantity);
            return (
              <View key={product.id} style={styles.tableRow}>
                <View style={styles.colName}>
                  <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                  {product.sku && <Text style={styles.productSku}>{product.sku}</Text>}
                </View>
                <View style={styles.colStock}>
                  <Text style={styles.stockValue}>{Number(product.stock_quantity)} {product.unit}</Text>
                  {product.is_active && (
                    <TouchableOpacity
                      onPress={() => router.push({ pathname: '/(app)/inventory-adjustment', params: { productId: product.id } })}
                    >
                      <Text style={styles.adjustLink}>Count stock</Text>
                    </TouchableOpacity>
                  )}
                  {(isLow || isOut) && (
                    <View style={styles.stockWarning}>
                      <AlertTriangle size={12} color={isOut ? colors.danger : colors.warning} />
                      <Text style={[styles.stockWarningText, { color: isOut ? colors.danger : colors.warning }]}>{isOut ? 'Out' : 'Low'}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.colValue}>{formatCurrency(value, currency)}</Text>
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
  header: { marginBottom: spacing.sm } as any,
  pageTitle: { fontSize: fontSizes.xxl, fontWeight: fontWeights.bold, color: colors.text } as any,
  pageSubtitle: { fontSize: fontSizes.md, color: colors.textSecondary, marginTop: 4 } as any,
  kpiRow: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' } as any,
  kpiCard: { flex: 1, minWidth: 200 } as any,
  kpiLabel: { fontSize: fontSizes.sm, color: colors.textSecondary, fontWeight: fontWeights.medium } as any,
  kpiValue: { fontSize: fontSizes.xxl, fontWeight: fontWeights.bold, color: colors.text, marginTop: spacing.xs } as any,
  kpiMeta: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: 4 } as any,
  tableHeader: { flexDirection: 'row', paddingVertical: spacing.md, paddingHorizontal: spacing.sm, borderBottomWidth: 2, borderBottomColor: colors.border } as any,
  tableHeaderText: { fontSize: fontSizes.xs, fontWeight: fontWeights.semibold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 } as any,
  tableRow: { flexDirection: 'row', paddingVertical: spacing.md, paddingHorizontal: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: 'center' } as any,
  colName: { flex: 2 } as any,
  colStock: { flex: 1.2, flexDirection: 'row', alignItems: 'center', gap: spacing.xs } as any,
  colValue: { flex: 1, fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.text } as any,
  colStatus: { flex: 1, alignItems: 'flex-end' } as any,
  productName: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.text } as any,
  productSku: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: 2 } as any,
  stockValue: { fontSize: fontSizes.sm, color: colors.text, fontWeight: fontWeights.medium } as any,
  adjustLink: { fontSize: fontSizes.xs, color: colors.blue, fontWeight: fontWeights.semibold, marginTop: 4 } as any,
  stockWarning: { flexDirection: 'row', alignItems: 'center', gap: 2 } as any,
  stockWarningText: { fontSize: fontSizes.xs, fontWeight: fontWeights.semibold } as any,
});
