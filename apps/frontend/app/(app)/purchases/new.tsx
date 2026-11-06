import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useBusiness } from '@/context/BusinessContext';
import { useContacts, useProducts } from '@/hooks/useBusinessData';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/States';
import { moneyToCents, purchaseApi } from '@/lib/api';
import { createIdempotencyKey } from '@/lib/backend';
import { colors, spacing, fontSizes, fontWeights } from '@/theme';
import { Search } from 'lucide-react-native';

export default function NewPurchaseScreen() {
  const router = useRouter();
  const { currentBusiness } = useBusiness();
  const { data: suppliers, loading: suppliersLoading, error: supplierError } = useContacts('supplier');
  const { data: products, loading: productsLoading, error: productsError } = useProducts();
  const [supplierId, setSupplierId] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'card' | 'mobile_money' | 'other'>('cash');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<{ productId: string; quantity: string; unitCost: string }[]>(
    [{ productId: '', quantity: '1', unitCost: '0.00' }]
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittedRequest = useRef<{ fingerprint: string; key: string } | null>(null);

  const filteredSuppliers = suppliers.filter((s) => s.name.toLowerCase().includes(supplierSearch.toLowerCase()));

  const addLineItem = () => setLineItems([...lineItems, { productId: '', quantity: '1', unitCost: '0.00' }]);
  const removeLineItem = (index: number) => setLineItems(lineItems.filter((_, i) => i !== index));
  const updateLineItem = (index: number, field: string, value: string) =>
    setLineItems(lineItems.map((item, i) => (i === index ? { ...item, [field]: value } : item)));

  const totalCents = lineItems.reduce((sum, item) => {
    const quantity = Number(item.quantity);
    if (!Number.isSafeInteger(quantity) || quantity <= 0) return sum;
    try {
      return sum + quantity * moneyToCents(item.unitCost);
    } catch {
      return sum;
    }
  }, 0);

  const handleCreate = async () => {
    if (!currentBusiness) return;
    const supplier = suppliers.find((s) => s.id === supplierId);
    if (!supplier) { setError('Select a supplier.'); return; }
    if (lineItems.some((item) => !item.productId)) { setError('Select a product for every purchase line.'); return; }

    setSubmitting(true);
    setError(null);
    try {
      const items = lineItems.map((item) => {
        const quantity = Number(item.quantity);
        if (!Number.isSafeInteger(quantity) || quantity < 1) {
          throw new Error('Each product quantity must be a whole number greater than zero.');
        }
        return {
          product_id: item.productId,
          quantity,
          unit_cost_cents: moneyToCents(item.unitCost),
        };
      });
      const amountPaidCents = paidAmount.trim() ? moneyToCents(paidAmount) : 0;
      if (amountPaidCents > totalCents) throw new Error('Amount paid cannot exceed the purchase total.');

      const request = {
        supplier_id: supplier.id,
        items,
        amount_paid_cents: amountPaidCents,
        payment_method: amountPaidCents > 0 ? paymentMethod : null,
        note: notes.trim() || null,
      };
      const fingerprint = JSON.stringify(request);
      if (submittedRequest.current?.fingerprint !== fingerprint) {
        submittedRequest.current = { fingerprint, key: createIdempotencyKey() };
      }
      await purchaseApi.create(currentBusiness.id, request, submittedRequest.current.key);
      router.replace('/(app)/purchases');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create purchase');
      setSubmitting(false);
    }
  };

  if (suppliersLoading || productsLoading) return <LoadingState message="Loading..." />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>New Purchase Order</Text>
        <Text style={styles.pageSubtitle}>Record a purchase from a supplier</Text>
      </View>

      {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}
      {(supplierError || productsError) && (
        <View style={styles.errorBox}><Text style={styles.errorText}>{supplierError ?? productsError}</Text></View>
      )}

      <Card>
        <Text style={styles.sectionLabel}>Supplier</Text>
        <View style={styles.searchWrap}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput style={styles.searchInput} placeholder="Search suppliers..." value={supplierSearch} onChangeText={setSupplierSearch} placeholderTextColor={colors.textSecondary} />
        </View>
        {filteredSuppliers.length === 0 ? (
          <Text style={styles.emptyText}>No suppliers found. Add a supplier first.</Text>
        ) : (
          <View style={styles.supplierChips}>
            {filteredSuppliers.map((s) => (
              <TouchableOpacity key={s.id} onPress={() => setSupplierId(s.id)} style={[styles.chip, supplierId === s.id && styles.chipSelected]}>
                <Text style={[styles.chipText, supplierId === s.id && styles.chipTextSelected]}>{s.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Card>

      <Card>
        <View style={styles.lineHeader}>
          <Text style={styles.sectionLabel}>Line Items</Text>
          <TouchableOpacity onPress={addLineItem}><Text style={styles.addLink}>+ Add Line</Text></TouchableOpacity>
        </View>
        {lineItems.map((item, i) => (
          <View key={i} style={styles.lineItem}>
            <View style={styles.lineItemTop}>
              <Text style={styles.lineItemNum}>{i + 1}</Text>
              {lineItems.length > 1 && (
                <TouchableOpacity onPress={() => removeLineItem(i)}><Text style={styles.removeLine}>Remove</Text></TouchableOpacity>
              )}
            </View>
            <Text style={styles.label}>Product</Text>
            <View style={styles.supplierChips}>
              {products.filter((product) => product.is_active).map((product) => (
                <TouchableOpacity
                  key={product.id}
                  onPress={() => {
                    updateLineItem(i, 'productId', product.id);
                    updateLineItem(i, 'unitCost', Number(product.cost_price).toFixed(2));
                  }}
                  style={[styles.chip, item.productId === product.id && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, item.productId === product.id && styles.chipTextSelected]}>{product.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.row}>
              <View style={styles.half}><Input label="Quantity" value={item.quantity} onChangeText={(v) => updateLineItem(i, 'quantity', v)} keyboardType="numeric" /></View>
              <View style={styles.half}><Input label="Unit Cost" value={item.unitCost} onChangeText={(v) => updateLineItem(i, 'unitCost', v)} keyboardType="numeric" hint={currentBusiness?.currency} /></View>
            </View>
          </View>
        ))}
      </Card>

      <Card>
        <Text style={styles.receiptHint}>Stock is added when this purchase is received. The server calculates the total and updates inventory and accounting together.</Text>
        <Input label="Amount Paid Now" value={paidAmount} onChangeText={setPaidAmount} placeholder="0.00" keyboardType="numeric" hint={`Leave at 0 to record the balance as payable in ${currentBusiness?.currency ?? 'USD'}`} />
        <Text style={styles.label}>Payment Method (when paying now)</Text>
        <View style={styles.statusRow}>
          {(['cash', 'bank', 'card', 'mobile_money', 'other'] as const).map((method) => (
            <TouchableOpacity key={method} onPress={() => setPaymentMethod(method)} style={[styles.statusChip, paymentMethod === method && styles.statusChipSelected]}>
              <Text style={[styles.statusText, paymentMethod === method && styles.statusTextSelected]}>{method.replace('_', ' ')}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional notes" multiline numberOfLines={2} />

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{(totalCents / 100).toFixed(2)} {currentBusiness?.currency}</Text>
        </View>
      </Card>

      <View style={styles.buttonRow}>
        <Button label="Cancel" variant="outline" onPress={() => router.back()} />
        <Button label="Create Purchase" onPress={handleCreate} loading={submitting} style={{ flex: 1 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background } as any,
  content: { padding: spacing.xl, gap: spacing.lg, maxWidth: 720 } as any,
  header: { marginBottom: spacing.sm } as any,
  pageTitle: { fontSize: fontSizes.xxl, fontWeight: fontWeights.bold, color: colors.text } as any,
  pageSubtitle: { fontSize: fontSizes.md, color: colors.textSecondary, marginTop: 4 } as any,
  errorBox: { backgroundColor: colors.dangerBg, borderRadius: 8, padding: spacing.md } as any,
  errorText: { color: colors.danger, fontSize: fontSizes.sm } as any,
  sectionLabel: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.text, marginBottom: spacing.sm } as any,
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: spacing.md, minHeight: 48, gap: spacing.sm, marginBottom: spacing.md } as any,
  searchInput: { flex: 1, fontSize: fontSizes.md, color: colors.text, outlineStyle: 'none' } as any,
  emptyText: { fontSize: fontSizes.sm, color: colors.textSecondary, paddingVertical: spacing.md } as any,
  supplierChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm } as any,
  chip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface } as any,
  chipSelected: { borderColor: colors.blue, backgroundColor: '#E0EAFB' } as any,
  chipText: { fontSize: fontSizes.sm, color: colors.text } as any,
  chipTextSelected: { color: colors.blue, fontWeight: fontWeights.semibold } as any,
  lineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm } as any,
  addLink: { fontSize: fontSizes.sm, color: colors.blue, fontWeight: fontWeights.semibold } as any,
  lineItem: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border } as any,
  lineItemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs } as any,
  lineItemNum: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.textSecondary } as any,
  removeLine: { fontSize: fontSizes.xs, color: colors.danger } as any,
  row: { flexDirection: 'row', gap: spacing.md } as any,
  half: { flex: 1 } as any,
  label: { fontSize: fontSizes.sm, fontWeight: fontWeights.medium, color: colors.text, marginBottom: spacing.xs, marginTop: spacing.sm } as any,
  statusRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md } as any,
  statusChip: { flex: 1, paddingVertical: spacing.sm, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center' } as any,
  statusChipSelected: { borderColor: colors.blue, backgroundColor: '#E0EAFB' } as any,
  statusText: { fontSize: fontSizes.sm, color: colors.textSecondary } as any,
  statusTextSelected: { color: colors.blue, fontWeight: fontWeights.semibold } as any,
  receiptHint: { fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.md } as any,
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.sm } as any,
  totalLabel: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold, color: colors.text } as any,
  totalValue: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold, color: colors.blue } as any,
  buttonRow: { flexDirection: 'row', gap: spacing.md } as any,
});
