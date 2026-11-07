import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useBusiness } from '@/context/BusinessContext';
import { backendOrganizationApi, type BackendOrganizationProfile, type BackendOrganizationSettingsUpdate } from '@/lib/backend';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { colors, fontSizes, fontWeights, spacing } from '@/theme';

type FormState = {
  name: string;
  legal_name: string;
  business_type: NonNullable<BackendOrganizationSettingsUpdate['business_type']> | '';
  industry: string;
  business_size: NonNullable<BackendOrganizationSettingsUpdate['business_size']> | '';
  timezone: string;
  address: string;
  phone: string;
  email: string;
  tax_identifier: string;
  fiscal_year_start: string;
};

const BUSINESS_TYPES: NonNullable<BackendOrganizationSettingsUpdate['business_type']>[] = [
  'sole_proprietor', 'llc', 'corporation', 'partnership', 'other',
];
const BUSINESS_SIZES: NonNullable<BackendOrganizationSettingsUpdate['business_size']>[] = ['micro', 'small', 'medium'];

function profileToForm(profile: BackendOrganizationProfile): FormState {
  return {
    name: profile.name,
    legal_name: profile.legal_name ?? '',
    business_type: BUSINESS_TYPES.includes(profile.business_type as NonNullable<BackendOrganizationSettingsUpdate['business_type']>)
      ? profile.business_type as NonNullable<BackendOrganizationSettingsUpdate['business_type']>
      : '',
    industry: profile.industry ?? '',
    business_size: BUSINESS_SIZES.includes(profile.business_size as NonNullable<BackendOrganizationSettingsUpdate['business_size']>)
      ? profile.business_size as NonNullable<BackendOrganizationSettingsUpdate['business_size']>
      : '',
    timezone: profile.timezone,
    address: typeof profile.address?.formatted === 'string' ? profile.address.formatted : '',
    phone: profile.phone ?? '',
    email: profile.email ?? '',
    tax_identifier: profile.tax_identifier ?? '',
    fiscal_year_start: profile.fiscal_year_start ?? '',
  };
}

