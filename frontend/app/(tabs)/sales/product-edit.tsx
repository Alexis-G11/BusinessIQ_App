import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Check, AlertTriangle } from 'lucide-react-native';
import { Button, Card, Input, LoadingState, ErrorState } from '@/components/ui';
import { Colors, Spacing, Typography, formatCurrency } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';
import { useFetch } from '@/lib/useFetch';
import * as salesApi from '@/api/sales';

export default function ProductEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { organization } = useAuth();
  const currency = organization?.currency ?? 'USD';
  const isEditing = !!id;
  const product = useFetch(() => (id ? salesApi.getProduct(id) : Promise.resolve(null)), [id]);

  const [form, setForm] = useState({
    name: '',
    sku: '',
    category: '',
    price: '',
    cost: '',
    unit: 'piece',
    stock_quantity: '',
    low_stock_threshold: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStockAdjust, setShowStockAdjust] = useState(false);
  const [stockAdjust, setStockAdjust] = useState('');
  const [stockReason, setStockReason] = useState('');

  useEffect(() => {
    if (product.data) {
      setForm({
        name: product.data.name,
        sku: product.data.sku,
        category: product.data.category,
        price: String(product.data.price),
        cost: String(product.data.cost),
        unit: product.data.unit,
        stock_quantity: String(product.data.stock_quantity),
        low_stock_threshold: String(product.data.low_stock_threshold),
      });
    }
  }, [product.data]);

  const handleSave = async () => {
    if (!form.name || !form.sku || !form.price) {
      setError('Name, SKU, and price are required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        sku: form.sku,
        category: form.category || 'General',
        price: parseFloat(form.price) || 0,
        cost: parseFloat(form.cost) || 0,
        unit: form.unit,
        stock_quantity: parseInt(form.stock_quantity) || 0,
        low_stock_threshold: parseInt(form.low_stock_threshold) || 10,
      };
      if (isEditing && id) {
        await salesApi.updateProduct(id, payload);
      } else {
        await salesApi.createProduct(payload);
      }
      router.back();
    } catch {
      setError('Could not save the product. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleStockAdjust = async () => {
    if (!id || !stockAdjust) return;
    setSaving(true);
    setError(null);
    try {
      const newQty = parseInt(stockAdjust);
      await salesApi.adjustStock(id, newQty, stockReason);
      setShowStockAdjust(false);
      setStockAdjust('');
      setStockReason('');
      product.refetch();
    } catch {
      setError('Could not adjust stock. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const categories = ['Groceries', 'Beverages', 'Bakery', 'Household', 'Canned Goods', 'General'];

  if (isEditing && product.loading && !product.data) {
    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={Colors.neutral[700]} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Edit Product</Text>
        </View>
        <LoadingState />
      </View>
    );
  }

  if (isEditing && product.error) {
    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={Colors.neutral[700]} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Edit Product</Text>
        </View>
        <ErrorState message={product.error} onRetry={product.refetch} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={Colors.neutral[700]} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>{isEditing ? 'Edit Product' : 'New Product'}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Input label="Product Name" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholder="e.g. Rice 5kg Bag" />
        <Input label="SKU" value={form.sku} onChangeText={(v) => setForm({ ...form, sku: v })} placeholder="e.g. RICE-5KG" autoCapitalize="none" />

        <Text style={styles.fieldLabel}>Category</Text>
        <View style={styles.categoryRow}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setForm({ ...form, category: cat })}
              style={[styles.categoryChip, form.category === cat && styles.categoryChipActive]}
            >
              <Text style={[styles.categoryChipText, form.category === cat && styles.categoryChipTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.priceRow}>
          <View style={styles.priceInput}>
            <Text style={styles.fieldLabel}>Price ({currency})</Text>
            <TextInput
              style={styles.numInput}
              value={form.price}
              onChangeText={(v) => setForm({ ...form, price: v })}
              placeholder="0.00"
              placeholderTextColor={Colors.neutral[400]}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.priceInput}>
            <Text style={styles.fieldLabel}>Cost ({currency})</Text>
            <TextInput
              style={styles.numInput}
              value={form.cost}
              onChangeText={(v) => setForm({ ...form, cost: v })}
              placeholder="0.00"
              placeholderTextColor={Colors.neutral[400]}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.priceRow}>
          <View style={styles.priceInput}>
            <Text style={styles.fieldLabel}>Stock Quantity</Text>
            <TextInput
              style={styles.numInput}
              value={form.stock_quantity}
              onChangeText={(v) => setForm({ ...form, stock_quantity: v })}
              placeholder="0"
              placeholderTextColor={Colors.neutral[400]}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.priceInput}>
            <Text style={styles.fieldLabel}>Low Stock Alert</Text>
            <TextInput
              style={styles.numInput}
              value={form.low_stock_threshold}
              onChangeText={(v) => setForm({ ...form, low_stock_threshold: v })}
              placeholder="10"
              placeholderTextColor={Colors.neutral[400]}
              keyboardType="numeric"
            />
          </View>
        </View>

        <Input label="Unit" value={form.unit} onChangeText={(v) => setForm({ ...form, unit: v })} placeholder="piece, bag, box..." />

        {isEditing && product.data && (
          <View style={styles.stockSection}>
            <Card padding="md" style={styles.stockCard}>
              <View style={styles.stockHeader}>
                <View>
                  <Text style={styles.stockLabel}>Current Stock</Text>
                  <Text style={styles.stockValue}>{product.data.stock_quantity} {product.data.unit}</Text>
                </View>
                {product.data.stock_quantity <= product.data.low_stock_threshold && (
                  <View style={[styles.stockWarning, product.data.stock_quantity === 0 ? styles.stockWarningOut : styles.stockWarningLow]}>
                    <AlertTriangle size={16} color={product.data.stock_quantity === 0 ? Colors.error[600] : Colors.warning[600]} strokeWidth={2} />
                    <Text style={[styles.stockWarningText, product.data.stock_quantity === 0 ? styles.stockWarningOutText : styles.stockWarningLowText]}>
                      {product.data.stock_quantity === 0 ? 'Out of stock' : 'Below threshold'}
                    </Text>
                  </View>
                )}
              </View>
              {!showStockAdjust ? (
                <Button label="Adjust Stock" onPress={() => setShowStockAdjust(true)} variant="outline" size="sm" />
              ) : (
                <View style={styles.stockAdjustForm}>
                  <Text style={styles.fieldLabel}>New Stock Quantity</Text>
                  <TextInput
                    style={styles.numInput}
                    value={stockAdjust}
                    onChangeText={setStockAdjust}
                    placeholder={String(product.data.stock_quantity)}
                    placeholderTextColor={Colors.neutral[400]}
                    keyboardType="numeric"
                  />
                  <Text style={styles.fieldLabel}>Reason</Text>
                  <TextInput
                    style={styles.reasonInput}
                    value={stockReason}
                    onChangeText={setStockReason}
                    placeholder="e.g. Damaged goods, miscount, delivery..."
                    placeholderTextColor={Colors.neutral[400]}
                    multiline
                  />
                  <View style={styles.stockAdjustActions}>
                    <Button label="Cancel" onPress={() => setShowStockAdjust(false)} variant="ghost" size="sm" />
                    <Button label="Save Adjustment" onPress={handleStockAdjust} loading={saving} size="sm" />
                  </View>
                </View>
              )}
            </Card>
          </View>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Button
          label={isEditing ? 'Save Changes' : 'Create Product'}
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
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  categoryChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: 12, borderWidth: 1, borderColor: Colors.neutral[300], backgroundColor: Colors.neutral[0] },
  categoryChipActive: { borderColor: Colors.primary[500], backgroundColor: Colors.primary[50] },
  categoryChipText: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.sm, color: Colors.neutral[600] },
  categoryChipTextActive: { color: Colors.primary[700] },
  priceRow: { flexDirection: 'row', gap: Spacing.md },
  priceInput: { flex: 1 },
  numInput: { borderWidth: 1, borderColor: Colors.neutral[300], borderRadius: 12, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.md, color: Colors.neutral[900], backgroundColor: Colors.neutral[0] },
  stockSection: { marginTop: Spacing.lg },
  stockCard: { gap: Spacing.md },
  stockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stockLabel: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[500] },
  stockValue: { fontFamily: Typography.fontFamilyBold, fontSize: Typography.sizes.xl, color: Colors.neutral[900], marginTop: 2 },
  stockWarning: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: 8 },
  stockWarningOut: { backgroundColor: Colors.error[50] },
  stockWarningLow: { backgroundColor: Colors.warning[50] },
  stockWarningText: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.xs },
  stockWarningOutText: { color: Colors.error[700] },
  stockWarningLowText: { color: Colors.warning[700] },
  stockAdjustForm: { gap: 0 },
  reasonInput: { borderWidth: 1, borderColor: Colors.neutral[300], borderRadius: 12, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.md, color: Colors.neutral[900], backgroundColor: Colors.neutral[0], minHeight: 60, marginTop: 4 },
  stockAdjustActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.md, marginTop: Spacing.md },
  errorText: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.error[600], marginTop: Spacing.md },
  saveBtn: { marginTop: Spacing.xl },
});
