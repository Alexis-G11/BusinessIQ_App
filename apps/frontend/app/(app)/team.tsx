import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, RefreshControl } from 'react-native';
import { useBusiness } from '@/context/BusinessContext';
import { useAuth } from '@/context/AuthContext';
import { teamApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { colors, spacing, fontSizes, fontWeights } from '@/theme';
import { UserCog, Plus, Mail, Trash2 } from 'lucide-react-native';
import type { BusinessRole, Membership } from '@/types';

const ROLES: BusinessRole[] = ['admin', 'manager', 'accountant', 'staff', 'viewer'];

export default function TeamScreen() {
  const { memberships, currentBusiness } = useBusiness();
  const { session } = useAuth();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<BusinessRole>('staff');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memberList, setMemberList] = useState<Membership[]>(memberships);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMembers = useCallback(async () => {
    if (!currentBusiness) return;
    const list = await teamApi.listForBusiness(currentBusiness.id);
    setMemberList(list);
  }, [currentBusiness]);

  useEffect(() => {
    if (!currentBusiness) return;
    let active = true;
    void teamApi.listForBusiness(currentBusiness.id).then(
      (list) => {
        if (active) setMemberList(list);
      },
      (error: unknown) => {
        if (active) setError(error instanceof Error ? error.message : 'Failed to load team members.');
      },
    );
    return () => { active = false; };
  }, [currentBusiness]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMembers();
    setRefreshing(false);
  }, [fetchMembers]);

  const handleInvite = async () => {
    if (!currentBusiness || !session?.user) return;
    if (!email.trim() || !email.includes('@')) { setError('Enter a valid email.'); return; }
    setInviting(true);
    setError(null);
    try {
      await teamApi.invite(currentBusiness.id, email.trim(), role, session.user.id);
      await fetchMembers();
      setInviteOpen(false);
      setEmail('');
      setRole('staff');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send invite');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    await teamApi.remove(memberId);
    await fetchMembers();
  };

  const handleRoleChange = async (memberId: string, newRole: BusinessRole) => {
    await teamApi.updateRole(memberId, newRole);
    await fetchMembers();
  };

  if (!currentBusiness) return <LoadingState message="Loading..." />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Team & Permissions</Text>
          <Text style={styles.pageSubtitle}>{memberList.length} member{memberList.length !== 1 ? 's' : ''} in {currentBusiness.name}</Text>
        </View>
        <Button label="Invite Member" onPress={() => setInviteOpen(true)} leftIcon={<Plus size={18} color={colors.textInverse} />} />
      </View>

      <Card>
        {memberList.length === 0 ? (
          <EmptyState title="No team members yet" message="Invite team members to collaborate on this business." icon={<UserCog size={28} color={colors.textSecondary} />} />
        ) : (
          memberList.map((member) => (
            <View key={member.id} style={styles.memberRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{member.invited_email?.charAt(0).toUpperCase() ?? '?'}</Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{member.invited_email ?? 'Team Member'}</Text>
                <Text style={styles.memberStatus}>{member.status}</Text>
              </View>
              {member.role === 'owner' ? (
                <Badge label="owner" tone="blue" />
              ) : (
                <View style={styles.memberActions}>
                  <View style={styles.rolePicker}>
                    {ROLES.map((r) => (
                      <TouchableOpacity key={r} onPress={() => handleRoleChange(member.id, r)}>
                        <Text style={[styles.roleOption, member.role === r && styles.roleOptionActive]}>{r}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity onPress={() => handleRemove(member.id)} style={styles.removeBtn}>
                    <Trash2 size={14} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </Card>

      <Card>
        <Text style={styles.rolesTitle}>Available Roles</Text>
        {[
          { role: 'Owner', desc: 'Full access including billing and deleting the business' },
          { role: 'Admin', desc: 'Full access to all business data and settings' },
          { role: 'Manager', desc: 'Manage operations, products, sales, and expenses' },
          { role: 'Accountant', desc: 'Access to financial reports and accounting' },
          { role: 'Staff', desc: 'Record sales and manage inventory' },
          { role: 'Viewer', desc: 'Read-only access to dashboards and reports' },
        ].map((r) => (
          <View key={r.role} style={styles.roleRow}>
            <Text style={styles.roleName}>{r.role}</Text>
            <Text style={styles.roleDesc}>{r.desc}</Text>
          </View>
        ))}
      </Card>

      <Modal visible={inviteOpen} transparent animationType="fade" onRequestClose={() => setInviteOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Invite Team Member</Text>
            {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}
            <Input label="Email Address" value={email} onChangeText={setEmail} placeholder="colleague@company.com" keyboardType="email-address" leftIcon={<Mail size={18} color={colors.textSecondary} />} />
            <Text style={styles.label}>Role</Text>
            <View style={styles.roleChips}>
              {ROLES.map((r) => (
                <TouchableOpacity key={r} onPress={() => setRole(r)} style={[styles.roleChip, role === r && styles.roleChipSelected]}>
                  <Text style={[styles.roleChipText, role === r && styles.roleChipTextSelected]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalButtons}>
              <Button label="Cancel" variant="outline" onPress={() => setInviteOpen(false)} />
              <Button label="Send Invite" onPress={handleInvite} loading={inviting} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background } as any,
  content: { padding: spacing.xl, gap: spacing.lg, maxWidth: 720 } as any,
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } as any,
  pageTitle: { fontSize: fontSizes.xxl, fontWeight: fontWeights.bold, color: colors.text } as any,
  pageSubtitle: { fontSize: fontSizes.md, color: colors.textSecondary, marginTop: 4 } as any,
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border } as any,
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' } as any,
  avatarText: { color: colors.textInverse, fontWeight: fontWeights.bold, fontSize: fontSizes.md } as any,
  memberInfo: { flex: 1 } as any,
  memberName: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.text } as any,
  memberStatus: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: 2 } as any,
  memberActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm } as any,
  rolePicker: { flexDirection: 'row', gap: 2, backgroundColor: colors.surfaceAlt, borderRadius: 6, padding: 2 } as any,
  roleOption: { fontSize: 11, paddingVertical: 4, paddingHorizontal: 8, color: colors.textSecondary, borderRadius: 4 } as any,
  roleOptionActive: { backgroundColor: colors.blue, color: colors.textInverse, fontWeight: fontWeights.semibold } as any,
  removeBtn: { padding: spacing.xs } as any,
  rolesTitle: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.text, marginBottom: spacing.md } as any,
  roleRow: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border } as any,
  roleName: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.text } as any,
  roleDesc: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: 2, lineHeight: 18 } as any,
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: spacing.xl } as any,
  modalCard: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: spacing.xl, width: '100%', maxWidth: 480, gap: spacing.md } as any,
  modalTitle: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold, color: colors.text } as any,
  errorBox: { backgroundColor: colors.dangerBg, borderRadius: 8, padding: spacing.md } as any,
  errorText: { color: colors.danger, fontSize: fontSizes.sm } as any,
  label: { fontSize: fontSizes.sm, fontWeight: fontWeights.medium, color: colors.text, marginBottom: spacing.xs } as any,
  roleChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm } as any,
  roleChip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface } as any,
  roleChipSelected: { borderColor: colors.blue, backgroundColor: '#E0EAFB' } as any,
  roleChipText: { fontSize: fontSizes.sm, color: colors.textSecondary, textTransform: 'capitalize' } as any,
  roleChipTextSelected: { color: colors.blue, fontWeight: fontWeights.semibold } as any,
  modalButtons: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm } as any,
});
