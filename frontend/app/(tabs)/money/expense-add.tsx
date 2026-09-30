import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, Camera } from 'lucide-react-native';
import { Button, Input, Card } from '@/components/ui';
import { Colors, Spacing, Typography } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';
import * as moneyApi from '@/api/money';
import type { ExpenseCategory } from '@/lib/types';

const CATEGORIES: { label: string; value: ExpenseCategory }[] = [
  { label: 'Rent', value: 'rent' },
  { label: 'Utilities', value: 'utilities' },
  { label: 'Salaries', value: 'salaries' },
  { label: 'Supplies', value: 'supplies' },
  { label: 'Marketing', value: 'marketing' },
  { label: 'Transport', value: 'transport' },
  { label: 'Maintenance', value: 'maintenance' },
  { label: 'Professional Fees', value: 'professional_fees' },
  { label: 'Taxes', value: 'taxes' },
  { label: 'Other', value: 'other' },
];

export default function ExpenseAddScreen() {
  const router = useRouter();
  const { organization } = useAuth();
  const currency = organization?.currency ?? 'USD';
  const [category, setCategory] = useState<ExpenseCategory>('supplies');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!amount || !description) {
      setError('Amount and description are required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await moneyApi.createExpense({
        category,
        amount: parseFloat(amount),
        date,
        description,
      });
      router.back();
    } catch {
      setError('Could not save the expense. Please try again.');
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
        <Text style={styles.topTitle}>Add Expense</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.fieldLabel}>Category</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.value}
              onPress={() => setCategory(c.value)}
              style={[styles.categoryChip, category === c.value && styles.categoryChipActive]}
            >
              <Text style={[styles.categoryChipText, category === c.value && styles.categoryChipTextActive]}>{c.label}</Text>
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

        <Input label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />

        <Input label="Description" value={description} onChangeText={setDescription} placeholder="What was this expense for?" />

        <TouchableOpacity style={styles.receiptBtn}>
          <Camera size={20} color={Colors.neutral[500]} strokeWidth={2} />
          <Text style={styles.receiptText}>Attach Receipt (optional)</Text>
        </TouchableOpacity>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Button
          label="Save Expense"
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
  fieldLabel: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.sm, color: Colors.neutral[700], marginBottom: Spacing.xs, marginTop: Spacing.sm },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  categoryChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: 12, borderWidth: 1, borderColor: Colors.neutral[300], backgroundColor: Colors.neutral[0] },
  categoryChipActive: { borderColor: Colors.primary[500], backgroundColor: Colors.primary[50] },
  categoryChipText: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.sm, color: Colors.neutral[600] },
  categoryChipTextActive: { color: Colors.primary[700] },
  amountWrap: { borderWidth: 1, borderColor: Colors.neutral[300], borderRadius: 12, backgroundColor: Colors.neutral[0], paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  amountInput: { fontFamily: Typography.fontFamilyBold, fontSize: Typography.sizes.xxl, color: Colors.neutral[900], paddingVertical: Spacing.md },
  receiptBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.neutral[300], borderStyle: 'dashed', borderRadius: 12, paddingVertical: Spacing.lg, marginTop: Spacing.sm },
  receiptText: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.sm, color: Colors.neutral[500] },
  errorText: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.error[600], marginTop: Spacing.md },
  saveBtn: { marginTop: Spacing.xl },
});
