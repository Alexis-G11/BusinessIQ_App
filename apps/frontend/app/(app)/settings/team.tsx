import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useBusiness } from '@/context/BusinessContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { backendMembershipApi, type AssignableBusinessRole, type BackendInvitation, type BackendMember } from '@/lib/backend';
import { colors, fontSizes, fontWeights, spacing } from '@/theme';

const ROLES: AssignableBusinessRole[] = ['manager', 'accountant', 'employee', 'inventory_staff', 'analyst'];

export default function TeamSettingsScreen() {
  const { currentBusiness, currentRole, refreshBusinesses } = useBusiness();
  const canManage = currentRole === 'owner' || currentRole === 'admin';
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AssignableBusinessRole>('employee');
  const [token, setToken] = useState('');
  const [invitation, setInvitation] = useState<{ email: string; role: string; token: string; expires_at: string } | null>(null);
  const [invitations, setInvitations] = useState<BackendInvitation[]>([]);
  const [members, setMembers] = useState<BackendMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadInvitations = useCallback(async () => {
    if (!currentBusiness || !canManage) {
      setInvitations([]);
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [nextInvitations, nextMembers] = await Promise.all([
        backendMembershipApi.listInvitations(currentBusiness.id),
        backendMembershipApi.listMembers(currentBusiness.id),
      ]);
      setInvitations(nextInvitations);
      setMembers(nextMembers);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load invitations.');
    } finally {
      setLoading(false);
    }
  }, [currentBusiness?.id, canManage]);

  useEffect(() => { void loadInvitations(); }, [loadInvitations]);

  const handleInvite = async () => {
    if (!currentBusiness) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    setInvitation(null);
    try {
      const created = await backendMembershipApi.createInvitation(currentBusiness.id, email.trim(), role);
      setInvitation(created);
      setEmail('');
      await loadInvitations();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the invitation.');
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!currentBusiness) return;
    setError(null);
    try {
      await backendMembershipApi.revokeInvitation(currentBusiness.id, id);
      await loadInvitations();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not revoke the invitation.');
    }
  };

  const handleRoleChange = async (member: BackendMember, nextRole: AssignableBusinessRole) => {
    if (!currentBusiness || member.role === nextRole) return;
    setError(null);
    try {
      const updated = await backendMembershipApi.updateMemberRole(currentBusiness.id, member.id, nextRole);
      setMembers((previous) => previous.map((item) => item.id === updated.id ? updated : item));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update this member role.');
    }
  };

  const handleRemove = (member: BackendMember) => {
    if (!currentBusiness) return;
    Alert.alert('Remove business access?', `${member.full_name} will lose access. Their membership history will be retained.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => {
        void (async () => {
          try {
            await backendMembershipApi.removeMember(currentBusiness.id, member.id);
            setMembers((previous) => previous.filter((item) => item.id !== member.id));
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not remove this member.');
          }
        })();
      } },
    ]);
  };

  const handleAccept = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const accepted = await backendMembershipApi.acceptInvitation(token.trim());
      setToken('');
      setNotice(`You joined ${accepted.organization_name} as ${accepted.role}.`);
      await refreshBusinesses();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not accept the invitation.');
    } finally {
      setSaving(false);
    }
  };

  const pendingInvitations = invitations.filter((item) => !item.accepted_at && !item.revoked_at);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Team and invitations</Text>
        <Text style={styles.subtitle}>{currentBusiness?.name ?? 'Business workspace'}</Text>
      </View>

      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {notice && <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text>}

      {canManage && currentBusiness && <Card>
        <Text style={styles.cardTitle}>Invite a member</Text>
        <Text style={styles.help}>Invitations expire after seven days. The token is shown once. Share it with the invited person; email delivery is not configured.</Text>
        <Input label="Email address" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="person@example.com" />
        <Text style={styles.label}>Business role</Text>
        <View style={styles.roles}>
          {ROLES.map((item) => (
            <TouchableOpacity key={item} accessibilityRole="button" accessibilityState={{ selected: role === item }} style={[styles.roleChip, role === item && styles.roleChipSelected]} onPress={() => setRole(item)}>
              <Text style={[styles.roleText, role === item && styles.roleTextSelected]}>{item.replace('_', ' ')}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Button label="Create invitation" onPress={handleInvite} loading={saving} disabled={!email.trim()} fullWidth />
        {invitation && <View style={styles.tokenBox}>
          <Text style={styles.tokenHeading}>Share this invitation token now</Text>
          <Text selectable style={styles.token}>{invitation.token}</Text>
          <Text style={styles.help}>For {invitation.email} · {invitation.role} · expires {new Date(invitation.expires_at).toLocaleString()}</Text>
        </View>}
      </Card>}

      {canManage && <Card>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Business members</Text>
          <TouchableOpacity onPress={() => void loadInvitations()}><Text style={styles.link}>Refresh</Text></TouchableOpacity>
        </View>
        {loading ? <Text style={styles.help}>Loading team…</Text> : members.length === 0 ? <Text style={styles.help}>There are no active members.</Text> : members.map((member) => (
          <View key={member.id} style={styles.memberRow}>
            <View style={styles.invitationInfo}>
              <Text style={styles.rowTitle}>{member.full_name}{member.is_owner ? ' · Owner' : ''}</Text>
              <Text style={styles.help}>{member.email}</Text>
              {member.is_owner ? <Text style={styles.help}>Business owner role is protected.</Text> : <View style={styles.memberRoles}>
                {ROLES.map((item) => (
                  <TouchableOpacity key={item} accessibilityRole="button" accessibilityState={{ selected: member.role === item }} style={[styles.roleChip, member.role === item && styles.roleChipSelected]} onPress={() => void handleRoleChange(member, item)}>
                    <Text style={[styles.roleText, member.role === item && styles.roleTextSelected]}>{item.replace('_', ' ')}</Text>
                  </TouchableOpacity>
                ))}
              </View>}
            </View>
            {!member.is_owner && <TouchableOpacity onPress={() => handleRemove(member)}><Text style={styles.revoke}>Remove</Text></TouchableOpacity>}
          </View>
        ))}
      </Card>}

      {canManage && <Card>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Pending invitations</Text>
          <TouchableOpacity onPress={() => void loadInvitations()}><Text style={styles.link}>Refresh</Text></TouchableOpacity>
        </View>
        {loading ? <Text style={styles.help}>Loading invitations…</Text> : pendingInvitations.length === 0 ? <Text style={styles.help}>There are no pending invitations.</Text> : pendingInvitations.map((item) => (
          <View key={item.id} style={styles.invitationRow}>
            <View style={styles.invitationInfo}>
              <Text style={styles.rowTitle}>{item.email}</Text>
              <Text style={styles.help}>{item.role} · expires {new Date(item.expires_at).toLocaleDateString()}</Text>
            </View>
            <TouchableOpacity onPress={() => void handleRevoke(item.id)}><Text style={styles.revoke}>Revoke</Text></TouchableOpacity>
          </View>
        ))}
      </Card>}

      <Card>
        <Text style={styles.cardTitle}>Join a business</Text>
        <Text style={styles.help}>Paste an invitation token. It must be addressed to the email on your BusinessIQ account, and your phone must be verified.</Text>
        <Input label="Invitation token" value={token} onChangeText={setToken} autoCapitalize="none" placeholder="Paste token" />
        <Button label="Accept invitation" onPress={handleAccept} loading={saving} disabled={!token.trim()} fullWidth />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background } as any,
  content: { padding: spacing.xl, gap: spacing.lg, maxWidth: 760 } as any,
  header: { marginBottom: spacing.sm },
  title: { fontSize: fontSizes.xxl, fontWeight: fontWeights.bold, color: colors.text },
  subtitle: { fontSize: fontSizes.md, color: colors.textSecondary, marginTop: spacing.xs },
  cardTitle: { fontSize: fontSizes.lg, fontWeight: fontWeights.semibold, color: colors.text, marginBottom: spacing.sm },
  help: { fontSize: fontSizes.sm, color: colors.textSecondary, marginBottom: spacing.md, lineHeight: 20 },
  label: { fontSize: fontSizes.sm, fontWeight: fontWeights.medium, color: colors.textSecondary, marginBottom: spacing.sm },
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  roleChip: { borderWidth: 1, borderColor: colors.border, borderRadius: 18, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  roleChipSelected: { backgroundColor: colors.blue, borderColor: colors.blue },
  roleText: { color: colors.textSecondary, textTransform: 'capitalize' },
  roleTextSelected: { color: colors.textInverse },
  tokenBox: { backgroundColor: colors.infoBg, borderRadius: 8, padding: spacing.md, marginTop: spacing.md },
  tokenHeading: { color: colors.text, fontWeight: fontWeights.semibold, marginBottom: spacing.sm },
  token: { fontFamily: 'monospace', fontSize: fontSizes.md, color: colors.navy, marginBottom: spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  link: { color: colors.blue, fontWeight: fontWeights.semibold },
  invitationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  memberRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  memberRoles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  invitationInfo: { flex: 1 },
  rowTitle: { fontSize: fontSizes.md, fontWeight: fontWeights.medium, color: colors.text },
  revoke: { color: colors.danger, fontWeight: fontWeights.semibold },
  error: { color: colors.danger, fontSize: fontSizes.sm },
  notice: { color: colors.success, fontSize: fontSizes.sm },
});
