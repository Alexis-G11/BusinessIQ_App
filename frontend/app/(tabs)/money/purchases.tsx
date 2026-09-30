import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Card, LoadingState, ErrorState, EmptyState } from '@/components/ui';
import { Colors, Spacing, Typography, formatCurrency, formatShortDate } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';
import { useFetch } from '@/lib/useFetch';
import * as moneyApi from '@/api/money';

export default function PurchasesScreen() {
  const router = useRouter();
  const { organization } = useAuth();
  const currency = organization?.currency ?? 'USD';
  const purchases = useFetch(() => moneyApi.getPurchases(), []);

  const statusColors = {
    received: { bg: Colors.success[50], text: Colors.success[700] },
    ordered: { bg: Colors.warning[50], text: Colors.warning[700] },
    cancelled: { bg: Colors.error[50], text: Colors.error[700] },
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={Colors.neutral[700]} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Purchases</Text>
      </View>

      {purchases.loading && !purchases.data ? (
        <LoadingState />
      ) : purchases.error ? (
        <ErrorState message={purchases.error} onRetry={purchases.refetch} />
      ) : purchases.data && purchases.data.length === 0 ? (
        <EmptyState title="No purchases yet" message="Record purchases from your suppliers to track inventory coming in." />
      ) : (
        <FlatList
          data={purchases.data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const sc = statusColors[item.status];
            return (
              <Card padding="md" style={styles.purchaseRow}>
                <View style={styles.purchaseHeader}>
                  <View>
                    <Text style={styles.purchaseRef}>{item.reference}</Text>
                    <Text style={styles.purchaseSupplier}>{item.supplier_name}</Text>
                    <Text style={styles.purchaseDate}>{formatShortDate(item.created_at)} · {item.line_items.length} items</Text>
                  </View>
                  <View style={styles.purchaseRight}>
                    <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                      <Text style={[styles.statusText, { color: sc.text }]}>{item.status}</Text>
                    </View>
                    <Text style={styles.purchaseTotal}>{formatCurrency(item.total, currency)}</Text>
                  </View>
                </View>
              </Card>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md, backgroundColor: Colors.neutral[0], borderBottomWidth: 1, borderBottomColor: Colors.neutral[200] },
  backBtn: { padding: Spacing.xs, marginRight: Spacing.sm },
  topTitle: { fontFamily: Typography.fontFamilyBold, fontSize: Typography.sizes.xl, color: Colors.neutral[900] },
  list: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xxl },
  purchaseRow: { marginBottom: Spacing.sm },
  purchaseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  purchaseRef: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.sm, color: Colors.neutral[900] },
  purchaseSupplier: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.sm, color: Colors.neutral[600], marginTop: 2 },
  purchaseDate: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.xs, color: Colors.neutral[400], marginTop: 2 },
  purchaseRight: { alignItems: 'flex-end' },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontFamily: Typography.fontFamilyMedium, fontSize: 10, textTransform: 'capitalize' },
  purchaseTotal: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.md, color: Colors.neutral[900], marginTop: 4 },
});
