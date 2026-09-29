import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { DollarSign, ShoppingBag, Users, CheckCircle, XCircle, Package, Bell, TrendingUp } from 'lucide-react-native';
import { Header, Card, LoadingState, ErrorState, SectionHeader } from '@/components/ui';
import { SummaryCard } from '@/components/SummaryCard';
import { AttentionCard } from '@/components/AttentionCard';
import { Colors, Spacing, Typography } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';
import { useFetch } from '@/lib/useFetch';
import * as todayApi from '@/api/today';

export default function TodayScreen() {
  const router = useRouter();
  const { organization } = useAuth();
  const currency = organization?.currency ?? 'USD';
  const summary = useFetch(() => todayApi.getTodaySummary(), []);
  const attention = useFetch(() => todayApi.getAttentionFeed(), []);

  const onRefresh = () => {
    summary.refetch();
    attention.refetch();
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <View style={styles.container}>
      <Header title="Today" subtitle={today} right={<Bell size={22} color={Colors.neutral[400]} strokeWidth={2} />} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={summary.loading && attention.loading} onRefresh={onRefresh} tintColor={Colors.primary[500]} />}
      >
        {summary.loading && !summary.data ? (
          <LoadingState label="Loading today's summary..." />
        ) : summary.error ? (
          <ErrorState message={summary.error} onRetry={summary.refetch} />
        ) : summary.data ? (
          <>
            <View style={styles.cardGrid}>
              <SummaryCard
                label="Revenue"
                value={summary.data.revenue}
                currency={currency}
                icon={<DollarSign size={20} color={Colors.primary[600]} strokeWidth={2} />}
                color={Colors.primary[600]}
                trend={{ value: 2, isPositive: false }}
              />
              <SummaryCard
                label="Orders"
                value={summary.data.orders}
                isCurrency={false}
                icon={<ShoppingBag size={20} color={Colors.secondary[600]} strokeWidth={2} />}
                color={Colors.secondary[600]}
              />
            </View>
            <View style={styles.cardGrid}>
              <SummaryCard
                label="New Customers"
                value={summary.data.new_customers}
                isCurrency={false}
                icon={<Users size={20} color="#8b5cf6" strokeWidth={2} />}
                color="#8b5cf6"
              />
              <SummaryCard
                label="Low Stock"
                value={summary.data.low_stock_count}
                isCurrency={false}
                icon={<Package size={20} color={Colors.warning[600]} strokeWidth={2} />}
                color={Colors.warning[600]}
              />
            </View>
            <View style={styles.cardGrid}>
              <SummaryCard
                label="Successful Payments"
                value={summary.data.successful_payments}
                isCurrency={false}
                icon={<CheckCircle size={20} color={Colors.success[600]} strokeWidth={2} />}
                color={Colors.success[600]}
              />
              <SummaryCard
                label="Failed Payments"
                value={summary.data.failed_payments}
                isCurrency={false}
                icon={<XCircle size={20} color={Colors.error[600]} strokeWidth={2} />}
                color={Colors.error[600]}
              />
            </View>
          </>
        ) : null}

        <View style={styles.attentionSection}>
          <SectionHeader title="Attention Feed" />
          {attention.loading && !attention.data ? (
            <LoadingState label="Loading alerts..." />
          ) : attention.error ? (
            <ErrorState message={attention.error} onRetry={attention.refetch} />
          ) : attention.data && attention.data.length > 0 ? (
            attention.data.map((item) => (
              <AttentionCard
                key={item.id}
                item={item}
                onPress={() => router.push(item.action_route as never)}
              />
            ))
          ) : (
            <Card padding="lg" style={styles.allGood}>
              <View style={styles.allGoodIcon}>
                <TrendingUp size={24} color={Colors.success[600]} strokeWidth={2} />
              </View>
              <Text style={styles.allGoodTitle}>All caught up!</Text>
              <Text style={styles.allGoodMsg}>No items need your attention right now.</Text>
            </Card>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  cardGrid: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  attentionSection: { marginTop: Spacing.md },
  allGood: { alignItems: 'center', paddingVertical: Spacing.xl },
  allGoodIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.success[50], alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  allGoodTitle: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.lg, color: Colors.neutral[900] },
  allGoodMsg: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[500], marginTop: 4 },
});
