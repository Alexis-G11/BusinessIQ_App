import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useBusiness } from '@/context/BusinessContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, spacing, fontSizes, fontWeights } from '@/theme';
import { expenseApi } from '@/lib/api';
import { createIdempotencyKey } from '@/lib/backend';

const CATEGORIES = [
  { value: 'rent', label: 'Rent' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'salaries', label: 'Salaries' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'transport', label: 'Transport' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'professional_fees', label: 'Professional Fees' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'taxes', label: 'Taxes' },
  { value: 'other', label: 'Other' },
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'other', label: 'Other' },
];

export default function NewExpenseScreen() {
  const router = useRouter();
  const { currentBusiness } = useBusiness();
  const idempotencyKey = useRef(createIdempotencyKey());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: 'other',
    payment_method: 'cash',
    expense_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const update = (key: string, value: string) => {
    idempotencyKey.current = createIdempotencyKey();
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSave = async () => {
    if (!currentBusiness) return;
    if (!form.description.trim()) {
      setError('Description is required.');
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setError('Amount must be greater than 0.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await expenseApi.create(currentBusiness.id, {
        description: form.description.trim(),
        amount: form.amount,
        category: form.category as any,
        payment_method: form.payment_method as any,
        expense_date: form.expense_date,
        notes: form.notes.trim() || null,
      }, idempotencyKey.current);
      router.replace('/(app)/expenses');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create expense');
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Add Expense</Text>
        <Text style={styles.pageSubtitle}>Record a new business expense</Text>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Card>
        <Input label="Description *" value={form.description} onChangeText={(v) => update('description', v)} placeholder="e.g. Office rent for October" />
        <Input label="Amount *" value={form.amount} onChangeText={(v) => update('amount', v)} placeholder="0.00" keyboardType="numeric" hint={`In ${currentBusiness?.currency ?? 'USD'}`} />

        <Text style={styles.label}>Category</Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.value}
              onPress={() => update('category', cat.value)}
              style={[styles.chip, form.category === cat.value && styles.chipSelected]}
            >
              <Text style={[styles.chipLabel, form.category === cat.value && styles.chipLabelSelected]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Payment Method</Text>
        <View style={styles.chipRow}>
          {PAYMENT_METHODS.map((method) => (
            <TouchableOpacity
              key={method.value}
              onPress={() => update('payment_method', method.value)}
              style={[styles.chip, form.payment_method === method.value && styles.chipSelected]}
            >
              <Text style={[styles.chipLabel, form.payment_method === method.value && styles.chipLabelSelected]}>{method.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input label="Date" value={form.expense_date} onChangeText={(v) => update('expense_date', v)} placeholder="YYYY-MM-DD" />
        <Input label="Notes" value={form.notes} onChangeText={(v) => update('notes', v)} placeholder="Additional notes..." multiline numberOfLines={3} />

        <View style={styles.buttonRow}>
          <Button label="Cancel" variant="outline" onPress={() => router.back()} />
          <Button label="Save Expense" onPress={handleSave} loading={loading} style={{ flex: 1 }} />
        </View>
      </Card>
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
  label: { fontSize: fontSizes.sm, fontWeight: fontWeights.medium, color: colors.text, marginBottom: spacing.xs, marginTop: spacing.sm } as any,
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md } as any,
  chip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface } as any,
  chipSelected: { borderColor: colors.blue, backgroundColor: '#E0EAFB' } as any,
  chipLabel: { fontSize: fontSizes.sm, color: colors.text } as any,
  chipLabelSelected: { color: colors.blue, fontWeight: fontWeights.semibold } as any,
  buttonRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg } as any,
});
