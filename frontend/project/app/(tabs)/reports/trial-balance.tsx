import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Download } from 'lucide-react-native';
import { Card, LoadingState, ErrorState } from '@/components/ui';
import { Colors, Spacing, Typography, formatCurrency } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';
import { useFetch } from '@/lib/useFetch';
import * as reportsApi from '@/api/reports';

export default function TrialBalanceScreen() {
  const router = useRouter();
  const { organization } = useAuth();
  const currency = organization?.currency ?? 'USD';
  const [dateAsOf, setDateAsOf] = useState(new Date().toISOString().slice(0, 10));
  const report = useFetch(() => reportsApi.getTrialBalance(dateAsOf), [dateAsOf]);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={Colors.neutral[700]} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Trial Balance</Text>
        <TouchableOpacity style={styles.exportBtn}>
          <Download size={18} color={Colors.neutral[500]} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <View style={styles.dateRow}>
        <Text style={styles.dateLabel}>As of</Text>
        <TextInput style={styles.dateField} value={dateAsOf} onChangeText={setDateAsOf} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.neutral[400]} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {report.loading && !report.data ? (
          <LoadingState label="Generating report..." />
        ) : report.error ? (
          <ErrorState message={report.error} onRetry={report.refetch} />
        ) : report.data ? (
          <>
            <View style={styles.noteWrap}>
              <Text style={styles.noteText}>
                This is an accountant's view showing all accounts and their balances. Debits must equal credits.
              </Text>
            </View>

            <Card padding="md" style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={[styles.colHeader, styles.colAccount]}>Account</Text>
                <Text style={[styles.colHeader, styles.colAmount]}>Debit</Text>
                <Text style={[styles.colHeader, styles.colAmount]}>Credit</Text>
              </View>
              {report.data.lines.map((line, i) => (
                <View key={i} style={styles.tableRow}>
                  <View style={styles.colAccount}>
                    <Text style={styles.accountCode}>{line.account_code}</Text>
                    <Text style={styles.accountName}>{line.account_name}</Text>
                  </View>
                  <Text style={[styles.colAmount, styles.amountValue]}>
                    {line.debit > 0 ? formatCurrency(line.debit, currency) : '—'}
                  </Text>
                  <Text style={[styles.colAmount, styles.amountValue]}>
                    {line.credit > 0 ? formatCurrency(line.credit, currency) : '—'}
                  </Text>
                </View>
              ))}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Totals</Text>
                <Text style={[styles.colAmount, styles.totalValue]}>{formatCurrency(report.data.total_debit, currency)}</Text>
                <Text style={[styles.colAmount, styles.totalValue]}>{formatCurrency(report.data.total_credit, currency)}</Text>
              </View>
            </Card>

            <View style={styles.balanceCheck}>
              <Text style={styles.balanceCheckText}>
                {report.data.total_debit === report.data.total_credit
                  ? '✓ Balanced — Debits equal Credits'
                  : '✗ Out of balance — check your entries'}
              </Text>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md, backgroundColor: Colors.neutral[0], borderBottomWidth: 1, borderBottomColor: Colors.neutral[200] },
  backBtn: { padding: Spacing.xs, marginRight: Spacing.sm },
  topTitle: { flex: 1, fontFamily: Typography.fontFamilyBold, fontSize: Typography.sizes.xl, color: Colors.neutral[900] },
  exportBtn: { padding: Spacing.xs },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.neutral[0], borderBottomWidth: 1, borderBottomColor: Colors.neutral[200] },
  dateLabel: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.sm, color: Colors.neutral[500] },
  dateField: { flex: 1, borderWidth: 1, borderColor: Colors.neutral[300], borderRadius: 8, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[900] },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  noteWrap: { backgroundColor: Colors.neutral[100], borderRadius: 12, padding: Spacing.md, marginBottom: Spacing.lg },
  noteText: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[600], lineHeight: Typography.sizes.sm * 1.5 },
  tableCard: { overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', paddingBottom: Spacing.sm, borderBottomWidth: 2, borderBottomColor: Colors.neutral[300] },
  colHeader: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.xs, color: Colors.neutral[500], textTransform: 'uppercase' },
  colAccount: { flex: 2 },
  colAmount: { flex: 1, textAlign: 'right' },
  tableRow: { flexDirection: 'row', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.neutral[100], alignItems: 'center' },
  accountCode: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.xs, color: Colors.neutral[400] },
  accountName: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[900], marginTop: 2 },
  amountValue: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[900] },
  totalRow: { flexDirection: 'row', paddingVertical: Spacing.md, borderTopWidth: 2, borderTopColor: Colors.neutral[300], alignItems: 'center' },
  totalLabel: { flex: 2, fontFamily: Typography.fontFamilyBold, fontSize: Typography.sizes.md, color: Colors.neutral[900] },
  totalValue: { fontFamily: Typography.fontFamilyBold, fontSize: Typography.sizes.md, color: Colors.neutral[900] },
  balanceCheck: { marginTop: Spacing.md, alignItems: 'center' },
  balanceCheckText: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.sm, color: Colors.success[600] },
});
