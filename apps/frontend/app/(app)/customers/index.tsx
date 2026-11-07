import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useBusiness } from '@/context/BusinessContext';
import { useContacts } from '@/hooks/useBusinessData';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/States';
import { formatCurrency } from '@/lib/format';
import { colors, spacing, fontSizes, fontWeights } from '@/theme';
import { Plus, Search, Users, Phone, Mail } from 'lucide-react-native';

export default function CustomersScreen() {
  const router = useRouter();
  const { currentBusiness } = useBusiness();
  const currencyExponent = currentBusiness?.currency_exponent ?? 2;
  const { data: customers, loading, error } = useContacts('customer');
  const [search, setSearch] = useState('');

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  if (loading) return <LoadingState message="Loading customers..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Customers</Text>
          <Text style={styles.pageSubtitle}>{customers.length} customers</Text>
        </View>
        <Button label="Add Customer" onPress={() => router.push('/(app)/customers/new' as any)} leftIcon={<Plus size={18} color={colors.textInverse} />} />
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search customers..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      </View>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            title={search ? "No matching customers" : "No customers yet"}
            message={search ? "Try a different search." : "Add your first customer to track their purchases."}
            icon={<Users size={28} color={colors.textSecondary} />}
          />
        </Card>
      ) : (
        <View style={styles.cardGrid}>
          {filtered.map((customer) => (
            <Card key={customer.id} style={styles.customerCard}>
              <View style={styles.customerTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{customer.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName} numberOfLines={1}>{customer.name}</Text>
                  {customer.email && (
                    <View style={styles.contactRow}>
                      <Mail size={12} color={colors.textSecondary} />
                      <Text style={styles.contactText} numberOfLines={1}>{customer.email}</Text>
                    </View>
                  )}
                  {customer.phone && (
                    <View style={styles.contactRow}>
                      <Phone size={12} color={colors.textSecondary} />
                      <Text style={styles.contactText}>{customer.phone}</Text>
                    </View>
                  )}
                </View>
              </View>
              {Number(customer.opening_balance) > 0 && (
                <View style={styles.balanceRow}>
                  <Text style={styles.balanceLabel}>Opening balance</Text>
                  <Text style={styles.balanceValue}>{formatCurrency(Number(customer.opening_balance), currentBusiness?.currency, currencyExponent)}</Text>
                </View>
              )}
            </Card>
          ))}
        </View>
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
  searchRow: { flexDirection: 'row' } as any,
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
  searchInput: { flex: 1, fontSize: fontSizes.md, color: colors.text, outlineStyle: 'none' } as any,
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md } as any,
  customerCard: { flex: 1, minWidth: 280, maxWidth: 400 } as any,
  customerTop: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' } as any,
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  } as any,
  avatarText: { color: colors.textInverse, fontWeight: fontWeights.bold, fontSize: fontSizes.md } as any,
  customerInfo: { flex: 1 } as any,
  customerName: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.text } as any,
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 } as any,
  contactText: { fontSize: fontSizes.xs, color: colors.textSecondary } as any,
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  } as any,
  balanceLabel: { fontSize: fontSizes.xs, color: colors.textSecondary } as any,
  balanceValue: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.text } as any,
});
