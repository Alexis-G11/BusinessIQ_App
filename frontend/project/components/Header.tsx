// Header component — consistent screen header

import { type ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '../lib/theme';

interface HeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}

export function Header({ title, subtitle, right }: HeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.neutral[0],
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontFamily: Typography.fontFamilyBold,
    fontSize: Typography.sizes.xxl,
    color: Colors.neutral[900],
  },
  subtitle: {
    fontFamily: Typography.fontFamilyRegular,
    fontSize: Typography.sizes.sm,
    color: Colors.neutral[500],
    marginTop: 2,
  },
});
