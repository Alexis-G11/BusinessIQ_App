import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useBusiness } from '@/context/BusinessContext';
import { useContacts } from '@/hooks/useBusinessData';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/States';
import { invoiceApi } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing, fontSizes, fontWeights } from '@/theme';
import { Search } from 'lucide-react-native';

export default function NewInvoiceScreen() {
  const router = useRouter();
  const { currentBusiness } = useBusiness();
  const { session } = useAuth();
  const { data: customers, loading } = useContacts('customer');
  const [customerId, setCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(new Date().getTime() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [discount, setDiscount] = useState('');
  const [tax, setTax] = useState('');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<{ description: string; quantity: string; unitPrice: string }[]>(
    [{ description: '', quantity: '1', unitPrice: '0' }]
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const addLineItem = () => setLineItems([...lineItems, { description: '', quantity: '1', unitPrice: '0' }]);
  const removeLineItem = (index: number) => setLineItems(lineItems.filter((_, i) => i !== index));
  const updateLineItem = (index: number, field: string, value: string) =>
    setLineItems(lineItems.map((item, i) => (i === index ? { ...item, [field]: value } : item)));

  const subtotal = lineItems.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);
  const discountAmount = Number(discount) || 0;
  const taxAmount = Number(tax) || 0;
  const total = Math.max(0, subtotal - discountAmount + taxAmount);

  const handleCreate = async () => {
    if (!currentBusiness || !session?.user) return;
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) { setError('Select a customer.'); return; }
    const hasItems = lineItems.some((item) => item.description.trim());
    if (!hasItems) { setError('Add at least one line item with a description.'); return; }

    setSubmitting(true);
    setError(null);
    try {
      await invoiceApi.create(currentBusiness.id, session.user.id, {
        invoice_number: `INV-${Date.now()}`,
        customer_id: customer.id,
        contact_name: customer.name,
        issue_date: issueDate,
        due_date: dueDate,
        subtotal,
        discount: discountAmount,
        tax: taxAmount,
        total,
        notes: notes.trim() || null,
      });
      router.replace('/(app)/invoices');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create invoice');
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState message="Loading..." />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>New Invoice</Text>
        <Text style={styles.pageSubtitle}>Bill a customer for products or services</Text>
      </View>

      {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

      <Card>
        <Text style={styles.sectionLabel}>Customer</Text>
        <View style={styles.searchWrap}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput style={styles.searchInput} placeholder="Search customers..." value={customerSearch} onChangeText={setCustomerSearch} placeholderTextColor={colors.textSecondary} />
        </View>
        {filteredCustomers.length === 0 ? (
          <Text style={styles.emptyText}>No customers found. Add a customer first.</Text>
        ) : (
          <View style={styles.customerChips}>
            {filteredCustomers.map((c) => (
              <TouchableOpacity key={c.id} onPress={() => setCustomerId(c.id)} style={[styles.chip, customerId === c.id && styles.chipSelected]}>
                <Text style={[styles.chipText, customerId === c.id && styles.chipTextSelected]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Card>

      <Card>
        <View style={styles.row}>
          <View style={styles.half}><Input label="Issue Date" value={issueDate} onChangeText={setIssueDate} placeholder="YYYY-MM-DD" /></View>
          <View style={styles.half}><Input label="Due Date" value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" /></View>
        </View>
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
            <Input label="Description" value={item.description} onChangeText={(v) => updateLineItem(i, 'description', v)} placeholder="Product or service" />
            <View style={styles.row}>
              <View style={styles.half}><Input label="Quantity" value={item.quantity} onChangeText={(v) => updateLineItem(i, 'quantity', v)} keyboardType="numeric" /></View>
              <View style={styles.half}><Input label="Unit Price" value={item.unitPrice} onChangeText={(v) => updateLineItem(i, 'unitPrice', v)} keyboardType="numeric" hint={currentBusiness?.currency} /></View>
            </View>
          </View>
        ))}
      </Card>

      <Card>
        <View style={styles.row}>
          <View style={styles.half}><Input label="Discount" value={discount} onChangeText={setDiscount} placeholder={currentBusiness?.currency_exponent === 0 ? '0' : '0.00'} keyboardType="numeric" hint={currentBusiness?.currency} /></View>
          <View style={styles.half}><Input label="Tax" value={tax} onChangeText={setTax} placeholder={currentBusiness?.currency_exponent === 0 ? '0' : '0.00'} keyboardType="numeric" hint={currentBusiness?.currency} /></View>
        </View>
        <Input label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional notes for the customer" multiline numberOfLines={2} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatCurrency(total, currentBusiness?.currency, currentBusiness?.currency_exponent ?? 2)}</Text>
        </View>
      </Card>

      <View style={styles.buttonRow}>
        <Button label="Cancel" variant="outline" onPress={() => router.back()} />
        <Button label="Create Invoice" onPress={handleCreate} loading={submitting} style={{ flex: 1 }} />
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
  customerChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm } as any,
  chip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface } as any,
  chipSelected: { borderColor: colors.blue, backgroundColor: '#E0EAFB' } as any,
  chipText: { fontSize: fontSizes.sm, color: colors.text } as any,
  chipTextSelected: { color: colors.blue, fontWeight: fontWeights.semibold } as any,
  row: { flexDirection: 'row', gap: spacing.md } as any,
  half: { flex: 1 } as any,
  lineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm } as any,
  addLink: { fontSize: fontSizes.sm, color: colors.blue, fontWeight: fontWeights.semibold } as any,
  lineItem: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border } as any,
  lineItemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs } as any,
  lineItemNum: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.textSecondary } as any,
  removeLine: { fontSize: fontSizes.xs, color: colors.danger } as any,
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.sm } as any,
  totalLabel: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold, color: colors.text } as any,
  totalValue: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold, color: colors.blue } as any,
  buttonRow: { flexDirection: 'row', gap: spacing.md } as any,
});
