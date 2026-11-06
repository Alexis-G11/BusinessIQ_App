import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, spacing, fontSizes, fontWeights } from '@/theme';

export default function SignInScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const phoneVerificationRequired = await signIn(email.trim(), password);
      router.replace(phoneVerificationRequired ? '/verify-phone' : '/(app)');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Sign in failed.';
      setError(
        msg.includes('Invalid login credentials')
          ? 'Incorrect email or password.'
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
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to your BusinessIQ account</Text>

            {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@business.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
            />

            <Text style={styles.forgotPassword} onPress={() => router.push('/forgot-password')}>
              Forgot password?
            </Text>

            <Button label="Sign in" onPress={handleSignIn} loading={loading} fullWidth size="lg" />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <Text style={styles.linkText}>
              Don&apos;t have an account?{' '}
              <Text style={styles.link} onPress={() => router.push('/sign-up')}>
                Create one
              </Text>
            </Text>
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
  } as any,
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  } as any,
  dividerText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginHorizontal: spacing.md,
  } as any,
  linkText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  } as any,
  forgotPassword: {
    fontSize: fontSizes.sm,
    color: colors.blue,
    textAlign: 'right',
    marginBottom: spacing.md,
  } as any,
  link: {
    color: colors.blue,
    fontWeight: fontWeights.semibold,
  } as any,
});
