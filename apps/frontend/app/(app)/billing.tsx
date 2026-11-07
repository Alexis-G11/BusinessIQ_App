import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useBusiness } from '@/context/BusinessContext';
import { subscriptionApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { colors, spacing, fontSizes, fontWeights, radius } from '@/theme';
import { CreditCard, Check, Clock, Lock, Sparkles, AlertTriangle } from 'lucide-react-native';

interface SubStatus {
  plan: string | null;
  status: string;
  trial_ends_at: string | null;
  daysRemaining: number;
  isTrialActive: boolean;
  hasAccess: boolean;
}

export default function BillingScreen() {
  const router = useRouter();
  const { currentBusiness } = useBusiness();
  const [status, setStatus] = useState<SubStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchStatus = useCallback(async (): Promise<SubStatus | null> => {
    if (!currentBusiness) return null;
    return subscriptionApi.getStatus(currentBusiness.id);
  }, [currentBusiness]);

  useEffect(() => {
    let active = true;
    void fetchStatus()
      .then((result) => {
        if (active && result) {
          setStatus(result);
          setLoadError(null);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(error instanceof Error ? error.message : 'Could not load subscription status.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [fetchStatus]);

  const handlePay = async () => {
    if (!currentBusiness) return;
    setPaying(true);
    try {
      await subscriptionApi.pay(currentBusiness.id);
      const result = await fetchStatus();
      if (result) {
        setStatus(result);
        setLoadError(null);
      }
    } catch (error) {
      Alert.alert('Billing unavailable', error instanceof Error ? error.message : 'Online billing is not available yet.');
      setLoadError(error instanceof Error ? error.message : 'Could not load subscription status.');
    } finally {
      setPaying(false);
    }
  };

  if (loading || !status) {
    return <View style={styles.center}><Text style={styles.muted}>{loadError ?? 'Loading...'}</Text></View>;
  }

  const trialActive = status.isTrialActive;
  const expired = !status.hasAccess;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Free Testing Access</Text>
        <Text style={styles.pageSubtitle}>No subscription or payment is required during testing.</Text>
      </View>

      {/* Status banner */}
      {trialActive && (
        <View style={styles.trialBanner}>
          <Clock size={24} color={colors.blue} />
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>Free Trial Active</Text>
            <Text style={styles.bannerSub}>
              {status.daysRemaining} day{status.daysRemaining !== 1 ? 's' : ''} remaining
            </Text>
          </View>
          <Badge label="Trial" tone="blue" />
        </View>
      )}

      {expired && (
        <View style={styles.expiredBanner}>
          <AlertTriangle size={24} color={colors.danger} />
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitleDanger}>Trial Expired</Text>
            <Text style={styles.bannerSubDanger}>
              Subscribe now to restore full access to all features
            </Text>
          </View>
        </View>
      )}

      {!trialActive && !expired && (
        <View style={styles.activeBanner}>
          <Check size={24} color={colors.success} />
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>Free Access Enabled</Text>
            <Text style={styles.bannerSub}>All features are available during testing.</Text>
          </View>
          <Badge label="Free" tone="success" />
        </View>
      )}

      {/* Plan card */}
      <Card style={styles.planCard}>
        <View style={styles.planHeader}>
          <View style={styles.planIconWrap}>
            <Sparkles size={28} color={colors.blue} />
          </View>
          <View style={styles.planHeaderText}>
            <Text style={styles.planName}>BusinessIQ Testing</Text>
            <Text style={styles.planDesc}>Full access to all BusinessIQ features</Text>
          </View>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.priceAmount}>$0</Text>
          <Text style={styles.pricePer}>during testing</Text>
        </View>

        <View style={styles.features}>
          {[
            'Unlimited products, sales & invoices',
            'AI business assistant',
            'Advanced analytics & reports',
            'Inventory management with barcode scanning',
            'Team collaboration (up to 50 members)',
            'Priority email support',
          ].map((feature, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.checkIcon}>
                <Check size={14} color={colors.success} />
              </View>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* CTA */}
      {expired ? (
        <Card style={styles.paywallCard}>
          <Lock size={32} color={colors.danger} />
          <Text style={styles.paywallTitle}>Access Locked</Text>
          <Text style={styles.paywallText}>
            Your free trial has ended. Subscribe for $20/month to continue using all BusinessIQ features. You won&apos;t be able to create sales, add products, or access reports until you subscribe.
          </Text>
          <Button label="Subscribe Now — $20/month" onPress={handlePay} loading={paying} fullWidth size="lg" leftIcon={<CreditCard size={20} color={colors.textInverse} />} />
          <TouchableOpacity onPress={() => router.back()} style={styles.laterBtn}>
            <Text style={styles.laterText}>Maybe later</Text>
          </TouchableOpacity>
        </Card>
      ) : trialActive ? (
        <Card style={styles.subscribeCard}>
          <Text style={styles.subscribeTitle}>Ready to subscribe?</Text>
          <Text style={styles.subscribeText}>
            Don&apos;t wait until your trial ends — subscribe now to keep your business running smoothly.
          </Text>
          <Button label="Subscribe Now — $20/month" onPress={handlePay} loading={paying} fullWidth size="lg" leftIcon={<CreditCard size={20} color={colors.textInverse} />} />
        </Card>
      ) : (
        <Card style={styles.activeCard}>
          <View style={styles.activeRow}>
            <Check size={20} color={colors.success} />
            <Text style={styles.activeText}>No payment is due. BusinessIQ features remain available while testing.</Text>
          </View>
        </Card>
      )}

      {/* Billing history placeholder */}
      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Billing History</Text>
        <Card padding="md">
          {expired ? (
            <Text style={styles.historyEmpty}>No payments yet — subscribe to get started.</Text>
          ) : (
            <View style={styles.historyRow}>
              <View style={styles.historyLeft}>
                <CreditCard size={18} color={colors.textSecondary} />
                <View>
                  <Text style={styles.historyLabel}>No payments required</Text>
                  <Text style={styles.historyDate}>Free testing access</Text>
                </View>
              </View>
              <Text style={styles.historyAmount}>$0.00</Text>
            </View>
          )}
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background } as any,
  content: { padding: spacing.xl, gap: spacing.lg, maxWidth: 640, alignSelf: 'center' as any } as any,
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' } as any,
  muted: { color: colors.textSecondary, fontSize: fontSizes.md } as any,
  header: { marginBottom: spacing.sm } as any,
  pageTitle: { fontSize: fontSizes.xxl, fontWeight: fontWeights.bold, color: colors.text } as any,
  pageSubtitle: { fontSize: fontSizes.md, color: colors.textSecondary, marginTop: 4 } as any,

  trialBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.infoBg, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: '#BFD7F5',
  } as any,
  bannerText: { flex: 1 } as any,
  bannerTitle: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.deepBlue } as any,
  bannerSub: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2 } as any,

  expiredBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.dangerBg, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: '#F0C0C2',
  } as any,
  bannerTitleDanger: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.danger } as any,
  bannerSubDanger: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2 } as any,

  activeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.successBg, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: '#C8E6D6',
  } as any,

  planCard: { padding: spacing.xl } as any,
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg } as any,
  planIconWrap: { width: 56, height: 56, borderRadius: radius.lg, backgroundColor: '#E0EAFB', alignItems: 'center', justifyContent: 'center' } as any,
  planHeaderText: { flex: 1 } as any,
  planName: { fontSize: fontSizes.xl, fontWeight: fontWeights.bold, color: colors.text } as any,
  planDesc: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2 } as any,

  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: spacing.lg } as any,
  priceAmount: { fontSize: fontSizes.xxxl, fontWeight: fontWeights.bold, color: colors.navy } as any,
  pricePer: { fontSize: fontSizes.md, color: colors.textSecondary } as any,

  features: { gap: spacing.md } as any,
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm } as any,
  checkIcon: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.successBg, alignItems: 'center', justifyContent: 'center' } as any,
  featureText: { fontSize: fontSizes.sm, color: colors.text, flex: 1 } as any,

  paywallCard: { alignItems: 'center', gap: spacing.md, padding: spacing.xl, borderColor: colors.danger, borderWidth: 2 } as any,
  paywallTitle: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold, color: colors.danger } as any,
  paywallText: { fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 } as any,

  subscribeCard: { gap: spacing.md, padding: spacing.xl } as any,
  subscribeTitle: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold, color: colors.text } as any,
  subscribeText: { fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 22 } as any,

  activeCard: { padding: spacing.lg } as any,
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md } as any,
  activeText: { fontSize: fontSizes.sm, color: colors.success, flex: 1 } as any,

  laterBtn: { alignSelf: 'center', paddingVertical: spacing.md } as any,
  laterText: { fontSize: fontSizes.sm, color: colors.textSecondary } as any,

  historySection: { marginTop: spacing.sm } as any,
  sectionTitle: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm } as any,
  historyEmpty: { fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.md } as any,
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm } as any,
  historyLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md } as any,
  historyLabel: { fontSize: fontSizes.sm, fontWeight: fontWeights.medium, color: colors.text } as any,
  historyDate: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: 2 } as any,
  historyAmount: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.text } as any,
});
