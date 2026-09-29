import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Mail } from 'lucide-react-native';
import { Button, Input } from '@/components/ui';
import { Colors, Spacing, Radius, Typography, Shadows } from '@/lib/theme';
import * as authApi from '@/api/auth';

export default function SignUpScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    password: '',
    business_name: '',
    industry: 'retail',
    business_size: 'small' as 'micro' | 'small' | 'medium',
    country: 'United States',
    currency: 'USD',
  });

  const industries = [
    { label: 'Retail / Supermarket', value: 'retail' },
    { label: 'Services', value: 'services' },
    { label: 'Restaurant / Food', value: 'restaurant' },
    { label: 'Wholesale / Distribution', value: 'wholesale' },
    { label: 'Manufacturing', value: 'manufacturing' },
    { label: 'Other', value: 'other' },
  ];
  const sizes = [
    { label: '1-5 employees', value: 'micro' },
    { label: '6-50 employees', value: 'small' },
    { label: '51-200 employees', value: 'medium' },
  ];
  const currencies = [
    { label: '$ USD', value: 'USD' },
    { label: '€ EUR', value: 'EUR' },
    { label: '£ GBP', value: 'GBP' },
    { label: '₦ NGN', value: 'NGN' },
    { label: 'KSh KES', value: 'KES' },
    { label: '₵ GHS', value: 'GHS' },
  ];

  const handleSubmit = async () => {
    if (!form.full_name || !form.email || !form.password || !form.business_name) {
      setError('Please fill in all required fields');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authApi.signUp(form);
      router.push('/(auth)/email-confirm');
    } catch {
      setError('Could not create your account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <View style={styles.backRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={Colors.neutral[700]} strokeWidth={2} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.subtitle}>Start managing your business in minutes</Text>

      <View style={styles.form}>
        <Input label="Full Name" value={form.full_name} onChangeText={(v) => setForm({ ...form, full_name: v })} placeholder="Amara Johnson" />
        <Input label="Phone Number" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} placeholder="+1 555-0100" keyboardType="phone-pad" />
        <Input label="Email" value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} placeholder="you@business.com" keyboardType="email-address" autoCapitalize="none" />
        <Input label="Password" value={form.password} onChangeText={(v) => setForm({ ...form, password: v })} placeholder="Create a password" secureTextEntry />
        <Input label="Business Name" value={form.business_name} onChangeText={(v) => setForm({ ...form, business_name: v })} placeholder="Sunrise Supermarket" />

        <Text style={styles.fieldLabel}>Industry</Text>
        <View style={styles.chipRow}>
          {industries.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => setForm({ ...form, industry: opt.value })}
              style={[styles.chip, form.industry === opt.value && styles.chipActive]}
            >
              <Text style={[styles.chipText, form.industry === opt.value && styles.chipTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Business Size</Text>
        <View style={styles.chipRow}>
          {sizes.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => setForm({ ...form, business_size: opt.value as 'micro' | 'small' | 'medium' })}
              style={[styles.chip, form.business_size === opt.value && styles.chipActive]}
            >
              <Text style={[styles.chipText, form.business_size === opt.value && styles.chipTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Currency</Text>
        <View style={styles.chipRow}>
          {currencies.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => setForm({ ...form, currency: opt.value })}
              style={[styles.chip, form.currency === opt.value && styles.chipActive]}
            >
              <Text style={[styles.chipText, form.currency === opt.value && styles.chipTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Button label="Create Account" onPress={handleSubmit} loading={loading} size="lg" style={styles.submitBtn} />

        <View style={styles.signInRow}>
          <Text style={styles.signInText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/sign-in')}>
            <Text style={styles.signInLink}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.neutral[0] },
  scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  backRow: { marginBottom: Spacing.md },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  backText: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.md, color: Colors.neutral[700] },
  title: { fontFamily: Typography.fontFamilyBold, fontSize: Typography.sizes.xxl, color: Colors.neutral[900] },
  subtitle: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.md, color: Colors.neutral[500], marginTop: 4, marginBottom: Spacing.xl },
  form: { gap: 0 },
  fieldLabel: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.sm, color: Colors.neutral[700], marginTop: Spacing.md, marginBottom: Spacing.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.neutral[300], backgroundColor: Colors.neutral[0] },
  chipActive: { borderColor: Colors.primary[500], backgroundColor: Colors.primary[50] },
  chipText: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.sm, color: Colors.neutral[600] },
  chipTextActive: { color: Colors.primary[700] },
  errorText: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.error[600], marginTop: Spacing.md },
  submitBtn: { marginTop: Spacing.xl },
  signInRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.lg },
  signInText: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[500] },
  signInLink: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.sm, color: Colors.primary[600] },
});
