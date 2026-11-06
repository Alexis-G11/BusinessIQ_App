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
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, spacing, fontSizes, fontWeights } from '@/theme';

const RECOVERY_CODE_LENGTH = 6;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await authApi.sendPasswordRecoveryCode(normalizedEmail);
      setEmail(normalizedEmail);
      setCodeSent(true);
    } catch {
      setError('We could not send recovery instructions. Check your email address and try again later.');
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async () => {
    if (!new RegExp(`^\\d{${RECOVERY_CODE_LENGTH}}$`).test(code)) {
      setError(`Enter the ${RECOVERY_CODE_LENGTH}-digit code from your email.`);
      return;
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError('Password must be at least 8 characters and contain at least one letter and one number.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await authApi.updatePasswordWithRecoveryCode(email, code, password);
      setCompleted(true);
    } catch {
      setError('The code may be invalid or expired. Request a new code and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'web' ? undefined : 'padding'}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
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
            <Text style={styles.title}>
              {completed ? 'Password updated' : codeSent ? 'Enter your recovery code' : 'Reset your password'}
            </Text>
            <Text style={styles.subtitle}>
              {completed
                ? 'Your password has been changed. Continue to your BusinessIQ account.'
                : codeSent
                  ? `If an account exists for ${email}, recovery instructions were sent. Enter the code from the email and choose a new password.`
                  : 'Enter the email address associated with your account. We will send recovery instructions if an account exists.'}
            </Text>

            {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

            {completed ? (
              <Button label="Continue to BusinessIQ" onPress={() => router.replace('/(app)')} fullWidth size="lg" />
            ) : codeSent ? (
              <>
                <Input
                  label="Recovery code"
                  value={code}
                  onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, RECOVERY_CODE_LENGTH))}
                  placeholder="6-digit code"
                  keyboardType="numeric"
                />
                <Input
                  label="New password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Minimum 8 characters"
                  secureTextEntry
                  hint="Use at least 8 characters with at least one letter and one number."
                />
                <Input
                  label="Confirm new password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter your new password"
                  secureTextEntry
                />
                <Button label="Update password" onPress={updatePassword} loading={loading} fullWidth size="lg" />
                <Text style={styles.secondaryAction} onPress={sendCode}>Resend recovery code</Text>
              </>
            ) : (
              <>
                <Input
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@business.com"
                  keyboardType="email-address"
                />
                <Button label="Send recovery code" onPress={sendCode} loading={loading} fullWidth size="lg" />
              </>
            )}

            {!completed && (
              <Text style={styles.linkText} onPress={() => router.replace('/sign-in')}>
                Back to sign in
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, flexDirection: 'row' },
  leftPanel: {
    flex: 1,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
  },
  brandWrap: { maxWidth: 360 },
  brandName: {
    fontSize: 36,
    fontWeight: fontWeights.bold,
    color: colors.textInverse,
    marginBottom: spacing.md,
  },
  brandTagline: {
    fontSize: fontSizes.lg,
    color: colors.textInverseSecondary,
    lineHeight: 28,
  },
  rightPanel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  formWrap: { width: '100%', maxWidth: 400 },
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  errorBox: {
    backgroundColor: colors.dangerBg,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSizes.sm,
  },
  secondaryAction: {
    fontSize: fontSizes.sm,
    color: colors.blue,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  linkText: {
    fontSize: fontSizes.sm,
    color: colors.blue,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
