import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useBusiness } from '@/context/BusinessContext';
import { useProducts, useContacts } from '@/hooks/useBusinessData';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingState, ErrorState } from '@/components/ui/States';
import { formatCurrency } from '@/lib/format';
import { colors, spacing, fontSizes, fontWeights } from '@/theme';
import { moneyToCents, saleApi } from '@/lib/api';
import { createIdempotencyKey } from '@/lib/backend';
import { Search, Plus, Minus, Trash2, ShoppingCart } from 'lucide-react-native';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export default function NewSaleScreen() {
  const router = useRouter();
  const { currentBusiness } = useBusiness();
  const { data: products, loading: productsLoading, error: productsError } = useProducts();
  const { data: customers, loading: customersLoading, error: customersError } = useContacts('customer');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank' | 'mobile_money'>('cash');
  const [discount, setDiscount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittedRequest = useRef<{ fingerprint: string; key: string } | null>(null);
  const [quoteState, setQuoteState] = useState<{
    key: string;
    quote?: { subtotal_cents: number; discount_cents: number; tax_cents: number; total_cents: number };
    error?: string;
  } | null>(null);

  const filteredProducts = products.filter((p) =>
    p.is_active && (
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.includes(search)
    )
  );

  const addToCart = (productId: string, name: string, price: number) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === productId);
      if (existing) {
        return prev.map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { productId, name, price, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const currency = currentBusiness?.currency ?? 'USD';
  const currencyExponent = currentBusiness?.currency_exponent ?? 2;
  const quoteKey = `${currentBusiness?.id ?? ''}:${JSON.stringify(cart.map(({ productId, quantity }) => [productId, quantity]))}:${discount}`;
  const quote = quoteState?.key === quoteKey ? quoteState.quote ?? null : null;
  const quoteError = quoteState?.key === quoteKey ? quoteState.error ?? null : null;
  const quoteLoading = Boolean(currentBusiness && cart.length > 0 && !quote && !quoteError);

  useEffect(() => {
    if (!currentBusiness || cart.length === 0) return;
    let active = true;
    const requestQuote = async () => {
      try {
        const result = await saleApi.quote(currentBusiness.id, {
          items: cart.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
          discount_cents: moneyToCents(discount, currentBusiness.currency_exponent),
        });
        if (active) setQuoteState({ key: quoteKey, quote: result });
      } catch (e) {
        if (active) {
          setQuoteState({
            key: quoteKey,
            error: e instanceof Error ? e.message : 'Could not calculate the sale total.',
          });
        }
      }
    };
    void requestQuote();
    return () => { active = false; };
  }, [currentBusiness, cart, discount, quoteKey]);

  const handleCompleteSale = async () => {
    if (!currentBusiness) return;
    if (cart.length === 0) {
      setError('Add at least one product to the cart.');
      return;
    }
    if (!quote) {
      setError(quoteError ?? 'Wait for the server to calculate the sale total.');
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const paidCents = paidAmount.trim()
        ? moneyToCents(paidAmount, currentBusiness.currency_exponent)
        : quote.total_cents;
      if (paidCents > quote.total_cents) throw new Error('Amount paid cannot exceed the sale total.');
      if (paidCents < quote.total_cents && !customerId) {
        throw new Error('Select a customer when the sale is not paid in full.');
      }
      const request = {
        customer_id: customerId || null,
        discount_cents: quote.discount_cents,
        items: cart.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
        payments: paidCents > 0 ? [{ method: paymentMethod, amount_cents: paidCents }] : [],
      };
      const fingerprint = JSON.stringify(request);
      if (submittedRequest.current?.fingerprint !== fingerprint) {
        submittedRequest.current = { fingerprint, key: createIdempotencyKey() };
      }
      const sale = await saleApi.create(currentBusiness.id, request, null, submittedRequest.current.key);

      Alert.alert(
        'Sale Complete',
        `Sale ${sale.reference ?? ''} recorded successfully. Total: ${formatCurrency(sale.total_cents / 100, currency, currencyExponent)}`,
      );
      router.replace('/(app)/sales');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to complete sale.');
      setSubmitting(false);
    }
  };

  if (productsLoading || customersLoading) return <LoadingState message="Loading..." />;
  if (productsError || customersError) return <ErrorState message={productsError ?? customersError ?? 'Could not load sales data.'} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>New Sale</Text>
        <Text style={styles.pageSubtitle}>Select products and complete the transaction</Text>
      </View>

      {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}
      {quoteError && <View style={styles.errorBox}><Text style={styles.errorText}>{quoteError}</Text></View>}

      <View style={styles.mainRow}>
        {/* Product search and list */}
        <View style={styles.productPanel}>
          <View style={styles.searchInputWrap}>
            <Search size={18} color={colors.textSecondary} />
            <TextInput style={styles.searchInput} placeholder="Search products by name, SKU, or barcode..." value={search} onChangeText={setSearch} placeholderTextColor={colors.textSecondary} />
          </View>
          <ScrollView style={styles.productList} contentContainerStyle={{ gap: spacing.sm }}>
            {filteredProducts.length === 0 ? (
              <Text style={styles.emptyText}>No products found.</Text>
            ) : (
              filteredProducts.map((product) => (
                <TouchableOpacity
                  key={product.id}
                  style={styles.productItem}
                  onPress={() => addToCart(product.id, product.name, Number(product.selling_price))}
                >
                  <View style={styles.productItemInfo}>
                    <Text style={styles.productItemName}>{product.name}</Text>
                    <Text style={styles.productItemStock}>Stock: {Number(product.stock_quantity)} {product.unit}</Text>
                  </View>
                  <Text style={styles.productItemPrice}>{formatCurrency(Number(product.selling_price), currency, currencyExponent)}</Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>

        {/* Cart panel */}
        <View style={styles.cartPanel}>
          <Text style={styles.cartTitle}>Cart</Text>
          {cart.length === 0 ? (
            <View style={styles.emptyCart}>
              <ShoppingCart size={32} color={colors.textSecondary} />
              <Text style={styles.emptyCartText}>Tap a product to add it to the cart</Text>
            </View>
          ) : (
            <>
              {cart.map((item) => (
                <View key={item.productId} style={styles.cartItem}>
                  <View style={styles.cartItemInfo}>
                    <Text style={styles.cartItemName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.cartItemPrice}>{formatCurrency(item.price, currency, currencyExponent)}</Text>
                  </View>
                  <View style={styles.cartItemControls}>
                    <TouchableOpacity onPress={() => updateQuantity(item.productId, -1)} style={styles.qtyBtn}>
                      <Minus size={14} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.qtyValue}>{item.quantity}</Text>
                    <TouchableOpacity onPress={() => updateQuantity(item.productId, 1)} style={styles.qtyBtn}>
                      <Plus size={14} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeFromCart(item.productId)} style={styles.removeBtn}>
                      <Trash2 size={14} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )}

          {cart.length > 0 && (
            <View style={styles.cartSummary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>{formatCurrency(subtotal, currency, currencyExponent)}</Text>
              </View>
              <Input label="Discount" value={discount} onChangeText={setDiscount} placeholder="0.00" keyboardType="numeric" hint={`In ${currency}`} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tax (business settings)</Text>
                <Text style={styles.summaryValue}>{quote ? formatCurrency(quote.tax_cents / 100, currency, currencyExponent) : '—'}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>
                  {quoteLoading ? 'Calculating…' : quote ? formatCurrency(quote.total_cents / 100, currency, currencyExponent) : '—'}
                </Text>
              </View>

              <Text style={styles.label}>Customer (optional)</Text>
              <View style={styles.customerSelect}>
                {customers.length === 0 ? (
                  <Text style={styles.noCustomers}>No customers added yet</Text>
                ) : (
                  customers.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => setCustomerId(customerId === c.id ? '' : c.id)}
                      style={[styles.customerChip, customerId === c.id && styles.customerChipSelected]}
                    >
                      <Text style={[styles.customerChipText, customerId === c.id && styles.customerChipTextSelected]}>{c.name}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>

              <Text style={styles.label}>Payment Method</Text>
              <View style={styles.paymentRow}>
                {(['cash', 'card', 'bank', 'mobile_money'] as const).map((method) => (
                  <TouchableOpacity
                    key={method}
                    onPress={() => setPaymentMethod(method)}
                    style={[styles.paymentChip, paymentMethod === method && styles.paymentChipSelected]}
                  >
                    <Text style={[styles.paymentChipText, paymentMethod === method && styles.paymentChipTextSelected]}>
                      {method.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Amount Paid"
                value={paidAmount}
                onChangeText={setPaidAmount}
                placeholder={quote ? (quote.total_cents / 100).toFixed(2) : '0.00'}
                keyboardType="numeric"
                hint={`Leave empty for full payment in ${currency}`}
              />

              <Button label="Complete Sale" onPress={handleCompleteSale} loading={submitting} disabled={quoteLoading || !quote} fullWidth size="lg" />
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background } as any,
  content: { padding: spacing.xl, gap: spacing.lg } as any,
  header: { marginBottom: spacing.sm } as any,
  pageTitle: { fontSize: fontSizes.xxl, fontWeight: fontWeights.bold, color: colors.text } as any,
  pageSubtitle: { fontSize: fontSizes.md, color: colors.textSecondary, marginTop: 4 } as any,
  errorBox: { backgroundColor: colors.dangerBg, borderRadius: 8, padding: spacing.md } as any,
  errorText: { color: colors.danger, fontSize: fontSizes.sm } as any,
  mainRow: { flexDirection: 'row', gap: spacing.lg } as any,
  productPanel: { flex: 1, minWidth: 300 } as any,
  cartPanel: { flex: 1, minWidth: 320, maxWidth: 480 } as any,
  searchInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: spacing.md, minHeight: 48, gap: spacing.sm, marginBottom: spacing.md } as any,
  searchInput: { flex: 1, fontSize: fontSizes.md, color: colors.text, outlineStyle: 'none' } as any,
  productList: { maxHeight: 400 } as any,
  productItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 8 } as any,
  productItemInfo: { flex: 1 } as any,
  productItemName: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.text } as any,
  productItemStock: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: 2 } as any,
  productItemPrice: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.blue } as any,
  emptyText: { color: colors.textSecondary, fontSize: fontSizes.sm, padding: spacing.xl, textAlign: 'center' } as any,
  cartTitle: { fontSize: fontSizes.lg, fontWeight: fontWeights.semibold, color: colors.text, marginBottom: spacing.md } as any,
  emptyCart: { padding: spacing.xl, alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10 } as any,
  emptyCartText: { fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center' } as any,
  cartItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border } as any,
  cartItemInfo: { flex: 1 } as any,
  cartItemName: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.text } as any,
  cartItemPrice: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: 2 } as any,
  cartItemControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm } as any,
  qtyBtn: { width: 28, height: 28, borderRadius: 6, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' } as any,
  qtyValue: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.text, minWidth: 24, textAlign: 'center' } as any,
  removeBtn: { padding: spacing.xs } as any,
  cartSummary: { marginTop: spacing.lg, gap: spacing.sm } as any,
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' } as any,
  summaryLabel: { fontSize: fontSizes.sm, color: colors.textSecondary } as any,
  summaryValue: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.text } as any,
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.sm } as any,
  totalLabel: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold, color: colors.text } as any,
  totalValue: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold, color: colors.blue } as any,
  label: { fontSize: fontSizes.sm, fontWeight: fontWeights.medium, color: colors.text, marginBottom: spacing.xs, marginTop: spacing.sm } as any,
  customerSelect: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md } as any,
  noCustomers: { fontSize: fontSizes.sm, color: colors.textSecondary } as any,
  customerChip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface } as any,
  customerChipSelected: { borderColor: colors.blue, backgroundColor: '#E0EAFB' } as any,
  customerChipText: { fontSize: fontSizes.sm, color: colors.text } as any,
  customerChipTextSelected: { color: colors.blue, fontWeight: fontWeights.semibold } as any,
  paymentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md } as any,
  paymentChip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface } as any,
  paymentChipSelected: { borderColor: colors.blue, backgroundColor: '#E0EAFB' } as any,
  paymentChipText: { fontSize: fontSizes.sm, color: colors.text, textTransform: 'capitalize' } as any,
  paymentChipTextSelected: { color: colors.blue, fontWeight: fontWeights.semibold } as any,
});
