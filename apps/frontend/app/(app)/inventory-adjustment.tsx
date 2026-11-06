import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/States';
import { useBusiness } from '@/context/BusinessContext';
import { useProducts } from '@/hooks/useBusinessData';
import { createIdempotencyKey } from '@/lib/backend';
import { inventoryApi } from '@/lib/api';
import { colors, fontSizes, fontWeights, spacing } from '@/theme';

const reasons = ['count_correction', 'damaged', 'expired', 'lost', 'found', 'other'] as const;
type AdjustmentReason = typeof reasons[number];

export default function InventoryAdjustmentScreen() {
  const router = useRouter();
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const { currentBusiness } = useBusiness();
  const { data: products, loading, error: productsError } = useProducts();
  const [countedQuantity, setCountedQuantity] = useState('');
  const [reason, setReason] = useState<AdjustmentReason>('count_correction');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittedRequest = useRef<{ fingerprint: string; key: string } | null>(null);

  const product = products.find((item) => item.id === productId);

  const save = async () => {
    if (!currentBusiness || !product) return;
    const quantity = Number(countedQuantity);
    if (!Number.isSafeInteger(quantity) || quantity < 0) {
      setError('Enter a whole-number stock count of zero or more.');
      return;
    }

    const request = {
      product_id: product.id,
      counted_quantity: quantity,
      reason,
      note: note.trim() || null,
    };
    const fingerprint = JSON.stringify(request);
    if (submittedRequest.current?.fingerprint !== fingerprint) {
      submittedRequest.current = { fingerprint, key: createIdempotencyKey() };
    }

    setSaving(true);
    setError(null);
    try {
      await inventoryApi.adjust(currentBusiness.id, request, submittedRequest.current.key);
      router.replace('/(app)/inventory');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save the stock count.');
      setSaving(false);
    }
  };

  if (loading) return <LoadingState message="Loading product..." />;
  if (productsError) return <Text style={styles.errorText}>{productsError}</Text>;
  if (!product || !currentBusiness) return <Text style={styles.errorText}>Product not found.</Text>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View>
        <Text style={styles.title}>Count Stock</Text>
        <Text style={styles.subtitle}>{product.name} · Current stock: {product.stock_quantity} {product.unit}</Text>
      </View>

      {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

      <Card>
        <Input
          label="Counted quantity"
          value={countedQuantity}
          onChangeText={setCountedQuantity}
          placeholder={String(product.stock_quantity)}
          keyboardType="numeric"
        />
        <Text style={styles.label}>Reason</Text>
        <View style={styles.reasons}>
          {reasons.map((item) => (
            <TouchableOpacity
              key={item}
              onPress={() => setReason(item)}
              style={[styles.reason, reason === item && styles.reasonSelected]}
            >
              <Text style={[styles.reasonText, reason === item && styles.reasonTextSelected]}>
                {item.replaceAll('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Input label="Note (optional)" value={note} onChangeText={setNote} placeholder="Add context for this adjustment" multiline />
        <Text style={styles.hint}>The API calculates the stock change and records an inventory movement.</Text>
        <Button label="Save stock count" onPress={save} loading={saving} disabled={saving} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.lg },
  title: { fontSize: fontSizes.xxl, fontWeight: fontWeights.bold, color: colors.text },
  subtitle: { fontSize: fontSizes.md, color: colors.textSecondary, marginTop: spacing.xs },
  label: { fontSize: fontSizes.sm, color: colors.text, fontWeight: fontWeights.semibold, marginTop: spacing.md, marginBottom: spacing.sm },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  reason: { borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  reasonSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  reasonText: { color: colors.textSecondary, fontSize: fontSizes.sm, textTransform: 'capitalize' },
  reasonTextSelected: { color: colors.textInverse },
  hint: { color: colors.textSecondary, fontSize: fontSizes.xs, marginVertical: spacing.md },
  errorBox: { backgroundColor: colors.dangerLight, borderRadius: 8, padding: spacing.md },
  errorText: { color: colors.danger, padding: spacing.lg },
});
