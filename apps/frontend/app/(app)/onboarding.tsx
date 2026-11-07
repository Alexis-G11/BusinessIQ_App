import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useBusiness } from '@/context/BusinessContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, spacing, fontSizes, fontWeights, radius } from '@/theme';

const INDUSTRIES = [
  'Retail', 'Food & Beverage', 'Manufacturing', 'Services',
  'Technology', 'Healthcare', 'Construction', 'Agriculture',
  'Transportation', 'Other',
];

const CURRENCIES = ['RWF', 'USD', 'EUR', 'GBP', 'NGN', 'KES', 'GHS', 'ZAR', 'UGX', 'TZS', 'XOF', 'XAF', 'EGP', 'MAD', 'ETB', 'CAD', 'AUD'];
const TIMEZONES = ['Africa/Kigali', 'UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Africa/Lagos', 'Africa/Nairobi', 'Asia/Dubai'];

export default function OnboardingScreen() {
  const router = useRouter();
  const { createBusiness } = useBusiness();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    legal_name: '',
    industry: 'Retail',
    business_type: 'sole_proprietor' as const,
    country: '',
    currency: 'USD',
    timezone: 'UTC',
    address: '',
    phone: '',
    email: '',
    tax_id: '',
  });

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setError('Please enter a business name.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await createBusiness(form);
      router.replace('/(app)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create business.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'web' ? undefined : 'padding'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.formWrap}>
          <View style={styles.header}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>BI</Text>
            </View>
            <Text style={styles.title}>Set up your business</Text>
            <Text style={styles.subtitle}>
              Tell us about your business. You can change these details later.
            </Text>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Step indicator */}
          <View style={styles.stepRow}>
            <View style={[styles.stepDot, step >= 0 && styles.stepDotActive]} />
            <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
            <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
          </View>

          {step === 0 && (
            <View>
              <Input
                label="Business name *"
                value={form.name}
                onChangeText={(v) => update('name', v)}
                placeholder="e.g. Smith's Coffee Shop"
              />
              <Input
                label="Legal name (optional)"
                value={form.legal_name}
                onChangeText={(v) => update('legal_name', v)}
                placeholder="Smith Coffee LLC"
              />
              <Text style={styles.label}>Industry</Text>
              <View style={styles.chipRow}>
                {INDUSTRIES.map((ind) => (
                  <Chip
                    key={ind}
                    label={ind}
                    selected={form.industry === ind}
                    onPress={() => update('industry', ind)}
                  />
                ))}
              </View>
              <Button label="Continue" onPress={() => setStep(1)} fullWidth size="lg" />
            </View>
          )}

          {step === 1 && (
            <View>
              <Input
                label="Country code"
                value={form.country}
                onChangeText={(v) => update('country', v.toUpperCase().slice(0, 2))}
                placeholder="RW"
                autoCapitalize="characters"
                hint="Use the two-letter ISO code, such as RW or US."
              />
              <Text style={styles.label}>Currency</Text>
              <View style={styles.chipRow}>
                {CURRENCIES.map((c) => (
                  <Chip
                    key={c}
                    label={c}
                    selected={form.currency === c}
                    onPress={() => update('currency', c)}
                  />
                ))}
              </View>
              <Text style={styles.label}>Timezone</Text>
              <View style={styles.chipRow}>
                {TIMEZONES.map((tz) => (
                  <Chip
                    key={tz}
                    label={tz.replace(/_/g, ' ')}
                    selected={form.timezone === tz}
                    onPress={() => update('timezone', tz)}
                    small
                  />
                ))}
              </View>
              <View style={styles.buttonRow}>
                <Button label="Back" variant="outline" onPress={() => setStep(0)} />
                <Button label="Continue" onPress={() => setStep(2)} style={{ flex: 1 }} />
              </View>
            </View>
          )}

          {step === 2 && (
            <View>
              <Input
                label="Address"
                value={form.address}
                onChangeText={(v) => update('address', v)}
                placeholder="123 Main Street, City"
              />
              <Input
                label="Phone"
                value={form.phone}
                onChangeText={(v) => update('phone', v)}
                placeholder="+1 555 000 1234"
                keyboardType="phone-pad"
              />
              <Input
                label="Business email"
                value={form.email}
                onChangeText={(v) => update('email', v)}
                placeholder="contact@business.com"
                keyboardType="email-address"
              />
              <Input
                label="Tax ID (optional)"
                value={form.tax_id}
                onChangeText={(v) => update('tax_id', v)}
                placeholder="EIN or tax number"
              />
              <View style={styles.trialNotice}>
                <Text style={styles.trialNoticeText}>
                  Your 7-day free trial starts now. No payment required.
                </Text>
              </View>
              <View style={styles.buttonRow}>
                <Button label="Back" variant="outline" onPress={() => setStep(1)} />
                <Button
                  label="Create business"
                  onPress={handleCreate}
                  loading={loading}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Chip({
  label,
  selected,
  onPress,
  small,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  small?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.chip,
        selected && styles.chipSelected,
        small && styles.chipSmall,
      ]}
    >
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background } as any,
  scrollContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl } as any,
  formWrap: { width: '100%', maxWidth: 480 } as any,
  header: { alignItems: 'center', marginBottom: spacing.xl } as any,
  logo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  } as any,
  logoText: {
    color: colors.textInverse,
    fontWeight: fontWeights.bold,
    fontSize: fontSizes.lg,
  } as any,
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.bold,
    color: colors.text,
  } as any,
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  } as any,
  errorBox: {
    backgroundColor: colors.dangerBg,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  } as any,
  errorText: { color: colors.danger, fontSize: fontSizes.sm } as any,
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  } as any,
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  } as any,
  stepDotActive: { backgroundColor: colors.blue } as any,
  label: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  } as any,
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  } as any,
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  } as any,
  chipSelected: {
    borderColor: colors.blue,
    backgroundColor: '#E0EAFB',
  } as any,
  chipSmall: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm } as any,
  chipLabel: {
    fontSize: fontSizes.sm,
    color: colors.text,
  } as any,
  chipLabelSelected: { color: colors.blue, fontWeight: fontWeights.semibold } as any,
  trialNotice: {
    backgroundColor: colors.infoBg,
    borderRadius: 8,
    padding: spacing.md,
    marginVertical: spacing.md,
  } as any,
  trialNoticeText: {
    fontSize: fontSizes.sm,
    color: colors.info,
    fontWeight: fontWeights.medium,
  } as any,
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  } as any,
});
