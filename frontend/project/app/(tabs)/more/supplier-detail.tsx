import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Phone, Mail, MapPin, Pencil, TrendingDown, DollarSign } from 'lucide-react-native';
import { Card, LoadingState, ErrorState } from '@/components/ui';
import { Colors, Spacing, Typography, formatCurrency } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';
import { useFetch } from '@/lib/useFetch';
import * as contactsApi from '@/api/contacts';

export default function SupplierDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { organization } = useAuth();
  const currency = organization?.currency ?? 'USD';
  const supplier = useFetch(() => contactsApi.getSupplier(id), [id]);

  if (supplier.loading && !supplier.data) {
    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={Colors.neutral[700]} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Supplier</Text>
        </View>
        <LoadingState />
      </View>
    );
  }

  if (supplier.error || !supplier.data) {
    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={Colors.neutral[700]} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Supplier</Text>
        </View>
        <ErrorState message={supplier.error ?? 'Supplier not found'} onRetry={supplier.refetch} />
      </View>
    );
  }

  const s = supplier.data;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={Colors.neutral[700]} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Supplier Profile</Text>
        <TouchableOpacity onPress={() => router.push({ pathname: '/(tabs)/more/supplier-edit', params: { id: s.id } })} style={styles.editBtn}>
          <Pencil size={18} color={Colors.primary[600]} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Card padding="lg" style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileInitial}>{s.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.profileName}>{s.name}</Text>
          {s.phone ? <View style={styles.contactRow}><Phone size={14} color={Colors.neutral[400]} strokeWidth={2} /><Text style={styles.contactText}>{s.phone}</Text></View> : null}
          {s.email ? <View style={styles.contactRow}><Mail size={14} color={Colors.neutral[400]} strokeWidth={2} /><Text style={styles.contactText}>{s.email}</Text></View> : null}
          {s.address ? <View style={styles.contactRow}><MapPin size={14} color={Colors.neutral[400]} strokeWidth={2} /><Text style={styles.contactText}>{s.address}</Text></View> : null}
        </Card>

        <View style={styles.statsRow}>
          <Card padding="md" style={styles.statCard}>
            <DollarSign size={18} color={Colors.secondary[600]} strokeWidth={2} />
            <Text style={styles.statLabel}>Total Purchased</Text>
            <Text style={styles.statValue}>{formatCurrency(s.total_purchased, currency)}</Text>
          </Card>
          <Card padding="md" style={styles.statCard}>
            <TrendingDown size={18} color={Colors.error[600]} strokeWidth={2} />
            <Text style={styles.statLabel}>Outstanding</Text>
            <Text style={[styles.statValue, s.outstanding_balance > 0 ? { color: Colors.error[700] } : { color: Colors.success[700] }]}>
              {formatCurrency(s.outstanding_balance, currency)}
            </Text>
          </Card>
        </View>
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
  profileAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.secondary[600], alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  profileInitial: { fontFamily: Typography.fontFamilyBold, fontSize: Typography.sizes.xxxl, color: Colors.neutral[0] },
  profileName: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.xl, color: Colors.neutral[900], marginBottom: Spacing.sm },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.xs },
  contactText: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[600] },
  statsRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  statCard: { flex: 1, alignItems: 'center', gap: Spacing.xs },
  statLabel: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.xs, color: Colors.neutral[500] },
  statValue: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.md, color: Colors.neutral[900] },
});
