import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { FileBarChart, Scale, Wallet, BookOpen, BookText, ArrowRight, BookOpenCheck } from 'lucide-react-native';
import { Header, Card } from '@/components/ui';
import { Colors, Spacing, Typography } from '@/lib/theme';

const reportCards = [
  { title: 'Income Statement', subtitle: 'What you earned vs spent', icon: 'income' as const, route: '/(tabs)/reports/income-statement' as const, color: Colors.primary[600] },
  { title: 'Balance Sheet', subtitle: 'What you own vs what you owe', icon: 'balance' as const, route: '/(tabs)/reports/balance-sheet' as const, color: Colors.secondary[600] },
  { title: 'Cash Flow', subtitle: 'Money in and money out', icon: 'cash' as const, route: '/(tabs)/reports/cash-flow' as const, color: Colors.accent[600] },
  { title: 'Trial Balance', subtitle: 'Accountant view — all accounts', icon: 'trial' as const, route: '/(tabs)/reports/trial-balance' as const, color: Colors.neutral[600] },
  { title: 'General Journal', subtitle: 'All journal entries', icon: 'journal' as const, route: '/(tabs)/reports/journal' as const, color: Colors.neutral[600] },
];

function ReportIcon({ name, color }: { name: string; color: string }) {
  const size = 24;
  const sw = 2;
  switch (name) {
    case 'income': return <FileBarChart size={size} color={color} strokeWidth={sw} />;
    case 'balance': return <Scale size={size} color={color} strokeWidth={sw} />;
    case 'cash': return <Wallet size={size} color={color} strokeWidth={sw} />;
    case 'trial': return <BookText size={size} color={color} strokeWidth={sw} />;
    case 'journal': return <BookOpen size={size} color={color} strokeWidth={sw} />;
    default: return <FileBarChart size={size} color={color} strokeWidth={sw} />;
  }
}

export default function ReportsHome() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Header title="Reports" subtitle="Understand your business at a glance" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.accountantNote}>
          <BookOpenCheck size={18} color={Colors.primary[600]} strokeWidth={2} />
          <Text style={styles.accountantText}>
            Income Statement, Balance Sheet, and Cash Flow use plain language. Trial Balance and General Journal are for your accountant.
          </Text>
        </View>

        {reportCards.map((r) => (
          <TouchableOpacity key={r.title} onPress={() => router.push(r.route)}>
            <Card padding="md" style={styles.reportCard}>
              <View style={[styles.reportIcon, { backgroundColor: `${r.color}15` }]}>
                <ReportIcon name={r.icon} color={r.color} />
              </View>
              <View style={styles.reportInfo}>
                <Text style={styles.reportTitle}>{r.title}</Text>
                <Text style={styles.reportSub}>{r.subtitle}</Text>
              </View>
              <ArrowRight size={20} color={Colors.neutral[300]} strokeWidth={2} />
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  accountantNote: { flexDirection: 'row', gap: Spacing.sm, backgroundColor: Colors.primary[50], borderRadius: 12, padding: Spacing.md, marginBottom: Spacing.lg, alignItems: 'flex-start' },
  accountantText: { flex: 1, fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[600], lineHeight: Typography.sizes.sm * 1.5 },
  reportCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  reportIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  reportInfo: { flex: 1 },
  reportTitle: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.md, color: Colors.neutral[900] },
  reportSub: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[500], marginTop: 2 },
});
