import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useBusiness } from '@/context/BusinessContext';
import { productApi } from '@/lib/api';
import { createIdempotencyKey } from '@/lib/backend';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, spacing, fontSizes, fontWeights, radius } from '@/theme';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ScanLine, Keyboard, Check, CameraOff } from 'lucide-react-native';

export default function BarcodeAddScreen() {
  const router = useRouter();
  const { currentBusiness } = useBusiness();
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<'scan' | 'manual' | 'hid'>('scan');
  const [scanned, setScanned] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const idempotencyKey = useRef(createIdempotencyKey());

  const [form, setForm] = useState({
    name: '',
    sku: '',
    cost_price: '',
    selling_price: '',
    unit: 'piece',
  });

  const update = (key: string, value: string) => {
    idempotencyKey.current = createIdempotencyKey();
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleBarCodeScanned = (data: { data: string }) => {
    setScanned(true);
    setBarcode(data.data);
    idempotencyKey.current = createIdempotencyKey();
    setMode('manual');
  };

  const handleHidScan = (value: string) => {
    const scannedValue = value.trim();
    if (!scannedValue) return;
    setBarcode(scannedValue);
    setScanned(true);
    idempotencyKey.current = createIdempotencyKey();
    setMode('manual');
  };

  const handleSave = async () => {
    if (!currentBusiness) return;
    if (!barcode.trim()) { setError('Barcode is required.'); return; }
    if (!form.name.trim()) { setError('Product name is required.'); return; }
    if (!form.selling_price || Number(form.selling_price) <= 0) { setError('Selling price must be greater than 0.'); return; }

    setLoading(true);
    setError(null);

    try {
      await productApi.create(currentBusiness.id, {
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        barcode: barcode.trim(),
        cost_price: Number(form.cost_price) || 0,
        selling_price: Number(form.selling_price),
        reorder_threshold: 0,
        unit: form.unit,
      }, idempotencyKey.current, currentBusiness.currency_exponent);
      router.replace('/(app)/products');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create product');
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Add via Barcode</Text>
        <Text style={styles.pageSubtitle}>Scan a barcode or enter it manually</Text>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Mode toggle */}
      <View style={styles.modeToggle}>
        <TouchableOpacity
          onPress={() => { setScanned(false); setMode('scan'); }}
          style={[styles.modeBtn, mode === 'scan' && styles.modeBtnActive]}
        >
          <ScanLine size={18} color={mode === 'scan' ? colors.textInverse : colors.textSecondary} />
          <Text style={[styles.modeLabel, mode === 'scan' && styles.modeLabelActive]}>Scan Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setMode('manual')}
          style={[styles.modeBtn, mode === 'manual' && styles.modeBtnActive]}
        >
          <Keyboard size={18} color={mode === 'manual' ? colors.textInverse : colors.textSecondary} />
          <Text style={[styles.modeLabel, mode === 'manual' && styles.modeLabelActive]}>Enter Manually</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { setScanned(false); setBarcode(''); setMode('hid'); }}
          style={[styles.modeBtn, mode === 'hid' && styles.modeBtnActive]}
          accessibilityRole="button"
          accessibilityLabel="Use USB or Bluetooth barcode scanner"
        >
          <Keyboard size={18} color={mode === 'hid' ? colors.textInverse : colors.textSecondary} />
          <Text style={[styles.modeLabel, mode === 'hid' && styles.modeLabelActive]}>USB / Bluetooth</Text>
        </TouchableOpacity>
      </View>

      {mode === 'hid' && <Card>
        <Text style={styles.sectionLabel}>Keyboard scanner</Text>
        <Text style={styles.webCameraText}>Connect a USB scanner or pair a Bluetooth scanner in your device settings. Keep this field focused and configure the scanner to send Enter after each barcode.</Text>
        <Input
          label="Scan barcode"
          value={barcode}
          onChangeText={(value) => setBarcode(value)}
          onSubmitEditing={handleHidScan}
          autoFocus
          returnKeyType="done"
          blurOnSubmit={false}
          placeholder="Scan here; Enter completes the scan"
        />
      </Card>}

      {/* Barcode field — always visible */}
      {mode === 'manual' && (
        <Card>
          <Input
            label="Barcode *"
            value={barcode}
            onChangeText={(value) => {
              idempotencyKey.current = createIdempotencyKey();
              setBarcode(value);
            }}
            placeholder="e.g. 8901234567890"
            hint="Letters, digits, and standard barcode characters are supported."
          />
        </Card>
      )}

      {/* Camera scanner */}
      {mode === 'scan' && Platform.OS === 'web' && (
        <Card style={styles.webCameraPlaceholder}>
          <CameraOff size={32} color={colors.textSecondary} />
          <Text style={styles.webCameraText}>Camera scanning is available on mobile devices.</Text>
          <Button label="Enter Barcode Manually" variant="outline" onPress={() => setMode('manual')} />
        </Card>
      )}

      {mode === 'scan' && Platform.OS !== 'web' && (
        <View style={styles.cameraWrap}>
          {!permission ? (
            <Text style={styles.muted}>Requesting camera permission...</Text>
          ) : !permission.granted ? (
            <View style={styles.permissionBox}>
              <Text style={styles.permissionText}>Camera access is needed to scan barcodes.</Text>
              <Button label="Grant Permission" onPress={requestPermission} />
            </View>
          ) : (
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing="back"
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            />
          )}
          {scanned && barcode && (
            <View style={styles.scannedBadge}>
              <Check size={16} color={colors.textInverse} />
              <Text style={styles.scannedText}>Scanned: {barcode}</Text>
            </View>
          )}
        </View>
      )}

      {/* Product details form — appears after scan or in manual mode */}
      {(barcode || mode === 'manual') && (
        <Card>
          <Text style={styles.sectionLabel}>Product Details</Text>
          <Input label="Product name *" value={form.name} onChangeText={(v) => update('name', v)} placeholder="e.g. Energy Drink" />
          <Input label="SKU" value={form.sku} onChangeText={(v) => update('sku', v)} placeholder="SKU-007" />
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Input label="Cost price" value={form.cost_price} onChangeText={(v) => update('cost_price', v)} placeholder="0.00" keyboardType="numeric" hint={`In ${currentBusiness?.currency ?? 'USD'}`} />
            </View>
            <View style={styles.halfInput}>
              <Input label="Selling price *" value={form.selling_price} onChangeText={(v) => update('selling_price', v)} placeholder="0.00" keyboardType="numeric" hint={`In ${currentBusiness?.currency ?? 'USD'}`} />
            </View>
          </View>
          <Input label="Unit" value={form.unit} onChangeText={(v) => update('unit', v)} placeholder="piece, kg, liter..." />
          <Text style={styles.stockHint}>Record stock when goods arrive using Purchases. This keeps stock and accounting in sync.</Text>

          <View style={styles.buttonRow}>
            <Button label="Cancel" variant="outline" onPress={() => router.back()} />
            <Button label="Save Product" onPress={handleSave} loading={loading} style={{ flex: 1 }} />
          </View>
        </Card>
      )}
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

  modeToggle: { flexDirection: 'row', gap: spacing.sm } as any,
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    paddingVertical: spacing.md, borderRadius: radius.md,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  } as any,
  modeBtnActive: { backgroundColor: colors.blue, borderColor: colors.blue } as any,
  modeLabel: { fontSize: fontSizes.sm, color: colors.textSecondary, fontWeight: fontWeights.medium } as any,
  modeLabelActive: { color: colors.textInverse, fontWeight: fontWeights.semibold } as any,

  webCameraPlaceholder: { alignItems: 'center', gap: spacing.md, padding: spacing.xxl } as any,
  webCameraText: { fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center' } as any,

  cameraWrap: { borderRadius: radius.lg, overflow: 'hidden', minHeight: 300 } as any,
  camera: { flex: 1, minHeight: 300 } as any,
  permissionBox: { padding: spacing.xl, alignItems: 'center', gap: spacing.md } as any,
  permissionText: { fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center' } as any,
  scannedBadge: {
    position: 'absolute', bottom: spacing.md, left: spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.success, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  } as any,
  scannedText: { color: colors.textInverse, fontSize: fontSizes.sm, fontWeight: fontWeights.semibold } as any,

  muted: { color: colors.textSecondary, fontSize: fontSizes.md, textAlign: 'center', padding: spacing.xl } as any,
  sectionLabel: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.textSecondary, marginBottom: spacing.md } as any,
  row: { flexDirection: 'row', gap: spacing.md } as any,
  halfInput: { flex: 1 } as any,
  buttonRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg } as any,
  stockHint: { fontSize: fontSizes.xs, color: colors.textSecondary, marginBottom: spacing.md } as any,
});
