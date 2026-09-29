import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Download } from 'lucide-react-native';
import { Card, LoadingState, ErrorState } from '@/components/ui';
import { ReportLineRow } from '@/components/ReportComponents';
import { Colors, Spacing, Typography, formatCurrency } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';
import { useFetch } from '@/lib/useFetch';
import * as reportsApi from '@/api/reports';

export default function BalanceSheetScreen() {
  const router = useRouter();
  const { organization } = useAuth();
  const currency = organization?.currency ?? 'USD';
  const [dateAsOf, setDateAsOf] = useState(new Date().toISOString().slice(0, 10));
  const report = useFetch(() => reportsApi.getBalanceSheet(dateAsOf), [dateAsOf]);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={Colors.neutral[700]} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Balance Sheet</Text>
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
            <Card padding="md" style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Assets</Text>
                <Text style={[styles.summaryValue, { color: Colors.success[700] }]}>{formatCurrency(report.data.total_assets, currency)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Liabilities</Text>
                <Text style={[styles.summaryValue, { color: Colors.error[700] }]}>{formatCurrency(report.data.total_liabilities, currency)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Equity</Text>
                <Text style={styles.summaryValue}>{formatCurrency(report.data.total_equity, currency)}</Text>
              </View>
            </Card>

            <Text style={styles.sectionTitle}>Assets</Text>
            <Card padding="md">
              {report.data.assets.map((line, i) => (
                <ReportLineRow key={i} line={line} currency={currency} onPress={() => router.push('/(tabs)/reports/journal')} />
              ))}
              <ReportLineRow line={{ label: 'Total Assets', amount: report.data.total_assets, is_total: true }} currency={currency} isTotal />
            </Card>

            <Text style={styles.sectionTitle}>Liabilities</Text>
            <Card padding="md">
              {report.data.liabilities.map((line, i) => (
                <ReportLineRow key={i} line={line} currency={currency} onPress={() => router.push('/(tabs)/reports/journal')} />
              ))}
              <ReportLineRow line={{ label: 'Total Liabilities', amount: report.data.total_liabilities, is_total: true }} currency={currency} isTotal />
            </Card>

            <Text style={styles.sectionTitle}>Equity</Text>
            <Card padding="md">
              {report.data.equity.map((line, i) => (
                <ReportLineRow key={i} line={line} currency={currency} onPress={() => router.push('/(tabs)/reports/journal')} />
              ))}
              <ReportLineRow line={{ label: 'Total Equity', amount: report.data.total_equity, is_total: true }} currency={currency} isTotal />
            </Card>
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
  summaryCard: { marginBottom: Spacing.lg },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  summaryLabel: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[600] },
  summaryValue: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.sm, color: Colors.neutral[900] },
  sectionTitle: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.md, color: Colors.neutral[900], marginBottom: Spacing.sm, marginTop: Spacing.md },
});
