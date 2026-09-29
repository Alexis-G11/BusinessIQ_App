import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Download } from 'lucide-react-native';
import { Card, LoadingState, ErrorState } from '@/components/ui';
import { ReportSection } from '@/components/ReportComponents';
import { Colors, Spacing, Typography, formatCurrency } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';
import { useFetch } from '@/lib/useFetch';
import * as reportsApi from '@/api/reports';

export default function CashFlowScreen() {
  const router = useRouter();
  const { organization } = useAuth();
  const currency = organization?.currency ?? 'USD';
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const report = useFetch(() => reportsApi.getCashFlowStatement(dateFrom, dateTo), [dateFrom, dateTo]);

  const operatingTotal = report.data?.operating.reduce((s, l) => s + l.amount, 0) ?? 0;
  const investingTotal = report.data?.investing.reduce((s, l) => s + l.amount, 0) ?? 0;
  const financingTotal = report.data?.financing.reduce((s, l) => s + l.amount, 0) ?? 0;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={Colors.neutral[700]} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Cash Flow</Text>
        <TouchableOpacity style={styles.exportBtn}>
          <Download size={18} color={Colors.neutral[500]} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <View style={styles.dateRow}>
        <View style={styles.dateInput}>
          <Text style={styles.dateLabel}>From</Text>
          <TextInput style={styles.dateField} value={dateFrom} onChangeText={setDateFrom} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.neutral[400]} />
        </View>
        <View style={styles.dateInput}>
          <Text style={styles.dateLabel}>To</Text>
          <TextInput style={styles.dateField} value={dateTo} onChangeText={setDateTo} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.neutral[400]} />
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {report.loading && !report.data ? (
          <LoadingState label="Generating report..." />
        ) : report.error ? (
          <ErrorState message={report.error} onRetry={report.refetch} />
        ) : report.data ? (
          <>
            <Card padding="md" style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Opening Balance</Text>
                <Text style={styles.summaryValue}>{formatCurrency(report.data.opening_balance, currency)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Net Cash Change</Text>
                <Text style={[styles.summaryValue, report.data.net_cash >= 0 ? { color: Colors.success[700] } : { color: Colors.error[700] }]}>
                  {report.data.net_cash >= 0 ? '▲' : '▼'} {formatCurrency(report.data.net_cash, currency)}
                </Text>
              </View>
              <View style={[styles.summaryRow, styles.closingRow]}>
                <Text style={styles.closingLabel}>Closing Balance</Text>
                <Text style={styles.closingValue}>{formatCurrency(report.data.closing_balance, currency)}</Text>
              </View>
            </Card>

            <ReportSection title="Operating Activities" lines={report.data.operating} currency={currency} totalLabel="Net Operating Cash" totalAmount={operatingTotal} onLinePress={() => router.push('/(tabs)/reports/journal')} />
            <ReportSection title="Investing Activities" lines={report.data.investing} currency={currency} totalLabel="Net Investing Cash" totalAmount={investingTotal} onLinePress={() => router.push('/(tabs)/reports/journal')} />
            <ReportSection title="Financing Activities" lines={report.data.financing} currency={currency} totalLabel="Net Financing Cash" totalAmount={financingTotal} onLinePress={() => router.push('/(tabs)/reports/journal')} />
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
  dateRow: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.neutral[0], borderBottomWidth: 1, borderBottomColor: Colors.neutral[200] },
  dateInput: { flex: 1 },
  dateLabel: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.xs, color: Colors.neutral[500], marginBottom: 4 },
  dateField: { borderWidth: 1, borderColor: Colors.neutral[300], borderRadius: 8, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[900] },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  summaryCard: { marginBottom: Spacing.lg },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  summaryLabel: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[600] },
  summaryValue: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.sm, color: Colors.neutral[900] },
  closingRow: { borderTopWidth: 2, borderTopColor: Colors.neutral[300], marginTop: Spacing.xs, paddingTop: Spacing.md },
  closingLabel: { fontFamily: Typography.fontFamilyBold, fontSize: Typography.sizes.lg, color: Colors.neutral[900] },
  closingValue: { fontFamily: Typography.fontFamilyBold, fontSize: Typography.sizes.lg, color: Colors.primary[700] },
});
