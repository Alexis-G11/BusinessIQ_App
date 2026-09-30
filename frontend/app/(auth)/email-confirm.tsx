import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, RefreshCw } from 'lucide-react-native';
import { Button } from '@/components/ui';
import { Colors, Spacing, Radius, Typography, Shadows } from '@/lib/theme';
import * as authApi from '@/api/auth';

export default function EmailConfirmScreen() {
  const router = useRouter();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    setResending(true);
    setResent(false);
    try {
      await authApi.resendConfirmation('user@business.com');
      setResent(true);
    } finally {
      setResending(false);
    }
  };

  const handleContinue = () => {
    router.push('/(auth)/sign-in');
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Mail size={48} color={Colors.primary[600]} strokeWidth={1.5} />
      </View>
      <Text style={styles.title}>Check your email</Text>
      <Text style={styles.message}>
        We sent a confirmation link to your email address. Click the link to verify your account, then sign in.
      </Text>

      {resent && <Text style={styles.resentText}>Email sent. Check your inbox.</Text>}

      <View style={styles.actions}>
        <Button label="I've confirmed — Sign in" onPress={handleContinue} size="lg" />
        <TouchableOpacity onPress={handleResend} disabled={resending} style={styles.resendBtn}>
          <RefreshCw size={16} color={Colors.neutral[600]} strokeWidth={2} />
          <Text style={styles.resendText}>{resending ? 'Sending...' : 'Resend email'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.neutral[0], paddingHorizontal: Spacing.xl },
  iconWrap: { width: 96, height: 96, borderRadius: Radius.xl, backgroundColor: Colors.primary[50], alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
  title: { fontFamily: Typography.fontFamilyBold, fontSize: Typography.sizes.xxl, color: Colors.neutral[900], textAlign: 'center' },
  message: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.md, color: Colors.neutral[500], textAlign: 'center', marginTop: Spacing.sm, lineHeight: Typography.sizes.md * Typography.lineHeights.body, maxWidth: 320 },
  resentText: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.success[600], marginTop: Spacing.md },
  actions: { width: '100%', maxWidth: 340, marginTop: Spacing.xxl, gap: Spacing.md },
  resendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.md },
  resendText: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.sm, color: Colors.neutral[600] },
});
