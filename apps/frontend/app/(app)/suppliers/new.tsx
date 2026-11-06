import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useBusiness } from '@/context/BusinessContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, spacing, fontSizes, fontWeights } from '@/theme';
import { contactApi } from '@/lib/api';

export default function NewSupplierScreen() {
  const router = useRouter();
  const { currentBusiness } = useBusiness();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' });

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    if (!currentBusiness) return;
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setLoading(true);
    setError(null);
    try {
      await contactApi.create(currentBusiness.id, {
        type: 'supplier',
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
      });
      router.replace('/(app)/suppliers');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create supplier');
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Add Supplier</Text>
        <Text style={styles.pageSubtitle}>Create a new supplier record</Text>
      </View>
      {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}
      <Card>
        <Input label="Name *" value={form.name} onChangeText={(v) => update('name', v)} placeholder="Supplier business name" />
        <View style={styles.row}>
          <View style={styles.half}><Input label="Email" value={form.email} onChangeText={(v) => update('email', v)} placeholder="contact@email.com" keyboardType="email-address" /></View>
          <View style={styles.half}><Input label="Phone" value={form.phone} onChangeText={(v) => update('phone', v)} placeholder="+1 555 000 1234" keyboardType="phone-pad" /></View>
        </View>
        <Input label="Address" value={form.address} onChangeText={(v) => update('address', v)} placeholder="Street, City, Country" />
        <View style={styles.buttonRow}>
          <Button label="Cancel" variant="outline" onPress={() => router.back()} />
          <Button label="Save" onPress={handleSave} loading={loading} style={{ flex: 1 }} />
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
  half: { flex: 1 } as any,
  buttonRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg } as any,
});
