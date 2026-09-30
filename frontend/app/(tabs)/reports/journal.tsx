import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Download } from 'lucide-react-native';
import { Card, LoadingState, ErrorState, EmptyState } from '@/components/ui';
import { Colors, Spacing, Typography, formatCurrency, formatDate } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';
import { useFetch } from '@/lib/useFetch';
import * as reportsApi from '@/api/reports';

export default function JournalScreen() {
  const router = useRouter();
  const { organization } = useAuth();
  const currency = organization?.currency ?? 'USD';
  const entries = useFetch(() => reportsApi.getJournalEntries(20), []);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={Colors.neutral[700]} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>General Journal</Text>
        <TouchableOpacity style={styles.exportBtn}>
          <Download size={18} color={Colors.neutral[500]} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <View style={styles.noteWrap}>
        <Text style={styles.noteText}>All journal entries in the system. Each entry shows the double-entry bookkeeping lines (debit and credit per account).</Text>
      </View>

      {entries.loading && !entries.data ? (
        <LoadingState label="Loading journal..." />
      ) : entries.error ? (
        <ErrorState message={entries.error} onRetry={entries.refetch} />
      ) : entries.data && entries.data.length === 0 ? (
        <EmptyState title="No journal entries" message="Journal entries will appear here as you record sales, expenses, and payments." />
      ) : (
        <FlatList
          data={entries.data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card padding="md" style={styles.entryCard}>
              <View style={styles.entryHeader}>
                <View>
                  <Text style={styles.entryRef}>{item.reference}</Text>
                  <Text style={styles.entryDesc}>{item.description}</Text>
                  <Text style={styles.entryDate}>{formatDate(item.date)}</Text>
                </View>
              </View>
              <View style={styles.linesHeader}>
                <Text style={[styles.linesCol, styles.linesAccountCol]}>Account</Text>
                <Text style={[styles.linesCol, styles.linesAmountCol]}>Debit</Text>
                <Text style={[styles.linesCol, styles.linesAmountCol]}>Credit</Text>
              </View>
              {item.lines.map((line, i) => (
                <View key={i} style={styles.lineRow}>
                  <View style={styles.linesAccountCol}>
                    <Text style={linesLineAccountCode}>{line.account_code}</Text>
                    <Text style={styles.lineAccountName}>{line.account_name}</Text>
                  </View>
                  <Text style={[styles.linesAmountCol, styles.lineAmount]}>
                    {line.debit > 0 ? formatCurrency(line.debit, currency) : '—'}
                  </Text>
                  <Text style={[styles.linesAmountCol, styles.lineAmount]}>
                    {line.credit > 0 ? formatCurrency(line.credit, currency) : '—'}
                  </Text>
                </View>
              ))}
            </Card>
          )}
        />
      )}
    </View>
  );
}

const linesLineAccountCode = { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.xs, color: Colors.neutral[400] } as const;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md, backgroundColor: Colors.neutral[0], borderBottomWidth: 1, borderBottomColor: Colors.neutral[200] },
  backBtn: { padding: Spacing.xs, marginRight: Spacing.sm },
  topTitle: { flex: 1, fontFamily: Typography.fontFamilyBold, fontSize: Typography.sizes.xl, color: Colors.neutral[900] },
  exportBtn: { padding: Spacing.xs },
  noteWrap: { margin: Spacing.lg, backgroundColor: Colors.neutral[100], borderRadius: 12, padding: Spacing.md },
  noteText: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[600], lineHeight: Typography.sizes.sm * 1.5 },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  entryCard: { marginBottom: Spacing.sm },
  entryHeader: { marginBottom: Spacing.sm, paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.neutral[100] },
  entryRef: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.sm, color: Colors.neutral[900] },
  entryDesc: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[600], marginTop: 2 },
  entryDate: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.xs, color: Colors.neutral[400], marginTop: 2 },
  linesHeader: { flexDirection: 'row', paddingBottom: Spacing.xs, borderBottomWidth: 1, borderBottomColor: Colors.neutral[200] },
  linesCol: { fontFamily: Typography.fontFamilySemiBold, fontSize: 10, color: Colors.neutral[400], textTransform: 'uppercase' },
  linesAccountCol: { flex: 2 },
  linesAmountCol: { flex: 1, textAlign: 'right' },
  lineRow: { flexDirection: 'row', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.neutral[100], alignItems: 'center' },
  lineAccountName: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[700], marginTop: 2 },
  lineAmount: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[900] },
});
