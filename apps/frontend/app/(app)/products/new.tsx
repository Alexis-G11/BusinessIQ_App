import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useBusiness } from '@/context/BusinessContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, spacing, fontSizes, fontWeights } from '@/theme';
import { productApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { createIdempotencyKey } from '@/lib/backend';

export default function NewProductScreen() {
  const router = useRouter();
  const { currentBusiness } = useBusiness();
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idempotencyKey = useRef(createIdempotencyKey());

  const [form, setForm] = useState({
    name: '',
    sku: '',
    barcode: '',
    description: '',
    cost_price: '',
    selling_price: '',
    reorder_threshold: '',
    unit: 'piece',
  });

  const update = (key: string, value: string) => {
    idempotencyKey.current = createIdempotencyKey();
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSave = async () => {
    if (!currentBusiness || !session?.user) return;
    if (!form.name.trim()) {
      setError('Product name is required.');
      return;
    }
    if (!form.selling_price || Number(form.selling_price) <= 0) {
      setError('Selling price must be greater than 0.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await productApi.create(currentBusiness.id, {
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        barcode: form.barcode.trim() || null,
        description: form.description.trim() || null,
        cost_price: Number(form.cost_price) || 0,
        selling_price: Number(form.selling_price),
        reorder_threshold: Number(form.reorder_threshold) || 0,
        unit: form.unit,
      }, idempotencyKey.current);
      router.replace('/(app)/products');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create product');
      setLoading(false);
    }
  };

  if (!currentBusiness) {
    return <Text style={styles.noBiz}>Please select a business first.</Text>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Add Product</Text>
        <Text style={styles.pageSubtitle}>Create a new product or service</Text>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Card>
        <Input label="Product name *" value={form.name} onChangeText={(v) => update('name', v)} placeholder="e.g. Coffee Mug" />
        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Input label="SKU" value={form.sku} onChangeText={(v) => update('sku', v)} placeholder="SKU-001" />
          </View>
          <View style={styles.halfInput}>
            <Input label="Barcode" value={form.barcode} onChangeText={(v) => update('barcode', v)} placeholder="1234567890" keyboardType="numeric" />
          </View>
        </View>
        <Input label="Description" value={form.description} onChangeText={(v) => update('description', v)} placeholder="Product description" multiline numberOfLines={3} />
        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Input label="Cost price" value={form.cost_price} onChangeText={(v) => update('cost_price', v)} placeholder="0.00" keyboardType="numeric" hint={`In ${currentBusiness.currency}`} />
          </View>
          <View style={styles.halfInput}>
            <Input label="Selling price *" value={form.selling_price} onChangeText={(v) => update('selling_price', v)} placeholder="0.00" keyboardType="numeric" hint={`In ${currentBusiness.currency}`} />
          </View>
        </View>
        <Input label="Reorder threshold" value={form.reorder_threshold} onChangeText={(v) => update('reorder_threshold', v)} placeholder="5" keyboardType="numeric" hint="Alert when stock drops to this level" />
        <Text style={styles.stockHint}>Record stock when goods arrive using Purchases. This keeps stock and accounting in sync.</Text>
        <Input label="Unit" value={form.unit} onChangeText={(v) => update('unit', v)} placeholder="piece, kg, liter..." />

        <View style={styles.buttonRow}>
          <Button label="Cancel" variant="outline" onPress={() => router.back()} />
          <Button label="Save Product" onPress={handleSave} loading={loading} style={{ flex: 1 }} />
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
  row: { flexDirection: 'row', gap: spacing.md } as any,
  halfInput: { flex: 1 } as any,
  buttonRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg } as any,
  stockHint: { fontSize: fontSizes.xs, color: colors.textSecondary, marginBottom: spacing.md } as any,
  noBiz: { padding: spacing.xl, color: colors.textSecondary } as any,
});
