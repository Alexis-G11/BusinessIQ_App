import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Search, Users, Phone, Mail } from 'lucide-react-native';
import { Card, LoadingState, ErrorState, EmptyState } from '@/components/ui';
import { Colors, Spacing, Typography, formatCurrency } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';
import { useFetch } from '@/lib/useFetch';
import * as contactsApi from '@/api/contacts';

export default function CustomersScreen() {
  const router = useRouter();
  const { organization } = useAuth();
  const currency = organization?.currency ?? 'USD';
  const customers = useFetch(() => contactsApi.getCustomers(), []);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!customers.data) return [];
    const q = search.toLowerCase();
    return customers.data.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q));
  }, [customers.data, search]);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={Colors.neutral[700]} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Customers</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/more/customer-edit')} style={styles.addBtn}>
          <Plus size={22} color={Colors.primary[600]} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Search size={18} color={Colors.neutral[400]} strokeWidth={2} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search customers..."
          placeholderTextColor={Colors.neutral[400]}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {customers.loading && !customers.data ? (
        <LoadingState />
      ) : customers.error ? (
        <ErrorState message={customers.error} onRetry={customers.refetch} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users size={48} color={Colors.neutral[300]} strokeWidth={1.5} />}
          title="No customers found"
          message="Add your first customer to start tracking their orders and balances."
          actionLabel="Add Customer"
          onAction={() => router.push('/(tabs)/more/customer-edit')}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => router.push({ pathname: '/(tabs)/more/customer-detail', params: { id: item.id } })}>
              <Card padding="md" style={styles.customerRow}>
                <View style={styles.customerAvatar}>
                  <Text style={styles.customerInitial}>{item.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>{item.name}</Text>
                  <Text style={styles.customerMeta}>{item.total_orders} orders · {item.phone || 'No phone'}</Text>
                </View>
                <View style={styles.customerRight}>
                  <Text style={styles.customerSpent}>{formatCurrency(item.total_spent, currency)}</Text>
                  {item.outstanding_balance > 0 && (
                    <Text style={styles.customerBalance}>Owes {formatCurrency(item.outstanding_balance, currency)}</Text>
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
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  customerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary[100], alignItems: 'center', justifyContent: 'center' },
  customerInitial: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.lg, color: Colors.primary[700] },
  customerInfo: { flex: 1 },
  customerName: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.md, color: Colors.neutral[900] },
  customerMeta: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.xs, color: Colors.neutral[400], marginTop: 2 },
  customerRight: { alignItems: 'flex-end' },
  customerSpent: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.sm, color: Colors.neutral[900] },
  customerBalance: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.xs, color: Colors.warning[600], marginTop: 2 },
});
