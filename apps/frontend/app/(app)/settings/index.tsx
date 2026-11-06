import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useBusiness } from '@/context/BusinessContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { colors, spacing, fontSizes, fontWeights } from '@/theme';
import { User, Building2, Shield, Bell, CreditCard, LogOut, ChevronRight, Globe } from 'lucide-react-native';

export default function SettingsScreen() {
  const router = useRouter();
  const { profile, signOut, updateProfile } = useAuth();
  const { currentBusiness } = useBusiness();
  const [editingProfile, setEditingProfile] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile({ full_name: fullName });
      setEditingProfile(false);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/sign-in');
    } catch {
      Alert.alert('Error', 'Failed to sign out.');
    }
  };

  const sections = [
    {
      title: 'Account',
      items: [
        { icon: User, label: 'Profile', action: () => setEditingProfile(true) },
        { icon: Shield, label: 'Security', badge: 'Coming Soon' },
        { icon: Bell, label: 'Notifications', badge: 'Coming Soon' },
      ],
    },
    {
      title: 'Business',
      items: [
        { icon: Building2, label: 'Business Profile', action: () => router.push('/(app)/settings/business' as any) },
        { icon: Globe, label: 'Currency & Timezone', badge: currentBusiness?.currency ?? 'USD' },
        { icon: CreditCard, label: 'Free Testing Access', action: () => router.push('/(app)/billing' as any), badge: 'Free' },
      ],
    },
    {
      title: 'Data',
      items: [
        { icon: Shield, label: 'Data Export', badge: 'Coming Soon' },
        { icon: Shield, label: 'Connected Apps', badge: '0' },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Settings</Text>
        <Text style={styles.pageSubtitle}>Manage your account and business settings</Text>
      </View>

      {editingProfile && (
        <Card>
          <Text style={styles.cardTitle}>Edit Profile</Text>
          <Input label="Full Name" value={fullName} onChangeText={setFullName} placeholder="Your name" />
          <Input
            label="Verified phone"
            value={profile?.phone ?? ''}
            onChangeText={() => {}}
            editable={false}
            hint="Phone number changes require verification."
          />
          <View style={styles.buttonRow}>
            <Button label="Cancel" variant="outline" onPress={() => setEditingProfile(false)} />
            <Button label="Save" onPress={handleSaveProfile} loading={saving} style={{ flex: 1 }} />
          </View>
        </Card>
      )}

      {sections.map((section) => (
        <View key={section.title}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Card padding="md">
            {section.items.map((item, i) => {
              const Icon = item.icon as any;
              return (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.settingRow, i < section.items.length - 1 && styles.borderBottom]}
                  onPress={item.action}
                  disabled={!item.action}
                >
                  <Icon size={20} color={colors.textSecondary} />
                  <Text style={styles.settingLabel}>{item.label}</Text>
                  {item.badge && <Badge label={item.badge} tone={item.badge === 'Coming Soon' ? 'neutral' : 'blue'} />}
                  {item.action && <ChevronRight size={18} color={colors.textSecondary} />}
                </TouchableOpacity>
              );
            })}
          </Card>
        </View>
      ))}

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <LogOut size={20} color={colors.danger} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>BusinessIQ v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background } as any,
  content: { padding: spacing.xl, gap: spacing.lg, maxWidth: 640 } as any,
  header: { marginBottom: spacing.sm } as any,
  pageTitle: { fontSize: fontSizes.xxl, fontWeight: fontWeights.bold, color: colors.text } as any,
  pageSubtitle: { fontSize: fontSizes.md, color: colors.textSecondary, marginTop: 4 } as any,
  cardTitle: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.text, marginBottom: spacing.md } as any,
  sectionTitle: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: spacing.md, marginBottom: spacing.sm, paddingHorizontal: spacing.sm } as any,
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.sm } as any,
  borderBottom: { borderBottomWidth: 1, borderBottomColor: colors.border } as any,
  settingLabel: { flex: 1, fontSize: fontSizes.md, color: colors.text } as any,
  buttonRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md } as any,
  signOutBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, justifyContent: 'center', marginTop: spacing.md } as any,
  signOutText: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.danger } as any,
  version: { fontSize: fontSizes.xs, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.md } as any,
});
