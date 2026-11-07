import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useBusiness } from '@/context/BusinessContext';
import { colors, spacing, fontSizes, fontWeights, radius } from '@/theme';
import { formatCurrency } from '@/lib/format';
import { ChevronDown, Plus, Bell, HelpCircle, Menu, Building2, Check, LogOut, User } from 'lucide-react-native';

interface TopBarProps {
  onMobileMenu: () => void;
}

export function TopBar({ onMobileMenu }: TopBarProps) {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const { businesses, currentBusiness, switchBusiness, createBusiness } = useBusiness();
  const [bizPickerOpen, setBizPickerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(intervalId);
  }, []);

  const trialDaysLeft = currentBusiness?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(currentBusiness.trial_ends_at).getTime() - now) / 86400000))
    : null;

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <TouchableOpacity onPress={onMobileMenu} style={styles.mobileMenuBtn}>
          <Menu size={22} color={colors.text} />
        </TouchableOpacity>

        {/* Business Selector */}
        <TouchableOpacity
          onPress={() => setBizPickerOpen(true)}
          style={styles.businessSelector}
        >
          <Building2 size={18} color={colors.blue} />
          <Text style={styles.businessName} numberOfLines={1}>
            {currentBusiness?.name ?? 'Select Business'}
          </Text>
          <ChevronDown size={16} color={colors.textSecondary} />
        </TouchableOpacity>

        {trialDaysLeft !== null && trialDaysLeft > 0 && (
          <View style={styles.trialBadge}>
            <Text style={styles.trialText}>{trialDaysLeft}d trial left</Text>
          </View>
        )}
      </View>

      <View style={styles.rightSection}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/(app)/help')}>
          <HelpCircle size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/(app)/billing' as any)}>
          <Bell size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* User Menu */}
        <TouchableOpacity
          onPress={() => setUserMenuOpen(!userMenuOpen)}
          style={styles.userBtn}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(profile?.full_name ?? profile?.email ?? 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Business Picker Modal */}
      <Modal visible={bizPickerOpen} transparent animationType="fade" onRequestClose={() => setBizPickerOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setBizPickerOpen(false)}>
          <View style={styles.bizPickerMenu}>
            <View style={styles.bizPickerHeader}>
              <Text style={styles.bizPickerTitle}>Your Businesses</Text>
            </View>
            <ScrollView style={styles.bizList}>
              {businesses.map((biz) => (
                <TouchableOpacity
                  key={biz.id}
                  onPress={() => {
                    switchBusiness(biz.id);
                    setBizPickerOpen(false);
                  }}
                  style={[styles.bizItem, biz.id === currentBusiness?.id && styles.bizItemActive]}
                >
                  <Building2 size={18} color={colors.text} />
                  <View style={styles.bizItemInfo}>
                    <Text style={styles.bizItemName}>{biz.name}</Text>
                    <Text style={styles.bizItemMeta}>{biz.currency} · {biz.subscription_plan ?? biz.subscription_status}</Text>
                  </View>
                  {biz.id === currentBusiness?.id && <Check size={18} color={colors.blue} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              onPress={() => {
                setBizPickerOpen(false);
                router.push('/(app)/onboarding');
              }}
              style={styles.addBizBtn}
            >
              <Plus size={18} color={colors.blue} />
              <Text style={styles.addBizText}>Add another business</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* User Menu Dropdown */}
      {userMenuOpen && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setUserMenuOpen(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setUserMenuOpen(false)}>
            <View style={styles.userMenu}>
              <View style={styles.userMenuHeader}>
                <Text style={styles.userMenuName}>{profile?.full_name ?? 'User'}</Text>
                <Text style={styles.userMenuEmail} numberOfLines={1}>{profile?.email}</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setUserMenuOpen(false);
                  router.push('/(app)/settings');
                }}
                style={styles.userMenuItem}
              >
                <User size={18} color={colors.text} />
                <Text style={styles.userMenuItemText}>Settings</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  setUserMenuOpen(false);
                  await signOut();
                  router.replace('/sign-in');
                }}
                style={[styles.userMenuItem, styles.userMenuDanger]}
              >
                <LogOut size={18} color={colors.danger} />
                <Text style={styles.userMenuDangerText}>Sign out</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 64,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  } as any,
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  } as any,
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  } as any,
  mobileMenuBtn: {
    padding: spacing.xs,
  } as any,
  businessSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 280,
  } as any,
  businessName: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    flexShrink: 1,
  } as any,
  trialBadge: {
    backgroundColor: colors.warningBg,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  } as any,
  trialText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.warning,
  } as any,
  iconBtn: {
    padding: spacing.sm,
    borderRadius: 8,
  } as any,
  userBtn: {
    padding: spacing.xs,
  } as any,
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  } as any,
  avatarText: {
    color: colors.textInverse,
    fontWeight: fontWeights.bold,
    fontSize: fontSizes.md,
  } as any,
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    paddingTop: 64,
    paddingHorizontal: spacing.lg,
  } as any,
  bizPickerMenu: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    width: 360,
    maxWidth: '90%',
    shadowColor: colors.navy,
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  } as any,
  bizPickerHeader: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  } as any,
  bizPickerTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  } as any,
  bizList: {
    maxHeight: 320,
  } as any,
  bizItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  } as any,
  bizItemActive: {
    backgroundColor: '#F0F5FF',
  } as any,
  bizItemInfo: {
    flex: 1,
  } as any,
  bizItemName: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  } as any,
  bizItemMeta: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  } as any,
  addBizBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  } as any,
  addBizText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.blue,
  } as any,
  userMenu: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    width: 260,
    maxWidth: '90%',
    marginLeft: 'auto',
    marginRight: spacing.xl,
    shadowColor: colors.navy,
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  } as any,
  userMenuHeader: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  } as any,
  userMenuName: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  } as any,
  userMenuEmail: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  } as any,
  userMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  } as any,
  userMenuItemText: {
    fontSize: fontSizes.md,
    color: colors.text,
  } as any,
  userMenuDanger: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  } as any,
  userMenuDangerText: {
    fontSize: fontSizes.md,
    color: colors.danger,
  } as any,
});
