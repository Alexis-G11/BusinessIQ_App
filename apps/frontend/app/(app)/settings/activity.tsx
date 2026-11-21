import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useBusiness } from '@/context/BusinessContext';
import { backendAuditApi, type BackendAuditEvent } from '@/lib/backend';
import { Card } from '@/components/ui/Card';
import { colors, fontSizes, fontWeights, spacing } from '@/theme';

export default function BusinessActivityScreen() {
  const { currentBusiness, currentRole } = useBusiness();
  const canView = currentRole === 'owner' || currentRole === 'admin';
  const [events, setEvents] = useState<BackendAuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!currentBusiness || !canView) return;
    setLoading(true);
    setError(null);
    try {
      setEvents(await backendAuditApi.listEvents(currentBusiness.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load business activity.');
    } finally {
      setLoading(false);
    }
  }, [currentBusiness?.id, canView]);

  useEffect(() => { void load(); }, [load]);

  if (!canView) {
    return <View style={styles.container}><Card><Text style={styles.title}>Business activity</Text><Text style={styles.help}>Only the business owner or an administrator can view the audit history.</Text></Card></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View><Text style={styles.title}>Business activity</Text><Text style={styles.subtitle}>{currentBusiness?.name ?? 'Business workspace'}</Text></View>
        <TouchableOpacity accessibilityRole="button" onPress={() => void load()}><Text style={styles.refresh}>Refresh</Text></TouchableOpacity>
      </View>
      <Card>
        <Text style={styles.help}>Audit history starts when event recording is enabled. The list shows up to 50 recent events.</Text>
        {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        {loading ? <Text style={styles.help}>Loading activity…</Text> : events.length === 0 ? <Text style={styles.help}>No recorded business activity yet.</Text> : events.map((event) => {
          const fields = Array.isArray(event.details.changed_fields)
            ? event.details.changed_fields.filter((field): field is string => typeof field === 'string')
            : [];
          return (
            <View key={event.id} style={styles.event}>
              <Text style={styles.eventTitle}>{event.action.replaceAll('.', ' ')}</Text>
              <Text style={styles.help}>{event.actor_name} · {new Date(event.occurred_at).toLocaleString()}</Text>
              {fields.length > 0 && <Text style={styles.details}>Changed: {fields.map((field) => field.replaceAll('_', ' ')).join(', ')}</Text>}
            </View>
          );
        })}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background } as any,
  content: { padding: spacing.xl, gap: spacing.lg, maxWidth: 760 } as any,
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: fontSizes.xxl, fontWeight: fontWeights.bold, color: colors.text },
  subtitle: { fontSize: fontSizes.md, color: colors.textSecondary, marginTop: spacing.xs },
  refresh: { color: colors.blue, fontWeight: fontWeights.semibold },
  help: { fontSize: fontSizes.sm, color: colors.textSecondary, marginBottom: spacing.md, lineHeight: 20 },
  event: { borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: spacing.md },
  eventTitle: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.text, textTransform: 'capitalize' },
  details: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: spacing.xs, textTransform: 'capitalize' },
  error: { color: colors.danger, fontSize: fontSizes.sm },
});
