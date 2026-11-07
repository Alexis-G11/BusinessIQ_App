import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useBusiness } from '@/context/BusinessContext';
import { useContacts } from '@/hooks/useBusinessData';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/States';
import { paymentApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing, fontSizes, fontWeights } from '@/theme';
import type { ContactType, PaymentMethod } from '@/types';

export default function NewPaymentScreen() {
  const router = useRouter();
  const { currentBusiness } = useBusiness();
  const { session } = useAuth();
  const { data: allContacts, loading } = useContacts('customer');
  const [paymentType, setPaymentType] = useState<'customer' | 'supplier'>('customer');
  const [contactId, setContactId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customers = allContacts;
  const { data: suppliers } = useContacts('supplier');
  const contacts = paymentType === 'customer' ? customers : suppliers;

  const handleCreate = async () => {
    if (!currentBusiness || !session?.user) return;
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact) { setError('Select a contact.'); return; }
    if (!amount || Number(amount) <= 0) { setError('Amount must be greater than 0.'); return; }

    setSubmitting(true);
    setError(null);
    try {
      await paymentApi.create(currentBusiness.id, session.user.id, {
        contact_id: contact.id,
        contact_name: contact.name,
        contact_type: paymentType as ContactType,
        amount: Number(amount),
        payment_method: paymentMethod,
        payment_date: paymentDate,
        reference: reference.trim() || null,
        notes: notes.trim() || null,
      });
      router.replace('/(app)/payments');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to record payment');
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState message="Loading..." />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Record Payment</Text>
        <Text style={styles.pageSubtitle}>Record a payment from a customer or to a supplier</Text>
      </View>

      {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

      <Card>
        <Text style={styles.sectionLabel}>Payment Direction</Text>
        <View style={styles.typeRow}>
          <TouchableOpacity onPress={() => { setPaymentType('customer'); setContactId(''); }} style={[styles.typeBtn, paymentType === 'customer' && styles.typeBtnActive]}>
            <Text style={[styles.typeBtnText, paymentType === 'customer' && styles.typeBtnTextActive]}>From Customer</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setPaymentType('supplier'); setContactId(''); }} style={[styles.typeBtn, paymentType === 'supplier' && styles.typeBtnActive]}>
            <Text style={[styles.typeBtnText, paymentType === 'supplier' && styles.typeBtnTextActive]}>To Supplier</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Contact</Text>
        {contacts.length === 0 ? (
          <Text style={styles.emptyText}>No {paymentType}s found. Add one first.</Text>
        ) : (
          <View style={styles.contactChips}>
            {contacts.map((c) => (
              <TouchableOpacity key={c.id} onPress={() => setContactId(c.id)} style={[styles.chip, contactId === c.id && styles.chipSelected]}>
                <Text style={[styles.chipText, contactId === c.id && styles.chipTextSelected]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Input label="Amount *" value={amount} onChangeText={setAmount} placeholder={currentBusiness?.currency_exponent === 0 ? '0' : '0.00'} keyboardType="numeric" hint={currentBusiness?.currency} />

        <Text style={styles.label}>Payment Method</Text>
        <View style={styles.methodRow}>
          {(['cash', 'card', 'bank_transfer', 'mobile_money'] as PaymentMethod[]).map((m) => (
            <TouchableOpacity key={m} onPress={() => setPaymentMethod(m)} style={[styles.methodChip, paymentMethod === m && styles.methodChipSelected]}>
              <Text style={[styles.methodText, paymentMethod === m && styles.methodTextSelected]}>{m.replace('_', ' ')}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input label="Payment Date" value={paymentDate} onChangeText={setPaymentDate} placeholder="YYYY-MM-DD" />
        <Input label="Reference" value={reference} onChangeText={setReference} placeholder="Check #, transaction ID..." />
        <Input label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional notes" multiline numberOfLines={2} />
      </Card>

      <View style={styles.buttonRow}>
        <Button label="Cancel" variant="outline" onPress={() => router.back()} />
        <Button label="Record Payment" onPress={handleCreate} loading={submitting} style={{ flex: 1 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background } as any,
  content: { padding: spacing.xl, gap: spacing.lg, maxWidth: 640 } as any,
  header: { marginBottom: spacing.sm } as any,
  pageTitle: { fontSize: fontSizes.xxl, fontWeight: fontWeights.bold, color: colors.text } as any,
  pageSubtitle: { fontSize: fontSizes.md, color: colors.textSecondary, marginTop: 4 } as any,
  errorBox: { backgroundColor: colors.dangerBg, borderRadius: 8, padding: spacing.md } as any,
  errorText: { color: colors.danger, fontSize: fontSizes.sm } as any,
  sectionLabel: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.text, marginBottom: spacing.sm } as any,
  typeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg } as any,
  typeBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center' } as any,
  typeBtnActive: { borderColor: colors.blue, backgroundColor: '#E0EAFB' } as any,
  typeBtnText: { fontSize: fontSizes.sm, color: colors.textSecondary } as any,
  typeBtnTextActive: { color: colors.blue, fontWeight: fontWeights.semibold } as any,
  label: { fontSize: fontSizes.sm, fontWeight: fontWeights.medium, color: colors.text, marginBottom: spacing.xs, marginTop: spacing.sm } as any,
  emptyText: { fontSize: fontSizes.sm, color: colors.textSecondary, paddingVertical: spacing.md } as any,
  contactChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md } as any,
  chip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface } as any,
  chipSelected: { borderColor: colors.blue, backgroundColor: '#E0EAFB' } as any,
  chipText: { fontSize: fontSizes.sm, color: colors.text } as any,
  chipTextSelected: { color: colors.blue, fontWeight: fontWeights.semibold } as any,
  methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md } as any,
  methodChip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface } as any,
  methodChipSelected: { borderColor: colors.blue, backgroundColor: '#E0EAFB' } as any,
  methodText: { fontSize: fontSizes.sm, color: colors.text, textTransform: 'capitalize' } as any,
  methodTextSelected: { color: colors.blue, fontWeight: fontWeights.semibold } as any,
  buttonRow: { flexDirection: 'row', gap: spacing.md } as any,
});
