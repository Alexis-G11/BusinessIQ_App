import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search, Plus, Minus, Trash2, Check } from 'lucide-react-native';
import { Button, Card, Input, LoadingState } from '@/components/ui';
import { Colors, Spacing, Radius, Typography, formatCurrency } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';
import { useFetch } from '@/lib/useFetch';
import * as salesApi from '@/api/sales';
import * as contactsApi from '@/api/contacts';
import type { Product, Customer } from '@/lib/types';

interface CartItem {
  product: Product;
  quantity: number;
}

export default function RecordSaleScreen() {
  const router = useRouter();
  const { organization } = useAuth();
  const currency = organization?.currency ?? 'USD';
  const products = useFetch(() => salesApi.getProducts(), []);
  const customers = useFetch(() => contactsApi.getCustomers(), []);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile_money' | 'bank_transfer' | 'credit'>('cash');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    if (!products.data) return [];
    const q = search.toLowerCase();
    return products.data.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
  }, [products.data, search]);

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const taxAmount = Math.round(subtotal * 0.08 * 100) / 100;
  const total = subtotal + taxAmount;

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) => (i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.product.id === productId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i))
        .filter((i) => i.quantity > 0),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const handleSave = async () => {
    if (cart.length === 0) {
      setError('Add at least one product to the sale');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await salesApi.createSale({
        customer_id: selectedCustomer,
        line_items: cart.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
        payment_method: paymentMethod,
      });
      router.replace('/(tabs)/sales');
    } catch {
      setError('Could not save the sale. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const paymentMethods = [
    { label: 'Cash', value: 'cash' as const },
    { label: 'Card', value: 'card' as const },
    { label: 'Mobile Money', value: 'mobile_money' as const },
    { label: 'Bank Transfer', value: 'bank_transfer' as const },
    { label: 'Credit', value: 'credit' as const },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={Colors.neutral[700]} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Record Sale</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>Search Products</Text>
        <View style={styles.searchWrap}>
          <Search size={18} color={Colors.neutral[400]} strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or SKU..."
            placeholderTextColor={Colors.neutral[400]}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {products.loading ? (
          <LoadingState />
        ) : (
          <View style={styles.productList}>
            {filteredProducts.map((p) => (
              <TouchableOpacity key={p.id} onPress={() => addToCart(p)} style={styles.productRow}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{p.name}</Text>
                  <Text style={styles.productMeta}>{p.sku} · {formatCurrency(p.price, currency)}</Text>
                </View>
                <View style={styles.productRight}>
                  <Text style={styles.productStock}>{p.stock_quantity} in stock</Text>
                  <View style={styles.addBtn}>
                    <Plus size={16} color={Colors.primary[600]} strokeWidth={2.5} />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.sectionLabel}>Customer</Text>
        <View style={styles.customerList}>
          <TouchableOpacity
            onPress={() => setSelectedCustomer(null)}
            style={[styles.customerChip, !selectedCustomer && styles.customerChipActive]}
          >
            <Text style={[styles.customerChipText, !selectedCustomer && styles.customerChipTextActive]}>Walk-in Customer</Text>
          </TouchableOpacity>
          {customers.data?.filter((c) => c.id !== 'cust_1').map((c: Customer) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => setSelectedCustomer(c.id)}
              style={[styles.customerChip, selectedCustomer === c.id && styles.customerChipActive]}
            >
              <Text style={[styles.customerChipText, selectedCustomer === c.id && styles.customerChipTextActive]}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Payment Method</Text>
        <View style={styles.paymentRow}>
          {paymentMethods.map((m) => (
            <TouchableOpacity
              key={m.value}
              onPress={() => setPaymentMethod(m.value)}
              style={[styles.paymentChip, paymentMethod === m.value && styles.paymentChipActive]}
            >
              <Text style={[styles.paymentChipText, paymentMethod === m.value && styles.paymentChipTextActive]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {cart.length > 0 && (
          <View style={styles.cartSection}>
            <Text style={styles.sectionLabel}>Order Items ({cart.length})</Text>
            {cart.map((item) => (
              <Card key={item.product.id} padding="md" style={styles.cartRow}>
                <View style={styles.cartInfo}>
                  <Text style={styles.cartName}>{item.product.name}</Text>
                  <Text style={styles.cartPrice}>{formatCurrency(item.product.price, currency)} each</Text>
                </View>
                <View style={styles.cartControls}>
                  <TouchableOpacity onPress={() => updateQty(item.product.id, -1)} style={styles.qtyBtn}>
                    <Minus size={16} color={Colors.neutral[600]} strokeWidth={2.5} />
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity onPress={() => updateQty(item.product.id, 1)} style={styles.qtyBtn}>
                    <Plus size={16} color={Colors.neutral[600]} strokeWidth={2.5} />
                  </TouchableOpacity>
                  <Text style={styles.cartLineTotal}>{formatCurrency(item.product.price * item.quantity, currency)}</Text>
                  <TouchableOpacity onPress={() => removeFromCart(item.product.id)} style={styles.removeBtn}>
                    <Trash2 size={16} color={Colors.error[500]} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              </Card>
            ))}

            <Card padding="md" style={styles.totalCard}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>{formatCurrency(subtotal, currency)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tax (8%)</Text>
                <Text style={styles.totalValue}>{formatCurrency(taxAmount, currency)}</Text>
              </View>
              <View style={[styles.totalRow, styles.grandTotal]}>
                <Text style={styles.grandTotalLabel}>Total</Text>
                <Text style={styles.grandTotalValue}>{formatCurrency(total, currency)}</Text>
              </View>
            </Card>
          </View>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Button
          label="Confirm Sale"
          onPress={handleSave}
          loading={saving}
          size="lg"
          disabled={cart.length === 0}
          icon={<Check size={20} color={Colors.neutral[0]} strokeWidth={2.5} />}
          style={styles.confirmBtn}
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
  sectionLabel: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.sm, color: Colors.neutral[700], marginTop: Spacing.md, marginBottom: Spacing.sm },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.neutral[0], borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.neutral[300], paddingHorizontal: Spacing.md, gap: Spacing.sm },
  searchInput: { flex: 1, fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.md, color: Colors.neutral[900], paddingVertical: Spacing.md },
  productList: { gap: Spacing.xs },
  productRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.neutral[0], borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.neutral[200] },
  productInfo: { flex: 1 },
  productName: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.md, color: Colors.neutral[900] },
  productMeta: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.xs, color: Colors.neutral[500], marginTop: 2 },
  productRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  productStock: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.xs, color: Colors.neutral[400] },
  addBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary[50], alignItems: 'center', justifyContent: 'center' },
  customerList: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  customerChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.neutral[300], backgroundColor: Colors.neutral[0] },
  customerChipActive: { borderColor: Colors.primary[500], backgroundColor: Colors.primary[50] },
  customerChipText: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.sm, color: Colors.neutral[600] },
  customerChipTextActive: { color: Colors.primary[700] },
  paymentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  paymentChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.neutral[300], backgroundColor: Colors.neutral[0] },
  paymentChipActive: { borderColor: Colors.primary[500], backgroundColor: Colors.primary[50] },
  paymentChipText: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.sm, color: Colors.neutral[600] },
  paymentChipTextActive: { color: Colors.primary[700] },
  cartSection: { marginTop: Spacing.lg },
  cartRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  cartInfo: { flex: 1 },
  cartName: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.md, color: Colors.neutral[900] },
  cartPrice: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.xs, color: Colors.neutral[500], marginTop: 2 },
  cartControls: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.neutral[100], alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.md, color: Colors.neutral[900], minWidth: 20, textAlign: 'center' },
  cartLineTotal: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.md, color: Colors.neutral[900], marginLeft: Spacing.sm },
  removeBtn: { padding: Spacing.xs },
  totalCard: { marginTop: Spacing.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalLabel: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[600] },
  totalValue: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[900] },
  grandTotal: { borderTopWidth: 1, borderTopColor: Colors.neutral[200], marginTop: Spacing.xs, paddingTop: Spacing.sm },
  grandTotalLabel: { fontFamily: Typography.fontFamilyBold, fontSize: Typography.sizes.lg, color: Colors.neutral[900] },
  grandTotalValue: { fontFamily: Typography.fontFamilyBold, fontSize: Typography.sizes.lg, color: Colors.primary[700] },
  errorText: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.error[600], marginTop: Spacing.md },
  confirmBtn: { marginTop: Spacing.lg },
});