export default function BusinessSettingsScreen() {
  const router = useRouter();
  const { currentBusiness, currentRole, refreshBusinesses } = useBusiness();
  const canManage = currentRole === 'owner' || currentRole === 'admin';
  const [form, setForm] = useState<FormState | null>(null);
  const [locale, setLocale] = useState<Pick<BackendOrganizationProfile, 'country' | 'currency' | 'currency_exponent'>>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!currentBusiness || !canManage) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const profile = await backendOrganizationApi.getSettings(currentBusiness.id);
      setForm(profileToForm(profile));
      setLocale({ country: profile.country, currency: profile.currency, currency_exponent: profile.currency_exponent });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the business profile.');
    } finally {
      setLoading(false);
    }
  }, [currentBusiness?.id, canManage]);

  useEffect(() => { void load(); }, [load]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((previous) => previous ? { ...previous, [key]: value } : previous);
  };

  const handleSave = async () => {
    if (!currentBusiness || !form) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const payload: BackendOrganizationSettingsUpdate = {
        name: form.name.trim(),
        legal_name: form.legal_name.trim() || null,
        business_type: form.business_type || null,
        industry: form.industry.trim() || null,
        business_size: form.business_size || null,
        timezone: form.timezone.trim(),
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        tax_identifier: form.tax_identifier.trim() || null,
        fiscal_year_start: form.fiscal_year_start.trim() || null,
      };
      const saved = await backendOrganizationApi.updateSettings(currentBusiness.id, payload);
      setForm(profileToForm(saved));
      setNotice('Business profile saved.');
      await refreshBusinesses();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the business profile.');
    } finally {
      setSaving(false);
    }
  };

  if (!canManage) {
    return <View style={styles.container}><Card><Text style={styles.title}>Business profile</Text><Text style={styles.help}>Only the business owner or an administrator can view and change these settings.</Text><Button label="Back to Settings" variant="outline" onPress={() => router.back()} /></Card></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Business profile</Text>
        <Text style={styles.subtitle}>{currentBusiness?.name ?? 'Business workspace'}</Text>
      </View>
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {notice && <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text>}
      {loading || !form ? <Card><Text style={styles.help}>Loading business settings…</Text></Card> : <>
        <Card>
          <Text style={styles.cardTitle}>Business identity</Text>
          <Input label="Business name *" value={form.name} onChangeText={(value) => update('name', value)} />
          <Input label="Legal name" value={form.legal_name} onChangeText={(value) => update('legal_name', value)} />
          <Text style={styles.label}>Business type</Text>
          <View style={styles.chips}>{BUSINESS_TYPES.map((item) => <TouchableOpacity key={item} accessibilityRole="button" accessibilityState={{ selected: form.business_type === item }} style={[styles.chip, form.business_type === item && styles.chipSelected]} onPress={() => update('business_type', item)}><Text style={[styles.chipText, form.business_type === item && styles.chipTextSelected]}>{item.replace('_', ' ')}</Text></TouchableOpacity>)}</View>
          <Input label="Industry" value={form.industry} onChangeText={(value) => update('industry', value)} />
          <Text style={styles.label}>Business size</Text>
          <View style={styles.chips}>{BUSINESS_SIZES.map((item) => <TouchableOpacity key={item} accessibilityRole="button" accessibilityState={{ selected: form.business_size === item }} style={[styles.chip, form.business_size === item && styles.chipSelected]} onPress={() => update('business_size', item)}><Text style={[styles.chipText, form.business_size === item && styles.chipTextSelected]}>{item}</Text></TouchableOpacity>)}</View>
          <Input label="Address" value={form.address} onChangeText={(value) => update('address', value)} />
        </Card>
        <Card>
          <Text style={styles.cardTitle}>Contact and accounting</Text>
          <Input label="Business phone" value={form.phone} onChangeText={(value) => update('phone', value)} keyboardType="phone-pad" />
          <Input label="Business email" value={form.email} onChangeText={(value) => update('email', value)} keyboardType="email-address" autoCapitalize="none" />
          <Input label="Tax identifier" value={form.tax_identifier} onChangeText={(value) => update('tax_identifier', value)} />
          <Input label="Fiscal year start" value={form.fiscal_year_start} onChangeText={(value) => update('fiscal_year_start', value)} placeholder="YYYY-MM-DD" hint="Enter the date the financial year begins." />
          <Input label="Business timezone" value={form.timezone} onChangeText={(value) => update('timezone', value)} placeholder="Africa/Kigali" hint="Use an IANA timezone such as Africa/Kigali." />
        </Card>
        <Card>
          <Text style={styles.cardTitle}>Launch locale</Text>
          <Text style={styles.help}>Country and currency are {locale?.country === 'RW' && locale.currency === 'rwf' ? 'Rwanda launch settings' : 'set for this business'} and are read-only here to protect existing transaction amounts. A reviewed conversion workflow is required before changing currency.</Text>
          <Text style={styles.locale}>{locale?.country ?? '—'} · {locale?.currency?.toUpperCase() ?? '—'}</Text>
        </Card>
        <View style={styles.actions}>
          <Button label="Cancel" variant="outline" onPress={() => router.back()} />
          <Button label="Save business profile" onPress={handleSave} loading={saving} style={{ flex: 1 }} />
        </View>
      </>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background } as any,
  content: { padding: spacing.xl, gap: spacing.lg, maxWidth: 760 } as any,
  header: { marginBottom: spacing.sm },
  title: { fontSize: fontSizes.xxl, fontWeight: fontWeights.bold, color: colors.text },
  subtitle: { fontSize: fontSizes.md, color: colors.textSecondary, marginTop: spacing.xs },
  cardTitle: { fontSize: fontSizes.lg, fontWeight: fontWeights.semibold, color: colors.text, marginBottom: spacing.sm },
  help: { fontSize: fontSizes.sm, color: colors.textSecondary, marginBottom: spacing.md, lineHeight: 20 },
  label: { fontSize: fontSizes.sm, fontWeight: fontWeights.medium, color: colors.textSecondary, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 18, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  chipSelected: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText: { color: colors.textSecondary, textTransform: 'capitalize' },
  chipTextSelected: { color: colors.textInverse },
  locale: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.text },
  actions: { flexDirection: 'row', gap: spacing.md },
  error: { color: colors.danger, fontSize: fontSizes.sm },
  notice: { color: colors.success, fontSize: fontSizes.sm },
});
