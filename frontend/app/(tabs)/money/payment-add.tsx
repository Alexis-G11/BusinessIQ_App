import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check } from 'lucide-react-native';
import { Button, Card, Input } from '@/components/ui';
import { Colors, Spacing, Typography, formatCurrency } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';
import { useFetch } from '@/lib/useFetch';
import * as moneyApi from '@/api/money';
import * as contactsApi from '@/api/contacts';
import type { PaymentType, PaymentMethod } from '@/lib/types';

export default function PaymentAddScreen() {
  const router = useRouter();
  const { organization } = useAuth();
  const currency = organization?.currency ?? 'USD';
  const customers = useFetch(() => contactsApi.getCustomers(), []);
  const suppliers = useFetch(() => contactsApi.getSuppliers(), []);
  const receivables = useFetch(() => moneyApi.getReceivables(), []);
  const payables = useFetch(() => moneyApi.getPayables(), []);

  const [type, setType] = useState<PaymentType>('received');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedParty, setSelectedParty] = useState<string | null>(null);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parties = type === 'received' ? customers.data?.filter((c) => c.id !== 'cust_1') ?? [] : suppliers.data ?? [];
  const invoices = type === 'received' ? receivables.data ?? [] : payables.data ?? [];

  const methods: { label: string; value: PaymentMethod }[] = [
    { label: 'Cash', value: 'cash' },
    { label: 'Card', value: 'card' },
    { label: 'Mobile Money', value: 'mobile_money' },
    { label: 'Bank Transfer', value: 'bank_transfer' },
  ];

  const toggleInvoice = (id: string) => {
    setSelectedInvoices((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedParty || !amount) {
      setError('Select a party and enter an amount');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const party = parties.find((p) => p.id === selectedParty);
      const allocations = invoices
        .filter((inv) => selectedInvoices.has(inv.id))
        .map((inv) => {
          const ref = 'invoice_reference' in inv ? inv.invoice_reference : inv.bill_reference;
          return { invoice_id: inv.id, invoice_reference: ref, amount: inv.amount };
        });
      await moneyApi.createPayment({
        type,
        amount: parseFloat(amount),
        method,
        date,
        party_id: selectedParty,
        party_name: party?.name ?? '',
        allocations,
      });
      router.back();
    } catch {
      setError('Could not save the payment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={Colors.neutral[700]} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Record Payment</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.typeToggle}>
          <TouchableOpacity
            onPress={() => { setType('received'); setSelectedParty(null); setSelectedInvoices(new Set()); }}
            style={[styles.typeBtn, type === 'received' && styles.typeBtnActive]}
          >
            <Text style={[styles.typeBtnText, type === 'received' && styles.typeBtnTextActive]}>Money Received</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setType('made'); setSelectedParty(null); setSelectedInvoices(new Set()); }}
            style={[styles.typeBtn, type === 'made' && styles.typeBtnActive]}
          >
            <Text style={[styles.typeBtnText, type === 'made' && styles.typeBtnTextActive]}>Money Paid Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.fieldLabel}>{type === 'received' ? 'From Customer' : 'To Supplier'}</Text>
        <View style={styles.partyList}>
          {parties.map((p) => (
            <TouchableOpacity
              key={p.id}
              onPress={() => setSelectedParty(p.id)}
              style={[styles.partyChip, selectedParty === p.id && styles.partyChipActive]}
            >
              <Text style={[styles.partyChipText, selectedParty === p.id && styles.partyChipTextActive]}>{p.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Amount ({currency})</Text>
        <View style={styles.amountWrap}>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={Colors.neutral[400]}
            keyboardType="numeric"
          />
        </View>

        <Text style={styles.fieldLabel}>Payment Method</Text>
        <View style={styles.methodRow}>
          {methods.map((m) => (
            <TouchableOpacity
              key={m.value}
              onPress={() => setMethod(m.value)}
              style={[styles.methodChip, method === m.value && styles.methodChipActive]}
            >
              <Text style={[styles.methodChipText, method === m.value && styles.methodChipTextActive]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />

        {invoices.length > 0 && (
          <View style={styles.invoiceSection}>
            <Text style={styles.fieldLabel}>Allocate to {type === 'received' ? 'Invoices' : 'Bills'} (optional)</Text>
            <Text style={styles.fieldHint}>Select one or more open items this payment covers</Text>
            {invoices.map((inv) => {
              const ref = 'invoice_reference' in inv ? inv.invoice_reference : inv.bill_reference;
              const name = 'customer_name' in inv ? inv.customer_name : inv.supplier_name;
              const isSelected = selectedInvoices.has(inv.id);
              return (
                <TouchableOpacity key={inv.id} onPress={() => toggleInvoice(inv.id)}>
                  <Card padding="md" style={[styles.invoiceRow, isSelected && styles.invoiceRowActive]}>
                    <View style={styles.invoiceInfo}>
                      <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                        {isSelected && <Check size={14} color={Colors.neutral[0]} strokeWidth={3} />}
                      </View>
                      <View>
                        <Text style={styles.invoiceRef}>{ref}</Text>
                        <Text style={styles.invoiceParty}>{name}</Text>
                        <Text style={styles.invoiceDue}>
                          {inv.days_overdue > 0 ? `${inv.days_overdue} days overdue` : 'Due today'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.invoiceAmount}>{formatCurrency(inv.amount, currency)}</Text>
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Button
          label="Record Payment"
          onPress={handleSave}
          loading={saving}
          size="lg"
          icon={<Check size={20} color={Colors.neutral[0]} strokeWidth={2.5} />}
          style={styles.saveBtn}
        />
      </ScrollView>
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
  typeToggle: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  typeBtn: { flex: 1, paddingVertical: Spacing.md, borderRadius: 12, borderWidth: 1, borderColor: Colors.neutral[300], backgroundColor: Colors.neutral[0], alignItems: 'center' },
  typeBtnActive: { borderColor: Colors.primary[500], backgroundColor: Colors.primary[50] },
  typeBtnText: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.sm, color: Colors.neutral[600] },
  typeBtnTextActive: { color: Colors.primary[700] },
  fieldLabel: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.sm, color: Colors.neutral[700], marginBottom: Spacing.xs, marginTop: Spacing.sm },
  fieldHint: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.xs, color: Colors.neutral[400], marginBottom: Spacing.sm },
  partyList: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  partyChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: 12, borderWidth: 1, borderColor: Colors.neutral[300], backgroundColor: Colors.neutral[0] },
  partyChipActive: { borderColor: Colors.primary[500], backgroundColor: Colors.primary[50] },
  partyChipText: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.sm, color: Colors.neutral[600] },
  partyChipTextActive: { color: Colors.primary[700] },
  amountWrap: { borderWidth: 1, borderColor: Colors.neutral[300], borderRadius: 12, backgroundColor: Colors.neutral[0], paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  amountInput: { fontFamily: Typography.fontFamilyBold, fontSize: Typography.sizes.xxl, color: Colors.neutral[900], paddingVertical: Spacing.md },
  methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  methodChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: 12, borderWidth: 1, borderColor: Colors.neutral[300], backgroundColor: Colors.neutral[0] },
  methodChipActive: { borderColor: Colors.primary[500], backgroundColor: Colors.primary[50] },
  methodChipText: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.sm, color: Colors.neutral[600] },
  methodChipTextActive: { color: Colors.primary[700] },
  invoiceSection: { marginTop: Spacing.md },
  invoiceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm, borderWidth: 1, borderColor: 'transparent' },
  invoiceRowActive: { borderColor: Colors.primary[300], backgroundColor: Colors.primary[50] },
  invoiceInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.neutral[300], alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: Colors.primary[600], borderColor: Colors.primary[600] },
  invoiceRef: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.sm, color: Colors.neutral[900] },
  invoiceParty: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.xs, color: Colors.neutral[600], marginTop: 2 },
  invoiceDue: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.xs, color: Colors.warning[600], marginTop: 2 },
  invoiceAmount: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.md, color: Colors.neutral[900] },
  errorText: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.error[600], marginTop: Spacing.md },
  saveBtn: { marginTop: Spacing.xl },
});
