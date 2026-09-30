import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Users, Truck, Bot, Settings, HelpCircle, ArrowRight, LogOut, BookText } from 'lucide-react-native';
import { Header, Card } from '@/components/ui';
import { Colors, Spacing, Typography } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';

const menuItems = [
  { title: 'Customers', subtitle: 'Manage customer profiles and balances', icon: 'customers' as const, route: '/(tabs)/more/customers' as const, color: Colors.primary[600] },
  { title: 'Suppliers', subtitle: 'Manage supplier profiles and balances', icon: 'suppliers' as const, route: '/(tabs)/more/suppliers' as const, color: Colors.secondary[600] },
  { title: 'AI Assistant', subtitle: 'Ask questions about your business data', icon: 'ai' as const, route: '/(tabs)/more/ai-assistant' as const, color: '#8b5cf6' },
  { title: 'Chart of Accounts / Journal', subtitle: 'Accountant view of all entries', icon: 'journal' as const, route: '/(tabs)/reports/journal' as const, color: Colors.neutral[600] },
  { title: 'Settings', subtitle: 'Business profile, billing, preferences', icon: 'settings' as const, route: '/(tabs)/more/settings' as const, color: Colors.neutral[600] },
  { title: 'Help Center', subtitle: 'Guides and articles', icon: 'help' as const, route: '/(tabs)/more/help-center' as const, color: Colors.accent[600] },
];

function MenuIcon({ name, color }: { name: string; color: string }) {
  const size = 22;
  const sw = 2;
  switch (name) {
    case 'customers': return <Users size={size} color={color} strokeWidth={sw} />;
    case 'suppliers': return <Truck size={size} color={color} strokeWidth={sw} />;
    case 'ai': return <Bot size={size} color={color} strokeWidth={sw} />;
    case 'journal': return <BookText size={size} color={color} strokeWidth={sw} />;
    case 'settings': return <Settings size={size} color={color} strokeWidth={sw} />;
    case 'help': return <HelpCircle size={size} color={color} strokeWidth={sw} />;
    default: return <Users size={size} color={color} strokeWidth={sw} />;
  }
}

export default function MoreHome() {
  const router = useRouter();
  const { user, organization, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Header title="More" subtitle="Everything else in one place" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Card padding="md" style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileInitial}>
              {user?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.full_name ?? 'User'}</Text>
            <Text style={styles.profileEmail}>{user?.email ?? ''}</Text>
            <Text style={styles.profileOrg}>{organization?.name ?? ''}</Text>
          </View>
        </Card>

        {menuItems.map((item) => (
          <TouchableOpacity key={item.title} onPress={() => router.push(item.route)}>
            <Card padding="md" style={styles.menuCard}>
              <View style={[styles.menuIcon, { backgroundColor: `${item.color}15` }]}>
                <MenuIcon name={item.icon} color={item.color} />
              </View>
              <View style={styles.menuInfo}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSub}>{item.subtitle}</Text>
              </View>
              <ArrowRight size={20} color={Colors.neutral[300]} strokeWidth={2} />
            </Card>
          </TouchableOpacity>
        ))}

        <TouchableOpacity onPress={() => signOut()} style={styles.signOutBtn}>
          <LogOut size={20} color={Colors.error[600]} strokeWidth={2} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>BusinessIQ v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
  profileAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary[600], alignItems: 'center', justifyContent: 'center' },
  profileInitial: { fontFamily: Typography.fontFamilyBold, fontSize: Typography.sizes.xl, color: Colors.neutral[0] },
  profileInfo: { flex: 1 },
  profileName: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.md, color: Colors.neutral[900] },
  profileEmail: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[500], marginTop: 2 },
  profileOrg: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.xs, color: Colors.primary[600], marginTop: 2 },
  menuCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  menuIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuInfo: { flex: 1 },
  menuTitle: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.md, color: Colors.neutral[900] },
  menuSub: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[500], marginTop: 2 },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg, marginTop: Spacing.md },
  signOutText: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.md, color: Colors.error[600] },
  versionText: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.xs, color: Colors.neutral[400], textAlign: 'center', marginTop: Spacing.md },
});
