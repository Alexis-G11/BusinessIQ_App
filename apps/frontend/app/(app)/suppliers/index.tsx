import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useBusiness } from '@/context/BusinessContext';
import { useContacts } from '@/hooks/useBusinessData';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { formatCurrency } from '@/lib/format';
import { colors, spacing, fontSizes, fontWeights } from '@/theme';
import { Plus, Search, Building2, Phone, Mail } from 'lucide-react-native';

export default function SuppliersScreen() {
  const router = useRouter();
  const { currentBusiness } = useBusiness();
  const currencyExponent = currentBusiness?.currency_exponent ?? 2;
  const { data: suppliers, loading } = useContacts('supplier');
  const [search, setSearch] = useState('');

  const filtered = suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingState message="Loading suppliers..." />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Suppliers</Text>
          <Text style={styles.pageSubtitle}>{suppliers.length} suppliers</Text>
        </View>
        <Button label="Add Supplier" onPress={() => router.push('/(app)/suppliers/new' as any)} leftIcon={<Plus size={18} color={colors.textInverse} />} />
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput style={styles.searchInput} placeholder="Search suppliers..." value={search} onChangeText={setSearch} placeholderTextColor={colors.textSecondary} />
        </View>
      </View>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            title={search ? "No matching suppliers" : "No suppliers yet"}
            message={search ? "Try a different search." : "Add your first supplier to track purchases."}
            icon={<Building2 size={28} color={colors.textSecondary} />}
          />
        </Card>
      ) : (
        <View style={styles.cardGrid}>
          {filtered.map((supplier) => (
            <Card key={supplier.id} style={styles.supplierCard}>
              <View style={styles.supplierTop}>
                <View style={styles.avatar}>
                  <Building2 size={22} color={colors.textInverse} />
                </View>
                <View style={styles.supplierInfo}>
                  <Text style={styles.supplierName} numberOfLines={1}>{supplier.name}</Text>
                  {supplier.email && (
                    <View style={styles.contactRow}>
                      <Mail size={12} color={colors.textSecondary} />
                      <Text style={styles.contactText} numberOfLines={1}>{supplier.email}</Text>
                    </View>
                  )}
                  {supplier.phone && (
                    <View style={styles.contactRow}>
                      <Phone size={12} color={colors.textSecondary} />
                      <Text style={styles.contactText}>{supplier.phone}</Text>
                    </View>
                  )}
                </View>
              </View>
              {Number(supplier.opening_balance) > 0 && (
                <View style={styles.balanceRow}>
                  <Text style={styles.balanceLabel}>Opening balance</Text>
                  <Text style={styles.balanceValue}>{formatCurrency(Number(supplier.opening_balance), currentBusiness?.currency, currencyExponent)}</Text>
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
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: spacing.md, minHeight: 48, gap: spacing.sm,
  } as any,
  searchInput: { flex: 1, fontSize: fontSizes.md, color: colors.text, outlineStyle: 'none' } as any,
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md } as any,
  supplierCard: { flex: 1, minWidth: 280, maxWidth: 400 } as any,
  supplierTop: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' } as any,
  avatar: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' } as any,
  supplierInfo: { flex: 1 } as any,
  supplierName: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.text } as any,
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 } as any,
  contactText: { fontSize: fontSizes.xs, color: colors.textSecondary } as any,
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border } as any,
  balanceLabel: { fontSize: fontSizes.xs, color: colors.textSecondary } as any,
  balanceValue: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.text } as any,
});
