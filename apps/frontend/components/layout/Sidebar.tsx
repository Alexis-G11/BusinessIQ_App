import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { navSections } from '@/lib/navigation';
import { colors, spacing, fontSizes, fontWeights } from '@/theme';
import * as LucideIcons from 'lucide-react-native';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const renderIcon = (iconName: string, size: number, color: string) => {
    const Icon = (LucideIcons as any)[iconName];
    if (!Icon) return null;
    return <Icon size={size} color={color} strokeWidth={2} />;
  };

  const isActive = (href: string) => {
    const path = href.replace('/(app)', '');
    return pathname === path || pathname.startsWith(path + '/');
  };

  return (
    <View style={[styles.container, collapsed && styles.collapsed]}>
      <View style={styles.header}>
        {!collapsed && (
          <View style={styles.brandRow}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>BI</Text>
            </View>
            <Text style={styles.brandName}>BusinessIQ</Text>
          </View>
        )}
        {collapsed && (
          <View style={styles.logo}>
            <Text style={styles.logoText}>BI</Text>
          </View>
        )}
        <TouchableOpacity onPress={onToggle} style={styles.toggleBtn}>
          {renderIcon(collapsed ? 'ChevronRight' : 'ChevronLeft', 18, colors.textSecondary)}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.nav} contentContainerStyle={styles.navContent}>
        {navSections.map((section) => (
          <View key={section.label} style={styles.section}>
            {!collapsed && <Text style={styles.sectionLabel}>{section.label}</Text>}
            {section.items.map((item) => {
              const active = isActive(item.href);
              return (
                <TouchableOpacity
                  key={item.href}
                  onPress={() => router.push(item.href as any)}
                  style={[styles.navItem, active && styles.navItemActive]}
                  activeOpacity={0.7}
                >
                  <View style={styles.navIconWrap}>
                    {renderIcon(item.icon, 20, active ? colors.blue : colors.textSecondary)}
                  </View>
                  {!collapsed && <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 256,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    height: '100%',
    flexDirection: 'column',
  } as any,
  collapsed: {
    width: 72,
  } as any,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  } as any,
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  } as any,
  logo: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  } as any,
  logoText: {
    color: colors.textInverse,
    fontWeight: fontWeights.bold,
    fontSize: fontSizes.sm,
  } as any,
  brandName: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.text,
    marginLeft: spacing.sm,
  } as any,
  toggleBtn: {
    padding: spacing.xs,
    borderRadius: 6,
  } as any,
  nav: {
    flex: 1,
  } as any,
  navContent: {
    paddingVertical: spacing.sm,
  } as any,
  section: {
    marginBottom: spacing.md,
  } as any,
  sectionLabel: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  } as any,
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.sm,
    borderRadius: 8,
    gap: 12,
  } as any,
  navItemActive: {
    backgroundColor: '#E0EAFB',
  } as any,
  navIconWrap: {
    width: 24,
    alignItems: 'center',
  } as any,
  navLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.text,
  } as any,
  navLabelActive: {
    color: colors.blue,
    fontWeight: fontWeights.semibold,
  } as any,
});
