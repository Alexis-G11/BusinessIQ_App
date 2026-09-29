import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Phone, Mail, MapPin, ShoppingBag, DollarSign, Pencil, TrendingUp } from 'lucide-react-native';
import { Card, LoadingState, ErrorState, Button, EmptyState } from '@/components/ui';
import { Colors, Spacing, Typography, formatCurrency, formatShortDate } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';
import { useFetch } from '@/lib/useFetch';
import * as contactsApi from '@/api/contacts';

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { organization } = useAuth();
  const currency = organization?.currency ?? 'USD';
  const customer = useFetch(() => contactsApi.getCustomer(id), [id]);
  const sales = useFetch(() => contactsApi.getCustomerSales(id), [id]);
  const payments = useFetch(() => contactsApi.getCustomerPayments(id), [id]);

  if (customer.loading && !customer.data) {
    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={Colors.neutral[700]} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Customer</Text>
        </View>
        <LoadingState />
      </View>
    );
  }

  if (customer.error || !customer.data) {
    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={Colors.neutral[700]} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Customer</Text>
        </View>
        <ErrorState message={customer.error ?? 'Customer not found'} onRetry={customer.refetch} />
      </View>
    );
  }

  const c = customer.data;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={Colors.neutral[700]} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Customer Profile</Text>
        <TouchableOpacity onPress={() => router.push({ pathname: '/(tabs)/more/customer-edit', params: { id: c.id } })} style={styles.editBtn}>
          <Pencil size={18} color={Colors.primary[600]} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Card padding="lg" style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileInitial}>{c.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.profileName}>{c.name}</Text>
          {c.phone ? <View style={styles.contactRow}><Phone size={14} color={Colors.neutral[400]} strokeWidth={2} /><Text style={styles.contactText}>{c.phone}</Text></View> : null}
          {c.email ? <View style={styles.contactRow}><Mail size={14} color={Colors.neutral[400]} strokeWidth={2} /><Text style={styles.contactText}>{c.email}</Text></View> : null}
          {c.address ? <View style={styles.contactRow}><MapPin size={14} color={Colors.neutral[400]} strokeWidth={2} /><Text style={styles.contactText}>{c.address}</Text></View> : null}
        </Card>

        <View style={styles.statsRow}>
          <Card padding="md" style={styles.statCard}>
            <DollarSign size={18} color={Colors.primary[600]} strokeWidth={2} />
            <Text style={styles.statLabel}>Total Spent</Text>
            <Text style={styles.statValue}>{formatCurrency(c.total_spent, currency)}</Text>
          </Card>
          <Card padding="md" style={styles.statCard}>
            <ShoppingBag size={18} color={Colors.secondary[600]} strokeWidth={2} />
            <Text style={styles.statLabel}>Orders</Text>
            <Text style={styles.statValue}>{c.total_orders}</Text>
          </Card>
          <Card padding="md" style={styles.statCard}>
            <TrendingUp size={18} color={Colors.warning[600]} strokeWidth={2} />
            <Text style={styles.statLabel}>Outstanding</Text>
            <Text style={[styles.statValue, c.outstanding_balance > 0 ? { color: Colors.warning[700] } : { color: Colors.success[700] }]}>
              {formatCurrency(c.outstanding_balance, currency)}
            </Text>
          </Card>
        </View>

        <Text style={styles.sectionLabel}>Purchase History</Text>
        {sales.loading ? <LoadingState /> : sales.data && sales.data.length > 0 ? (
          sales.data.map((sale) => (
            <Card key={sale.id} padding="md" style={styles.historyRow}>
              <View style={styles.historyInfo}>
                <Text style={styles.historyRef}>{sale.reference}</Text>
                <Text style={styles.historyDate}>{formatShortDate(sale.created_at)} · {sale.line_items.length} items</Text>
              </View>
              <View style={styles.historyRight}>
                <Text style={styles.historyAmount}>{formatCurrency(sale.total, currency)}</Text>
                <Text style={[styles.historyStatus, sale.status === 'completed' ? { color: Colors.success[600] } : { color: Colors.error[600] }]}>
                  {sale.status}
                </Text>
              </View>
            </Card>
          ))
        ) : (
          <Text style={styles.emptyText}>No purchases yet</Text>
        )}

        <Text style={styles.sectionLabel}>Payment History</Text>
        {payments.loading ? <LoadingState /> : payments.data && payments.data.length > 0 ? (
          payments.data.map((pay) => (
            <Card key={pay.id} padding="md" style={styles.historyRow}>
              <View style={styles.historyInfo}>
                <Text style={styles.historyRef}>{pay.reference}</Text>
                <Text style={styles.historyDate}>{formatShortDate(pay.date)} · {pay.method.replace('_', ' ')}</Text>
              </View>
              <Text style={[styles.historyAmount, { color: Colors.success[700] }]}>+{formatCurrency(pay.amount, currency)}</Text>
            </Card>
          ))
        ) : (
          <Text style={styles.emptyText}>No payments yet</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md, backgroundColor: Colors.neutral[0], borderBottomWidth: 1, borderBottomColor: Colors.neutral[200] },
  backBtn: { padding: Spacing.xs, marginRight: Spacing.sm },
  topTitle: { flex: 1, fontFamily: Typography.fontFamilyBold, fontSize: Typography.sizes.xl, color: Colors.neutral[900] },
  editBtn: { padding: Spacing.xs },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  profileCard: { alignItems: 'center', marginBottom: Spacing.lg },
  profileAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.primary[600], alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  profileInitial: { fontFamily: Typography.fontFamilyBold, fontSize: Typography.sizes.xxxl, color: Colors.neutral[0] },
  profileName: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.xl, color: Colors.neutral[900], marginBottom: Spacing.sm },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.xs },
  contactText: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[600] },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  statCard: { flex: 1, alignItems: 'center', gap: Spacing.xs },
  statLabel: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.xs, color: Colors.neutral[500] },
  statValue: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.md, color: Colors.neutral[900] },
  sectionLabel: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.md, color: Colors.neutral[900], marginBottom: Spacing.sm },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  historyInfo: { flex: 1 },
  historyRef: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.sm, color: Colors.neutral[900] },
  historyDate: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.xs, color: Colors.neutral[400], marginTop: 2, textTransform: 'capitalize' },
  historyRight: { alignItems: 'flex-end' },
  historyAmount: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.sm, color: Colors.neutral[900] },
  historyStatus: { fontFamily: Typography.fontFamilyMedium, fontSize: 10, textTransform: 'capitalize', marginTop: 2 },
  emptyText: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[400], textAlign: 'center', paddingVertical: Spacing.lg },
});
