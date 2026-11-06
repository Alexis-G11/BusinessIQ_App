import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { colors, spacing, fontSizes, fontWeights, radius } from '@/theme';
import { Package, ScanLine, ChevronRight } from 'lucide-react-native';

interface AddOption {
  id: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  route: string;
}

export default function AddProductChooserScreen() {
  const router = useRouter();

  const options: AddOption[] = [
    {
      id: 'simple',
      title: 'Add Single Product',
      desc: 'Fill in product details one at a time — name, price, stock, and more.',
      icon: <Package size={28} color={colors.blue} strokeWidth={2} />,
      route: '/(app)/products/new',
    },
    {
      id: 'barcode',
      title: 'Add via Barcode',
      desc: 'Scan a product barcode with your camera or type the barcode number manually.',
      icon: <ScanLine size={28} color={colors.blue} strokeWidth={2} />,
      route: '/(app)/products/barcode',
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Add Products</Text>
        <Text style={styles.pageSubtitle}>Choose how you&apos;d like to add products to your inventory</Text>
      </View>

      {options.map((opt) => (
        <TouchableOpacity key={opt.id} onPress={() => router.push(opt.route as any)} activeOpacity={0.7}>
          <Card style={styles.optionCard}>
            <View style={styles.optionIconWrap}>
              {opt.icon}
            </View>
            <View style={styles.optionBody}>
              <Text style={styles.optionTitle}>{opt.title}</Text>
              <Text style={styles.optionDesc}>{opt.desc}</Text>
            </View>
            <ChevronRight size={22} color={colors.textSecondary} />
          </Card>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background } as any,
  content: { padding: spacing.xl, gap: spacing.lg, maxWidth: 640 } as any,
  header: { marginBottom: spacing.sm } as any,
  pageTitle: { fontSize: fontSizes.xxl, fontWeight: fontWeights.bold, color: colors.text } as any,
  pageSubtitle: { fontSize: fontSizes.md, color: colors.textSecondary, marginTop: 4 } as any,
  optionCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.lg,
    padding: spacing.lg,
  } as any,
  optionIconWrap: {
    width: 56, height: 56, borderRadius: radius.lg,
    backgroundColor: '#E0EAFB', alignItems: 'center', justifyContent: 'center',
  } as any,
  optionBody: { flex: 1 } as any,
  optionTitle: { fontSize: fontSizes.lg, fontWeight: fontWeights.semibold, color: colors.text } as any,
  optionDesc: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 4, lineHeight: 20 } as any,
});
