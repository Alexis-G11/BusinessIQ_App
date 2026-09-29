import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Building2, Bell, CreditCard, Users, ChevronRight, Save } from 'lucide-react-native';
import { Card, Button, LoadingState, ErrorState } from '@/components/ui';
import { Colors, Spacing, Typography, formatCurrency, formatDate } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';
import { useFetch } from '@/lib/useFetch';
import * as billingApi from '@/api/billing';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, organization, signOut } = useAuth();
  const sub = useFetch(() => billingApi.getSubscriptionInfo(), []);

  const [notifSales, setNotifSales] = useState(true);
  const [notifPayments, setNotifPayments] = useState(true);
  const [notifStock, setNotifStock] = useState(true);
  const [notifReports, setNotifReports] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [bizName, setBizName] = useState(organization?.name ?? '');
  const [bizCurrency, setBizCurrency] = useState(organization?.currency ?? 'USD');

  const currencies = ['USD', 'EUR', 'GBP', 'NGN', 'KES', 'GHS'];

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={Colors.neutral[700]} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Business Profile */}
        <Text style={styles.sectionLabel}>Business Profile</Text>
        <Card padding="md" style={styles.sectionCard}>
          <View style={styles.profileHeader}>
            <View style={styles.bizIcon}>
              <Building2 size={22} color={Colors.primary[600]} strokeWidth={2} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.bizName}>{organization?.name ?? 'Business'}</Text>
              <Text style={styles.bizMeta}>{organization?.industry} · {organization?.country}</Text>
            </View>
            <TouchableOpacity onPress={() => setEditingProfile(!editingProfile)}>
              <Text style={styles.editLink}>{editingProfile ? 'Cancel' : 'Edit'}</Text>
            </TouchableOpacity>
          </View>

          {editingProfile && (
            <View style={styles.editForm}>
              <Text style={styles.fieldLabel}>Business Name</Text>
              <TextInput style={styles.textInput} value={bizName} onChangeText={setBizName} placeholder="Business name" placeholderTextColor={Colors.neutral[400]} />
              <Text style={styles.fieldLabel}>Currency</Text>
              <View style={styles.currencyRow}>
                {currencies.map((c) => (
                  <TouchableOpacity key={c} onPress={() => setBizCurrency(c)} style={[styles.currencyChip, bizCurrency === c && styles.currencyChipActive]}>
                    <Text style={[styles.currencyChipText, bizCurrency === c && styles.currencyChipTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Button label="Save Profile" onPress={() => setEditingProfile(false)} size="sm" icon={<Save size={16} color={Colors.neutral[0]} strokeWidth={2} />} style={styles.saveProfileBtn} />
            </View>
          )}
        </Card>

        {/* Billing */}
        <Text style={styles.sectionLabel}>Billing & Subscription</Text>
        {sub.loading ? (
          <Card padding="md"><LoadingState /></Card>
        ) : sub.error ? (
          <Card padding="md"><ErrorState message={sub.error} onRetry={sub.refetch} /></Card>
        ) : sub.data ? (
          <Card padding="md" style={styles.sectionCard}>
            <View style={styles.billingHeader}>
              <View>
                <Text style={styles.planName}>{sub.data.plan_name} Plan</Text>
                <Text style={styles.planPrice}>{formatCurrency(sub.data.amount, sub.data.currency)}/{sub.data.interval}</Text>
              </View>
              <View style={[styles.statusBadge, sub.data.status === 'trialing' ? styles.statusTrial : sub.data.status === 'active' ? styles.statusActive : styles.statusPastDue]}>
                <Text style={[styles.statusText, sub.data.status === 'trialing' ? styles.statusTrialText : sub.data.status === 'active' ? styles.statusActiveText : styles.statusPastDueText]}>
                  {sub.data.status === 'trialing' ? `${sub.data.days_remaining} days left` : sub.data.status}
                </Text>
              </View>
            </View>
            {sub.data.status === 'trialing' && (
              <Text style={styles.trialNote}>Your trial ends on {formatDate(sub.data.trial_ends_at ?? '')}. You won't be charged until then.</Text>
            )}
            <View style={styles.billingRows}>
              <View style={styles.billingRow}>
                <CreditCard size={16} color={Colors.neutral[400]} strokeWidth={2} />
                <Text style={styles.billingLabel}>Payment Method</Text>
                <Text style={styles.billingValue}>{sub.data.payment_method_last4 ? `•••• ${sub.data.payment_method_last4}` : 'Not set'}</Text>
              </View>
              <View style={styles.billingRow}>
                <Text style={styles.billingLabel}>Next Billing</Text>
                <Text style={styles.billingValue}>{sub.data.next_billing_date ? formatDate(sub.data.next_billing_date) : 'After trial'}</Text>
              </View>
            </View>
          </Card>
        ) : null}

        {/* Notifications */}
        <Text style={styles.sectionLabel}>Notifications</Text>
        <Card padding="md" style={styles.sectionCard}>
          <NotifRow icon="sales" label="New sales" value={notifSales} onToggle={setNotifSales} />
          <NotifRow icon="payments" label="Payment alerts" value={notifPayments} onToggle={setNotifPayments} />
          <NotifRow icon="stock" label="Low stock warnings" value={notifStock} onToggle={setNotifStock} />
          <NotifRow icon="reports" label="Weekly report summary" value={notifReports} onToggle={setNotifReports} />
        </Card>

        {/* Users & Roles */}
        <Text style={styles.sectionLabel}>Team</Text>
        <TouchableOpacity>
          <Card padding="md" style={styles.menuRow}>
            <View style={[styles.menuIcon, { backgroundColor: Colors.neutral[100] }]}>
              <Users size={20} color={Colors.neutral[600]} strokeWidth={2} />
            </View>
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>Users & Roles</Text>
              <Text style={styles.menuSub}>Manage who can access your account</Text>
            </View>
            <ChevronRight size={20} color={Colors.neutral[300]} strokeWidth={2} />
          </Card>
        </TouchableOpacity>

        {/* Account */}
        <Text style={styles.sectionLabel}>Account</Text>
        <Card padding="md" style={styles.sectionCard}>
          <View style={styles.accountRow}>
            <Text style={styles.accountLabel}>Name</Text>
            <Text style={styles.accountValue}>{user?.full_name}</Text>
          </View>
          <View style={styles.accountRow}>
            <Text style={styles.accountLabel}>Email</Text>
            <Text style={styles.accountValue}>{user?.email}</Text>
          </View>
          <View style={styles.accountRow}>
            <Text style={styles.accountLabel}>Role</Text>
            <Text style={styles.accountValue}>{user?.role}</Text>
          </View>
        </Card>

        <TouchableOpacity onPress={() => signOut()} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function NotifRow({ icon, label, value, onToggle }: { icon: string; label: string; value: boolean; onToggle: (v: boolean) => void }) {
  const iconColor = value ? Colors.primary[600] : Colors.neutral[400];
  return (
    <View style={notifStyles.row}>
      <Bell size={18} color={iconColor} strokeWidth={2} />
      <Text style={notifStyles.label}>{label}</Text>
      <Switch value={value} onValueChange={onToggle} trackColor={{ false: Colors.neutral[300], true: Colors.primary[500] }} thumbColor={Colors.neutral[0]} />
    </View>
  );
}

const notifStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  label: { flex: 1, fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.sm, color: Colors.neutral[700] },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md, backgroundColor: Colors.neutral[0], borderBottomWidth: 1, borderBottomColor: Colors.neutral[200] },
  backBtn: { padding: Spacing.xs, marginRight: Spacing.sm },
  topTitle: { fontFamily: Typography.fontFamilyBold, fontSize: Typography.sizes.xl, color: Colors.neutral[900] },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  sectionLabel: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.md, color: Colors.neutral[900], marginBottom: Spacing.sm, marginTop: Spacing.lg },
  sectionCard: { marginBottom: 0 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  bizIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.primary[50], alignItems: 'center', justifyContent: 'center' },
  profileInfo: { flex: 1 },
  bizName: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.md, color: Colors.neutral[900] },
  bizMeta: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[500], marginTop: 2, textTransform: 'capitalize' },
  editLink: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.sm, color: Colors.primary[600] },
  editForm: { marginTop: Spacing.md, gap: 0 },
  fieldLabel: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.sm, color: Colors.neutral[700], marginBottom: Spacing.xs, marginTop: Spacing.sm },
  textInput: { borderWidth: 1, borderColor: Colors.neutral[300], borderRadius: 12, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[900], backgroundColor: Colors.neutral[0] },
  currencyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  currencyChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: 10, borderWidth: 1, borderColor: Colors.neutral[300], backgroundColor: Colors.neutral[0] },
  currencyChipActive: { borderColor: Colors.primary[500], backgroundColor: Colors.primary[50] },
  currencyChipText: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.sm, color: Colors.neutral[600] },
  currencyChipTextActive: { color: Colors.primary[700] },
  saveProfileBtn: { marginTop: Spacing.md, alignSelf: 'flex-start' },
  billingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  planName: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.lg, color: Colors.neutral[900] },
  planPrice: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[500], marginTop: 2 },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: 8 },
  statusTrial: { backgroundColor: Colors.warning[50] },
  statusActive: { backgroundColor: Colors.success[50] },
  statusPastDue: { backgroundColor: Colors.error[50] },
  statusText: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.xs, textTransform: 'capitalize' },
  statusTrialText: { color: Colors.warning[700] },
  statusActiveText: { color: Colors.success[700] },
  statusPastDueText: { color: Colors.error[700] },
  trialNote: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.xs, color: Colors.neutral[500], marginTop: Spacing.sm },
  billingRows: { marginTop: Spacing.md, gap: Spacing.sm },
  billingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  billingLabel: { flex: 1, fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[600] },
  billingValue: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.sm, color: Colors.neutral[900] },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  menuIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuInfo: { flex: 1 },
  menuTitle: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.sm, color: Colors.neutral[900] },
  menuSub: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.xs, color: Colors.neutral[500], marginTop: 2 },
  accountRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.neutral[100] },
  accountLabel: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[600] },
  accountValue: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.sm, color: Colors.neutral[900], textTransform: 'capitalize' },
  signOutBtn: { paddingVertical: Spacing.lg, alignItems: 'center', marginTop: Spacing.lg },
  signOutText: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.md, color: Colors.error[600] },
});
