import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Package, History, ArrowRight } from 'lucide-react-native';
import { Header, Card, SectionHeader, LoadingState, ErrorState } from '@/components/ui';
import { Colors, Spacing, Typography, formatCurrency, formatShortDate } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';
import { useFetch } from '@/lib/useFetch';
import * as salesApi from '@/api/sales';

export default function SalesHome() {
  const router = useRouter();
  const { organization } = useAuth();
  const currency = organization?.currency ?? 'USD';
  const sales = useFetch(() => salesApi.getSales(), []);
  const products = useFetch(() => salesApi.getProducts(), []);

  const lowStock = products.data?.filter((p) => p.stock_quantity <= p.low_stock_threshold) ?? [];
  const recentSales = sales.data?.slice(0, 5) ?? [];

  return (
    <View style={styles.container}>
      <Header title="Sales" subtitle="Record sales and manage inventory" />
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/sales/record')} style={styles.primaryAction}>
          <View style={styles.primaryIconWrap}>
            <Plus size={24} color={Colors.neutral[0]} strokeWidth={2.5} />
          </View>
          <View style={styles.primaryText}>
            <Text style={styles.primaryLabel}>Record a Sale</Text>
            <Text style={styles.primarySub}>Quick entry with product picker</Text>
          </View>
          <ArrowRight size={20} color={Colors.neutral[0]} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <View style={styles.secondaryActions}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/sales/history')} style={styles.secondaryBtn}>
          <History size={20} color={Colors.primary[600]} strokeWidth={2} />
          <Text style={styles.secondaryLabel}>Sales History</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/(tabs)/sales/products')} style={styles.secondaryBtn}>
          <Package size={20} color={Colors.primary[600]} strokeWidth={2} />
          <Text style={styles.secondaryLabel}>Products</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <SectionHeader title="Recent Sales" actionLabel="See all" onAction={() => router.push('/(tabs)/sales/history')} />
        {sales.loading && !sales.data ? (
          <LoadingState />
        ) : sales.error ? (
          <ErrorState message={sales.error} onRetry={sales.refetch} />
        ) : recentSales.length > 0 ? (
          recentSales.map((sale) => (
            <TouchableOpacity key={sale.id} onPress={() => router.push({ pathname: '/(tabs)/sales/sale-detail', params: { id: sale.id } })}>
              <Card padding="md" style={styles.saleRow}>
                <View style={styles.saleInfo}>
                  <Text style={styles.saleRef}>{sale.reference}</Text>
                  <Text style={styles.saleCustomer}>{sale.customer_name}</Text>
                  <Text style={styles.saleDate}>{formatShortDate(sale.created_at)}</Text>
                </View>
                <View style={styles.saleRight}>
                  <Text style={styles.saleTotal}>{formatCurrency(sale.total, currency)}</Text>
                  <View style={[styles.statusBadge, sale.status === 'completed' ? styles.statusCompleted : sale.status === 'refunded' ? styles.statusRefunded : styles.statusPending]}>
                    <Text style={[styles.statusText, sale.status === 'completed' ? styles.statusTextCompleted : sale.status === 'refunded' ? styles.statusTextRefunded : styles.statusTextPending]}>
                      {sale.status}
                    </Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.emptyText}>No sales yet. Record your first sale!</Text>
        )}
      </View>

      {lowStock.length > 0 && (
        <View style={styles.content}>
          <SectionHeader title="Low Stock" actionLabel="Manage" onAction={() => router.push('/(tabs)/sales/products')} />
          {lowStock.map((p) => (
            <Card key={p.id} padding="md" style={styles.stockRow}>
              <View style={styles.stockInfo}>
                <Text style={styles.stockName}>{p.name}</Text>
                <Text style={styles.stockSku}>{p.sku}</Text>
              </View>
              <View style={[styles.stockBadge, p.stock_quantity === 0 ? styles.stockOut : styles.stockLow]}>
                <Text style={[styles.stockBadgeText, p.stock_quantity === 0 ? styles.stockOutText : styles.stockLowText]}>
                  {p.stock_quantity === 0 ? 'Out of stock' : `${p.stock_quantity} left`}
                </Text>
              </View>
            </Card>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  actions: { paddingHorizontal: Spacing.lg },
  primaryAction: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary[600], borderRadius: 16, padding: Spacing.lg, gap: Spacing.md },
  primaryIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  primaryText: { flex: 1 },
  primaryLabel: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.lg, color: Colors.neutral[0] },
  primarySub: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  secondaryActions: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.lg, marginTop: Spacing.md },
  secondaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.neutral[0], borderRadius: 12, padding: Spacing.md, borderWidth: 1, borderColor: Colors.neutral[200] },
  secondaryLabel: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.sm, color: Colors.neutral[700] },
  content: { paddingHorizontal: Spacing.lg, marginTop: Spacing.lg },
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
  emptyText: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[400], textAlign: 'center', paddingVertical: Spacing.lg },
  stockRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  stockInfo: { flex: 1 },
  stockName: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.sm, color: Colors.neutral[900] },
  stockSku: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.xs, color: Colors.neutral[400], marginTop: 2 },
  stockBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: 6 },
  stockLow: { backgroundColor: Colors.warning[50] },
  stockOut: { backgroundColor: Colors.error[50] },
  stockBadgeText: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.xs },
  stockLowText: { color: Colors.warning[700] },
  stockOutText: { color: Colors.error[700] },
});
