import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ShieldCheck, CreditCard, Check } from 'lucide-react-native';
import { Button } from '@/components/ui';
import { Colors, Spacing, Radius, Typography, Shadows } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';
import * as billingApi from '@/api/billing';

export default function TrialScreen() {
  const router = useRouter();
  const { setPaymentCompleted } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleStartTrial = async () => {
    setLoading(true);
    try {
      // In real implementation, this redirects to Stripe Checkout
      // and returns here after payment method is saved
      await billingApi.startTrial();
      setPaymentCompleted();
      router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    'Full access to all features for 3 days',
    'No charge until day 3',
    'Cancel anytime before trial ends',
    'All your data is saved even if you cancel',
  ];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.iconWrap}>
        <ShieldCheck size={48} color={Colors.primary[600]} strokeWidth={1.5} />
      </View>

      <Text style={styles.title}>3 Days Free</Text>
      <Text style={styles.subtitle}>
        Add a payment method to start your free trial. You won't be charged until day 3, and you can cancel anytime.
      </Text>

      <View style={styles.card}>
        {features.map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <View style={styles.checkWrap}>
              <Check size={16} color={Colors.success[600]} strokeWidth={2.5} />
            </View>
            <Text style={styles.featureText}>{f}</Text>
          </View>
        ))}
      </View>

      <View style={styles.planCard}>
        <View style={styles.planHeader}>
          <Text style={styles.planName}>Growth Plan</Text>
          <Text style={styles.planPrice}>$49<Text style={styles.planInterval}>/mo</Text></Text>
        </View>
        <Text style={styles.planDesc}>Unlimited transactions, 5 users, all reports, AI Assistant</Text>
      </View>

      <Button
        label="Add Payment Method & Start Trial"
        onPress={handleStartTrial}
        loading={loading}
        size="lg"
        icon={<CreditCard size={20} color={Colors.neutral[0]} strokeWidth={2} />}
        style={styles.cta}
      />

      <Text style={styles.finePrint}>
        After your 3-day trial, you'll be charged $49/month. Cancel anytime from Settings. Your data stays yours.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.neutral[0] },
  content: { padding: Spacing.xl, paddingBottom: Spacing.xxl },
  iconWrap: { width: 96, height: 96, borderRadius: Radius.xl, backgroundColor: Colors.primary[50], alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: Spacing.xl },
  title: { fontFamily: Typography.fontFamilyBold, fontSize: Typography.sizes.xxxl, color: Colors.neutral[900], textAlign: 'center' },
  subtitle: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.md, color: Colors.neutral[500], textAlign: 'center', lineHeight: Typography.sizes.md * Typography.lineHeights.body, marginTop: Spacing.sm, marginBottom: Spacing.xl, maxWidth: 340, alignSelf: 'center' },
  card: { backgroundColor: Colors.neutral[50], borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.lg, gap: Spacing.md },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  checkWrap: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.success[50], alignItems: 'center', justifyContent: 'center' },
  featureText: { flex: 1, fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.md, color: Colors.neutral[700] },
  planCard: { backgroundColor: Colors.primary[50], borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.xl, borderWidth: 1, borderColor: Colors.primary[200] },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  planName: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.lg, color: Colors.primary[700] },
  planPrice: { fontFamily: Typography.fontFamilyBold, fontSize: Typography.sizes.xl, color: Colors.neutral[900] },
  planInterval: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[500] },
  planDesc: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[600], marginTop: 4 },
  cta: { marginBottom: Spacing.md },
  finePrint: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.xs, color: Colors.neutral[400], textAlign: 'center', lineHeight: Typography.sizes.xs * 1.5 },
});
