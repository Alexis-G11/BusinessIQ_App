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
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, spacing, fontSizes, fontWeights } from '@/theme';

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupComplete, setSignupComplete] = useState(false);

  const handleSignUp = async () => {
    setError(null);

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!businessName.trim()) {
      setError('Please enter your business name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError('Password must be at least 8 characters and contain at least one letter and one number.');
      return;
    }
    const normalizedPhone = phone.replace(/[\s().-]/g, '');
    if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) {
      setError('Enter your phone number in international format, including the + and country code.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!acceptedTerms) {
      setError('Please accept the Terms and Privacy Policy to continue.');
      return;
    }

    setLoading(true);
    try {
      await signUp(email.trim(), password, fullName.trim(), businessName.trim(), normalizedPhone);
      setSignupComplete(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Sign up failed.';
      setError(
        msg.includes('already registered')
          ? 'An account with this email already exists. Try signing in.'
          : msg
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'web' ? undefined : 'padding'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.leftPanel}>
          <View style={styles.brandWrap}>
            <Text style={styles.brandName}>BusinessIQ</Text>
            <Text style={styles.brandTagline}>
              Run your business.{'\n'}Understand your numbers.{'\n'}Make smarter decisions.
            </Text>
          </View>
        </View>

        <View style={styles.rightPanel}>
          <View style={styles.formWrap}>
            <Text style={styles.title}>{signupComplete ? 'Account created' : 'Create your account'}</Text>
            <Text style={styles.subtitle}>
              {signupComplete
                ? 'Your account is ready. Sign in to open your workspace.'
                : 'Create a free testing account. No email or phone verification and no payment are required.'}
            </Text>

            {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

            {signupComplete ? (
              <Button label="Go to sign in" onPress={() => router.replace('/sign-in')} fullWidth size="lg" />
            ) : (
              <>
            <Input
              label="Full name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Jane Smith"
              autoCapitalize="words"
            />
            <Input
              label="Business name"
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="Acme Business"
              autoCapitalize="words"
            />
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@business.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Input
              label="Phone number *"
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 555 000 1234"
              keyboardType="phone-pad"
              hint="Use international format. This is saved as account contact information; SMS verification is disabled during testing."
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Minimum 8 characters"
              secureTextEntry
              hint="Use at least 8 characters with at least one letter and one number."
            />
            <Input
              label="Confirm password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter your password"
              secureTextEntry
            />

            <TouchableOpacity
              style={styles.termsRow}
              onPress={() => setAcceptedTerms(!acceptedTerms)}
            >
              <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]} />
              <Text style={styles.termsText}>
                I agree to the Terms of Service and Privacy Policy
              </Text>
            </TouchableOpacity>

            <Button label="Create account" onPress={handleSignUp} loading={loading} fullWidth size="lg" />

            <Text style={styles.linkText}>
              Already have an account?{' '}
              <Text style={styles.link} onPress={() => router.push('/sign-in')}>
                Sign in
              </Text>
            </Text>
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background } as any,
  scrollContent: { flexGrow: 1, flexDirection: 'row' } as any,
  leftPanel: {
    flex: 1,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
  } as any,
  brandWrap: { maxWidth: 360 } as any,
  brandName: {
    fontSize: 36,
    fontWeight: fontWeights.bold,
    color: colors.textInverse,
    marginBottom: spacing.md,
  } as any,
  brandTagline: {
    fontSize: fontSizes.lg,
    color: colors.textInverseSecondary,
    lineHeight: 28,
  } as any,
  rightPanel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  } as any,
  formWrap: { width: '100%', maxWidth: 400 } as any,
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  } as any,
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  } as any,
  errorBox: {
    backgroundColor: colors.dangerBg,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  } as any,
  errorText: {
    color: colors.danger,
    fontSize: fontSizes.sm,
  } as any,
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: spacing.md,
  } as any,
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.borderDark,
    marginRight: spacing.sm,
    marginTop: 2,
  } as any,
  checkboxChecked: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  } as any,
  termsText: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  } as any,
  linkText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.lg,
  } as any,
  link: {
    color: colors.blue,
    fontWeight: fontWeights.semibold,
  } as any,
});
