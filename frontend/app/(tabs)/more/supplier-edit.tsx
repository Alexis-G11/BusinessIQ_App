import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Check } from 'lucide-react-native';
import { Button, Input } from '@/components/ui';
import { Colors, Spacing, Typography } from '@/lib/theme';
import { useFetch } from '@/lib/useFetch';
import * as contactsApi from '@/api/contacts';

export default function SupplierEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const isEditing = !!id;
  const supplier = useFetch(() => (id ? contactsApi.getSupplier(id) : Promise.resolve(null)), [id]);

  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (supplier.data) {
      setForm({ name: supplier.data.name, phone: supplier.data.phone, email: supplier.data.email, address: supplier.data.address });
    }
  }, [supplier.data]);

  const handleSave = async () => {
    if (!form.name) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (isEditing && id) {
        await contactsApi.updateSupplier(id, form);
      } else {
        await contactsApi.createSupplier(form);
      }
      router.back();
    } catch {
      setError('Could not save the supplier. Please try again.');
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
        <Text style={styles.topTitle}>{isEditing ? 'Edit Supplier' : 'New Supplier'}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Input label="Name" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholder="Supplier or company name" />
        <Input label="Phone" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} placeholder="+1 555-0300" keyboardType="phone-pad" />
        <Input label="Email" value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} placeholder="email@supplier.com" keyboardType="email-address" autoCapitalize="none" />
        <Input label="Address" value={form.address} onChangeText={(v) => setForm({ ...form, address: v })} placeholder="Street address" />

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Button
          label={isEditing ? 'Save Changes' : 'Add Supplier'}
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
  errorText: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.error[600], marginTop: Spacing.md },
  saveBtn: { marginTop: Spacing.xl },
});
