import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Input } from '@/components/ui';
import { Colors, Spacing, Radius, Typography } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';

export default function SignInScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('owner@sunrisemarket.com');
  const [password, setPassword] = useState('demo1234');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    if (!email || !password) {
      setError('Please enter your email and password');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signIn(email, password);
      router.replace('/(auth)/trial');
    } catch {
      setError('Could not sign in. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to manage your business</Text>

        <View style={styles.form}>
          <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@business.com" keyboardType="email-address" autoCapitalize="none" />
          <Input label="Password" value={password} onChangeText={setPassword} placeholder="Your password" secureTextEntry />
          {error && <Text style={styles.errorText}>{error}</Text>}
          <Button label="Sign In" onPress={handleSignIn} loading={loading} size="lg" style={styles.submitBtn} />
        </View>

        <View style={styles.signUpRow}>
          <Text style={styles.signUpText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')}>
            <Text style={styles.signUpLink}>Sign up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[0] },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.xl },
  title: { fontFamily: Typography.fontFamilyBold, fontSize: Typography.sizes.xxl, color: Colors.neutral[900] },
  subtitle: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.md, color: Colors.neutral[500], marginTop: 4, marginBottom: Spacing.xl },
  form: { gap: 0 },
  errorText: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.error[600], marginTop: Spacing.sm },
  submitBtn: { marginTop: Spacing.lg },
  signUpRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xl },
  signUpText: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[500] },
  signUpLink: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.sm, color: Colors.primary[600] },
});
