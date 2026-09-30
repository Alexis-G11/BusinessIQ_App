import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft, CreditCard, Calendar, User, Package } from 'lucide-react-native';
import { Card, LoadingState, ErrorState } from '@/components/ui';
import { Colors, Spacing, Typography, formatCurrency, formatDate, formatTime } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';
import { useFetch } from '@/lib/useFetch';
import * as salesApi from '@/api/sales';

export default function SaleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { organization } = useAuth();
  const currency = organization?.currency ?? 'USD';
  const sale = useFetch(() => salesApi.getSale(id), [id]);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={Colors.neutral[700]} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Sale Details</Text>
      </View>

      {sale.loading && !sale.data ? (
        <LoadingState />
      ) : sale.error ? (
        <ErrorState message={sale.error} onRetry={sale.refetch} />
      ) : sale.data ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Card padding="lg" style={styles.headerCard}>
            <Text style={styles.reference}>{sale.data.reference}</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusBadge, sale.data.status === 'completed' ? styles.statusCompleted : sale.data.status === 'refunded' ? styles.statusRefunded : styles.statusPending]}>
                <Text style={[styles.statusText, sale.data.status === 'completed' ? styles.statusTextCompleted : sale.data.status === 'refunded' ? styles.statusTextRefunded : styles.statusTextPending]}>
                  {sale.data.status}
                </Text>
              </View>
              <Text style={styles.dateText}>{formatDate(sale.data.created_at)} at {formatTime(sale.data.created_at)}</Text>
            </View>
          </Card>

          <Card padding="md" style={styles.infoCard}>
            <View style={styles.infoRow}>
              <User size={18} color={Colors.neutral[400]} strokeWidth={2} />
              <View>
                <Text style={styles.infoLabel}>Customer</Text>
                <Text style={styles.infoValue}>{sale.data.customer_name}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <CreditCard size={18} color={Colors.neutral[400]} strokeWidth={2} />
              <View>
                <Text style={styles.infoLabel}>Payment Method</Text>
                <Text style={styles.infoValue}>{sale.data.payment_method.replace('_', ' ')}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Calendar size={18} color={Colors.neutral[400]} strokeWidth={2} />
              <View>
                <Text style={styles.infoLabel}>Date</Text>
                <Text style={styles.infoValue}>{formatDate(sale.data.created_at)}</Text>
              </View>
            </View>
          </Card>

          <Text style={styles.sectionLabel}>Items</Text>
          {sale.data.line_items.map((item) => (
            <Card key={item.id} padding="md" style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Package size={18} color={Colors.neutral[400]} strokeWidth={2} />
                <View>
                  <Text style={styles.itemName}>{item.product_name}</Text>
                  <Text style={styles.itemQty}>{item.quantity} x {formatCurrency(item.unit_price, currency)}</Text>
                </View>
              </View>
              <Text style={styles.itemTotal}>{formatCurrency(item.line_total, currency)}</Text>
            </Card>
          ))}

          <Card padding="md" style={styles.totalCard}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatCurrency(sale.data.subtotal, currency)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax</Text>
              <Text style={styles.totalValue}>{formatCurrency(sale.data.tax_amount, currency)}</Text>
            </View>
            <View style={[styles.totalRow, styles.grandTotal]}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(sale.data.total, currency)}</Text>
            </View>
          </Card>
        </ScrollView>
      ) : (
        <ErrorState message="Sale not found" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md, backgroundColor: Colors.neutral[0], borderBottomWidth: 1, borderBottomColor: Colors.neutral[200] },
  backBtn: { padding: Spacing.xs, marginRight: Spacing.sm },
  topTitle: { fontFamily: Typography.fontFamilyBold, fontSize: Typography.sizes.xl, color: Colors.neutral[900] },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  headerCard: { marginBottom: Spacing.md },
  reference: { fontFamily: Typography.fontFamilyBold, fontSize: Typography.sizes.xxl, color: Colors.neutral[900] },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.sm },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: 6 },
  statusCompleted: { backgroundColor: Colors.success[50] },
  statusRefunded: { backgroundColor: Colors.error[50] },
  statusPending: { backgroundColor: Colors.warning[50] },
  statusText: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.xs, textTransform: 'capitalize' },
  statusTextCompleted: { color: Colors.success[700] },
  statusTextRefunded: { color: Colors.error[700] },
  statusTextPending: { color: Colors.warning[700] },
  dateText: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[500] },
  infoCard: { marginBottom: Spacing.lg },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  infoLabel: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.xs, color: Colors.neutral[400] },
  infoValue: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.md, color: Colors.neutral[900], marginTop: 2, textTransform: 'capitalize' },
  sectionLabel: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.sm, color: Colors.neutral[700], marginBottom: Spacing.sm },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  itemInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  itemName: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.md, color: Colors.neutral[900] },
  itemQty: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.xs, color: Colors.neutral[500], marginTop: 2 },
  itemTotal: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.md, color: Colors.neutral[900] },
  totalCard: { marginTop: Spacing.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalLabel: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[600] },
  totalValue: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[900] },
  grandTotal: { borderTopWidth: 1, borderTopColor: Colors.neutral[200], marginTop: Spacing.xs, paddingTop: Spacing.sm },
  grandTotalLabel: { fontFamily: Typography.fontFamilyBold, fontSize: Typography.sizes.lg, color: Colors.neutral[900] },
  grandTotalValue: { fontFamily: Typography.fontFamilyBold, fontSize: Typography.sizes.lg, color: Colors.primary[700] },
});
