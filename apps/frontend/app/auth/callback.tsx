import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { colors, spacing, fontSizes, fontWeights } from '@/theme';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { session, loading, phoneVerificationRequired, authError } = useAuth();
  const [linkError, setLinkError] = useState<string | null>(null);
  const callbackError = useMemo(() => {
    if (Platform.OS !== 'web') return null;
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const query = new URLSearchParams(window.location.search);
    const errorCode = hash.get('error_code') ?? query.get('error_code');
    if (!errorCode) return null;
    return errorCode === 'otp_expired'
      ? 'This confirmation link has expired. Return to sign-up and request a fresh confirmation email.'
      : 'This confirmation link is invalid or could not be completed.';
  }, []);
  const visibleError = linkError ?? callbackError;

  useEffect(() => {
    if (!loading && session && !visibleError && !authError) {
      router.replace(phoneVerificationRequired ? '/verify-phone' : '/(app)');
    }
  }, [loading, session, phoneVerificationRequired, visibleError, authError, router]);

  useEffect(() => {
    if (loading || session || visibleError || authError) return;
    const timer = setTimeout(() => {
      setLinkError('The confirmation could not be completed. Request a fresh email and try again.');
    }, 1500);
    return () => clearTimeout(timer);
  }, [loading, session, visibleError, authError]);

  const message = visibleError ?? authError;
  return (
    <View style={styles.container}>
      <Text style={styles.brand}>BusinessIQ</Text>
      <Text style={styles.title}>{message ? 'Confirmation link issue' : 'Confirming your account...'}</Text>
      <Text style={styles.subtitle}>
        {message ?? 'Please wait while we finish verifying your email.'}
      </Text>
      {message && (
        <Button label="Go to sign in" onPress={() => router.replace('/sign-in')} fullWidth size="lg" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: spacing.xl } as any,
  brand: { color: colors.navy, fontSize: fontSizes.lg, fontWeight: fontWeights.bold, marginBottom: spacing.xl } as any,
  title: { color: colors.text, fontSize: fontSizes.xxl, fontWeight: fontWeights.bold, marginBottom: spacing.xs, textAlign: 'center' } as any,
  subtitle: { color: colors.textSecondary, fontSize: fontSizes.md, lineHeight: 22, marginBottom: spacing.lg, textAlign: 'center', maxWidth: 480 } as any,
});
