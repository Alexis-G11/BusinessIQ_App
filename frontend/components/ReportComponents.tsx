// Shared report components: ReportLineRow, ReportSection, ReportTotal

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Colors, Spacing, Typography, formatCurrency } from '@/lib/theme';
import type { ReportLine } from '@/lib/types';

interface ReportLineRowProps {
  line: ReportLine;
  currency: string;
  isSubtotal?: boolean;
  isTotal?: boolean;
  indent?: number;
  onPress?: () => void;
}

export function ReportLineRow({ line, currency, isSubtotal, isTotal, indent = 0, onPress }: ReportLineRowProps) {
  const isDrillable = !!onPress;
  const content = (
    <View style={[styles.row, isTotal && styles.rowTotal, isSubtotal && styles.rowSubtotal]}>
      <View style={[styles.labelWrap, { paddingLeft: indent * Spacing.md }]}>
        {isDrillable && <ChevronRight size={14} color={Colors.neutral[400]} strokeWidth={2} />}
        <Text
          style={[
            styles.label,
            isTotal && styles.labelTotal,
            isSubtotal && styles.labelSubtotal,
            isDrillable && styles.labelDrillable,
          ]}
          numberOfLines={2}
        >
          {line.label}
        </Text>
      </View>
      <Text
        style={[
          styles.amount,
          isTotal && styles.amountTotal,
          isSubtotal && styles.amountSubtotal,
          line.amount < 0 && styles.amountNegative,
        ]}
      >
        {formatCurrency(line.amount, currency)}
      </Text>
    </View>
  );

  if (isDrillable) {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{content}</TouchableOpacity>;
  }
  return content;
}

interface ReportSectionProps {
  title: string;
  lines: ReportLine[];
  currency: string;
  totalLabel: string;
  totalAmount: number;
  onLinePress?: (line: ReportLine) => void;
}

export function ReportSection({ title, lines, currency, totalLabel, totalAmount, onLinePress }: ReportSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {lines.map((line, i) => (
        <ReportLineRow key={i} line={line} currency={currency} onPress={onLinePress ? () => onLinePress(line) : undefined} />
      ))}
      <View style={styles.subtotalRow}>
        <Text style={styles.subtotalLabel}>{totalLabel}</Text>
        <Text style={styles.subtotalAmount}>{formatCurrency(totalAmount, currency)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: Spacing.lg },
  sectionTitle: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.md, color: Colors.neutral[900], marginBottom: Spacing.xs, paddingBottom: Spacing.xs, borderBottomWidth: 1, borderBottomColor: Colors.neutral[200] },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.neutral[100] },
  rowTotal: { paddingVertical: Spacing.md, borderTopWidth: 2, borderTopColor: Colors.neutral[300], marginTop: Spacing.xs },
  rowSubtotal: { paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.neutral[200], marginTop: Spacing.xs },
  labelWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  label: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[700] },
  labelDrillable: { color: Colors.primary[700] },
  labelSubtotal: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.sm, color: Colors.neutral[800] },
  labelTotal: { fontFamily: Typography.fontFamilyBold, fontSize: Typography.sizes.md, color: Colors.neutral[900] },
  amount: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[900], textAlign: 'right' },
  amountNegative: { color: Colors.error[600] },
  amountSubtotal: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.sm, color: Colors.neutral[800] },
  amountTotal: { fontFamily: Typography.fontFamilyBold, fontSize: Typography.sizes.md, color: Colors.neutral[900] },
  subtotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.neutral[200] },
  subtotalLabel: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.sm, color: Colors.neutral[600] },
  subtotalAmount: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.sm, color: Colors.neutral[900] },
});
