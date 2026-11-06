import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, spacing, fontSizes, fontWeights } from '@/theme';

export default function VerifyPhoneScreen() {
  const router = useRouter();
  const { session, profile, loading: authLoading, phoneVerificationRequired, refreshProfile, signOut } = useAuth();
  const [phoneInput, setPhoneInput] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !session) router.replace('/sign-in');
    if (!authLoading && session && !phoneVerificationRequired) router.replace('/(app)');
  }, [authLoading, session, phoneVerificationRequired, router]);

  const phone = phoneInput ?? profile?.phone ?? '';
  const normalizedPhone = phone.replace(/[\s().-]/g, '');

  const sendCode = async () => {
    setError(null);
    if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) {
      setError('Enter your phone number in international format, including the + and country code.');
      return;
    }

    setSending(true);
    try {
      await authApi.sendPhoneVerification(normalizedPhone);
      setCodeSent(true);
    } catch (sendError) {
      setError(sendError instanceof Error
        ? sendError.message
        : 'Could not send a verification code. Check that SMS phone authentication is enabled.');
    } finally {
      setSending(false);
    }
  };

  const verifyCode = async () => {
    setError(null);
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Enter the 6-digit code sent to your phone.');
      return;
    }

    setVerifying(true);
    try {
      await authApi.verifyPhoneCode(normalizedPhone, code.trim());
      await authApi.completePhoneVerification(normalizedPhone);
      await refreshProfile();
      router.replace('/(app)');
    } catch (verifyError) {
      setError(verifyError instanceof Error
        ? verifyError.message
        : 'Could not verify the code. Check the code and try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/sign-in');
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : 'Could not sign out.');
    }
  };

  if (authLoading || !session) {
    return <View style={styles.center}><Text style={styles.subtitle}>Loading account...</Text></View>;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'web' ? undefined : 'padding'}
    >
      <View style={styles.form}>
        <Text style={styles.brand}>BusinessIQ</Text>
        <Text style={styles.title}>Verify your phone</Text>
        <Text style={styles.subtitle}>
          Confirm your phone number before using business features. Your 7-day trial starts after verification.
        </Text>

        {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

        <Input
          label="Phone number"
          value={phone}
          onChangeText={setPhoneInput}
          placeholder="+1 555 000 1234"
          keyboardType="phone-pad"
          editable={!verifying}
          hint="Use international format, including your country code."
        />
        {codeSent && (
          <Input
            label="SMS verification code"
            value={code}
            onChangeText={setCode}
            placeholder="6-digit code"
            keyboardType="numeric"
          />
        )}

        {codeSent ? (
          <>
            <Button label="Verify phone" onPress={verifyCode} loading={verifying} fullWidth size="lg" />
            <Button label="Send a new code" onPress={sendCode} loading={sending} variant="outline" fullWidth />
          </>
        ) : (
          <Button label="Send verification code" onPress={sendCode} loading={sending} fullWidth size="lg" />
        )}
        <Text style={styles.signOut} onPress={() => void handleSignOut()}>
          Sign out
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', backgroundColor: colors.background, padding: spacing.xl } as any,
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background } as any,
  form: { width: '100%', maxWidth: 420, alignSelf: 'center' } as any,
  brand: { color: colors.navy, fontSize: fontSizes.lg, fontWeight: fontWeights.bold, marginBottom: spacing.xl } as any,
  title: { color: colors.text, fontSize: fontSizes.xxl, fontWeight: fontWeights.bold, marginBottom: spacing.xs } as any,
  subtitle: { color: colors.textSecondary, fontSize: fontSizes.md, lineHeight: 22, marginBottom: spacing.lg } as any,
  errorBox: { backgroundColor: colors.dangerBg, borderRadius: 8, padding: spacing.md, marginBottom: spacing.md } as any,
  errorText: { color: colors.danger, fontSize: fontSizes.sm } as any,
  signOut: { color: colors.blue, fontSize: fontSizes.sm, textAlign: 'center', marginTop: spacing.lg } as any,
});
