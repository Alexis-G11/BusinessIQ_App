// Attention Feed Card — severity-colored cards with action button

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Card } from './ui';
import { Colors, Spacing, Radius, Typography, SeverityColors, SeverityLabels, relativeTime, type Severity } from '../lib/theme';
import type { AttentionItem } from '../lib/types';

interface AttentionCardProps {
  item: AttentionItem;
  onPress?: () => void;
}

export function AttentionCard({ item, onPress }: AttentionCardProps) {
  const sev = SeverityColors[item.severity as Severity];

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <Card padding="md" style={[styles.card, { borderLeftColor: sev.border, borderLeftWidth: 3 }]}>
        <View style={styles.header}>
          <View style={[styles.sevBadge, { backgroundColor: sev.bg }]}>
            <View style={[styles.sevDot, { backgroundColor: sev.dot }]} />
            <Text style={[styles.sevText, { color: sev.text }]}>{SeverityLabels[item.severity as Severity]}</Text>
          </View>
          <Text style={styles.time}>{relativeTime(item.created_at)}</Text>
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.message}>{item.message}</Text>
        <View style={styles.actionRow}>
          <Text style={[styles.actionLabel, { color: sev.text }]}>{item.action_label}</Text>
          <ChevronRight size={16} color={sev.text} strokeWidth={2} />
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  sevBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    gap: Spacing.xs,
  },
  sevDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sevText: {
    fontFamily: Typography.fontFamilySemiBold,
    fontSize: Typography.sizes.xs,
  },
  time: {
    fontFamily: Typography.fontFamilyRegular,
    fontSize: Typography.sizes.xs,
    color: Colors.neutral[400],
  },
  title: {
    fontFamily: Typography.fontFamilySemiBold,
    fontSize: Typography.sizes.md,
    color: Colors.neutral[900],
    marginBottom: Spacing.xs,
  },
  message: {
    fontFamily: Typography.fontFamilyRegular,
    fontSize: Typography.sizes.sm,
    color: Colors.neutral[600],
    lineHeight: Typography.sizes.sm * Typography.lineHeights.body,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  actionLabel: {
    fontFamily: Typography.fontFamilySemiBold,
    fontSize: Typography.sizes.sm,
  },
});
