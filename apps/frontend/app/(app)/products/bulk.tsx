import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useBusiness } from '@/context/BusinessContext';
import { subscriptionApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { colors, spacing, fontSizes, fontWeights, radius } from '@/theme';
import { ListPlus, Info } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import type { Product } from '@/types';

export default function BulkAddScreen() {
  const router = useRouter();
  const { currentBusiness } = useBusiness();
  const { session } = useAuth();
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState(0);

  const handleParse = async () => {
    if (!currentBusiness || !session?.user) return;
    const lines = rawText.trim().split('\n').filter((l) => l.trim());
    if (lines.length === 0) { setError('Paste at least one product line.'); return; }

    setLoading(true);
    setError(null);
    setSuccessCount(0);

    const products: Partial<Product>[] = [];
    for (const line of lines) {
      const parts = line.split(',').map((p) => p.trim());
      if (parts.length < 3) { setError(`Invalid line: "${line}". Each line needs name, selling price, stock (at minimum).`); setLoading(false); return; }

      const [name, sellStr, stockStr, costStr, skuStr, unitStr] = parts;
      const selling_price = Number(sellStr);
      const stock_quantity = Number(stockStr);

      if (!name) { setError(`Missing name in line: "${line}".`); setLoading(false); return; }
      if (isNaN(selling_price) || selling_price < 0) { setError(`Invalid selling price in line: "${line}".`); setLoading(false); return; }
      if (isNaN(stock_quantity) || stock_quantity < 0) { setError(`Invalid stock in line: "${line}".`); setLoading(false); return; }

      products.push({
        name,
        selling_price,
        stock_quantity,
        cost_price: costStr ? Number(costStr) || 0 : 0,
        sku: skuStr || null,
        unit: unitStr || 'piece',
      });
    }

    try {
      await subscriptionApi.createBatch(currentBusiness.id, session.user.id, products);
      setSuccessCount(products.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add products');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Bulk Add Products</Text>
        <Text style={styles.pageSubtitle}>Paste multiple products at once</Text>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {successCount > 0 && (
        <View style={styles.successBox}>
          <Text style={styles.successText}>Successfully added {successCount} product{successCount !== 1 ? 's' : ''}.</Text>
          <View style={styles.successActions}>
            <Button label="Add More" variant="outline" onPress={() => { setRawText(''); setSuccessCount(0); }} />
            <Button label="Go to Products" onPress={() => router.replace('/(app)/products')} style={{ flex: 1 }} />
          </View>
        </View>
      )}

      <Card>
        <View style={styles.infoRow}>
          <Info size={16} color={colors.info} />
          <Text style={styles.infoText}>
            Enter one product per line. Separate fields with commas. Format: name, selling price, stock, [cost price], [SKU], [unit]
          </Text>
        </View>

        <Text style={styles.label}>Products</Text>
        <View style={styles.textAreaWrap}>
          <TextInput
            style={styles.textArea}
            value={rawText}
            onChangeText={setRawText}
            placeholder={'Coffee Mug, 8.99, 45, 3.50, SKU-001, piece\nNotebook, 5.99, 120, 2.00, SKU-002\nPen Set, 4.99, 8, 1.50, SKU-003, set'}
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={10}
            textAlignVertical="top"
          />
        </View>

        <Text style={styles.exampleLabel}>Example:</Text>
        <View style={styles.exampleBox}>
          <Text style={styles.exampleText}>Coffee Mug, 8.99, 45, 3.50, SKU-001, piece</Text>
          <Text style={styles.exampleText}>Notebook, 5.99, 120, 2.00, SKU-002</Text>
          <Text style={styles.exampleText}>Pen Set, 4.99, 8</Text>
        </View>

        <View style={styles.buttonRow}>
          <Button label="Cancel" variant="outline" onPress={() => router.back()} />
          <Button label="Add Products" onPress={handleParse} loading={loading} style={{ flex: 1 }} leftIcon={<ListPlus size={18} color={colors.textInverse} />} />
        </View>
      </Card>

      <Card style={styles.fieldsCard}>
        <Text style={styles.sectionTitle}>Field Guide</Text>
        {[
          { name: 'Name', req: true, desc: 'Product name' },
          { name: 'Selling Price', req: true, desc: 'Price in your currency' },
          { name: 'Stock', req: true, desc: 'Initial quantity' },
          { name: 'Cost Price', req: false, desc: 'What you paid (default 0)' },
          { name: 'SKU', req: false, desc: 'Stock keeping unit' },
          { name: 'Unit', req: false, desc: 'piece, kg, liter (default: piece)' },
        ].map((field) => (
          <View key={field.name} style={styles.fieldRow}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldName}>{field.name}</Text>
              {field.req ? <Text style={styles.reqBadge}>required</Text> : <Text style={styles.optBadge}>optional</Text>}
            </View>
            <Text style={styles.fieldDesc}>{field.desc}</Text>
          </View>
        ))}
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
  successBox: { backgroundColor: colors.successBg, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md } as any,
  successText: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.success } as any,
  successActions: { flexDirection: 'row', gap: spacing.md } as any,

  infoRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md } as any,
  infoText: { fontSize: fontSizes.sm, color: colors.textSecondary, flex: 1, lineHeight: 20 } as any,
  label: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.text, marginBottom: spacing.xs } as any,
  textAreaWrap: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    backgroundColor: colors.surface, minHeight: 200,
  } as any,
  textArea: {
    padding: spacing.md, fontSize: fontSizes.sm, color: colors.text,
    fontFamily: 'monospace', minHeight: 200,
  } as any,
  exampleLabel: { fontSize: fontSizes.xs, fontWeight: fontWeights.semibold, color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs } as any,
  exampleBox: { backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, padding: spacing.md } as any,
  exampleText: { fontSize: fontSizes.xs, color: colors.textSecondary, fontFamily: 'monospace', lineHeight: 18 } as any,
  buttonRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg } as any,

  fieldsCard: { gap: spacing.sm } as any,
  sectionTitle: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.xs } as any,
  fieldRow: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border } as any,
  fieldHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm } as any,
  fieldName: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.text } as any,
  reqBadge: { fontSize: 10, color: colors.danger, fontWeight: fontWeights.semibold, textTransform: 'uppercase' as any } as any,
  optBadge: { fontSize: 10, color: colors.textSecondary, fontWeight: fontWeights.semibold, textTransform: 'uppercase' as any } as any,
  fieldDesc: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: 2 } as any,
});
