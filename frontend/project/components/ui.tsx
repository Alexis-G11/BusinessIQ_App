// Shared UI Components for BusinessIQ
// Reusable building blocks used across all screens

import { type ReactNode } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, TextInput,
  type StyleProp, type ViewStyle, type TextStyle, type FlexAlignType,
} from 'react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../lib/theme';

// --- Card ---

interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: keyof typeof Spacing;
}

export function Card({ children, style, padding = 'md' }: CardProps) {
  return <View style={[styles.card, { padding: Spacing[padding] }, style]}>{children}</View>;
}

// --- Button ---

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label, onPress, variant = 'primary', size = 'md', loading, disabled, icon, style,
}: ButtonProps) {
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.button, sizeStyle, variantStyle.button, (disabled || loading) && styles.disabled, style]}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={variantStyle.text.color} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[styles.buttonText, sizeStyle.text, variantStyle.text]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

// --- Input ---

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words';
  error?: string;
  style?: StyleProp<ViewStyle>;
  rightElement?: ReactNode;
}

export function Input({
  label, value, onChangeText, placeholder, secureTextEntry, keyboardType,
  autoCapitalize = 'sentences', error, style, rightElement,
}: InputProps) {
  return (
    <View style={styles.inputContainer}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <View style={[styles.inputWrapper, error && styles.inputError]}>
        <TextInput
          style={[styles.input, style]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.neutral[400]}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
        />
        {rightElement}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

// --- Select (simple picker using buttons) ---

interface SelectProps {
  label?: string;
  value: string;
  options: { label: string; value: string }[];
  onSelect: (value: string) => void;
}

export function Select({ label, value, options, onSelect }: SelectProps) {
  return (
    <View style={styles.inputContainer}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <View style={styles.selectContainer}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onSelect(opt.value)}
            style={[
              styles.selectOption,
              value === opt.value && styles.selectOptionActive,
            ]}
          >
            <Text style={[styles.selectOptionText, value === opt.value && styles.selectOptionTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// --- Badge ---

interface BadgeProps {
  label: string;
  color?: string;
  bgColor?: string;
}

export function Badge({ label, color = Colors.neutral[700], bgColor = Colors.neutral[100] }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

// --- LoadingState ---

export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={Colors.primary[500]} />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

// --- ErrorState ---

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      {onRetry && <Button label="Try again" onPress={onRetry} variant="outline" size="sm" />}
    </View>
  );
}

// --- EmptyState ---

export function EmptyState({ icon, title, message, actionLabel, onAction }: {
  icon?: ReactNode; title: string; message?: string; actionLabel?: string; onAction?: () => void;
}) {
  return (
    <View style={styles.emptyContainer}>
      {icon}
      <Text style={styles.emptyTitle}>{title}</Text>
      {message && <Text style={styles.emptyMessage}>{message}</Text>}
      {actionLabel && onAction && <Button label={actionLabel} onPress={onAction} variant="outline" size="sm" />}
    </View>
  );
}

// --- SectionHeader ---

export function SectionHeader({ title, actionLabel, onAction }: {
  title: string; actionLabel?: string; onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// --- MoneyText ---

export function MoneyText({ value, currency = 'USD', style, positiveColor, negativeColor }: {
  value: number; currency?: string; style?: StyleProp<TextStyle>;
  positiveColor?: string; negativeColor?: string;
}) {
  const { formatCurrency } = require('../lib/theme');
  const isNegative = value < 0;
  const color = isNegative
    ? (negativeColor ?? Colors.error[600])
    : (positiveColor ?? Colors.neutral[900]);
  const arrow = isNegative ? '▼ ' : value > 0 ? '▲ ' : '';
  return (
    <Text style={[{ fontFamily: Typography.fontFamilySemiBold, color }, style]}>
      {arrow}{formatCurrency(value, currency)}
    </Text>
  );
}

// --- ScreenContainer ---

export function ScreenContainer({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.screenContainer, style]}>{children}</View>;
}

// --- Row ---

export function Row({ children, style, align = 'center' }: {
  children: ReactNode; style?: StyleProp<ViewStyle>; align?: FlexAlignType;
}) {
  return <View style={[styles.row, { alignItems: align }, style]}>{children}</View>;
}

// --- Divider ---

export function Divider() {
  return <View style={styles.divider} />;
}

// --- styles ---

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  card: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.lg,
    ...Shadows.sm,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    gap: Spacing.xs,
  },
  buttonText: {
    fontFamily: Typography.fontFamilySemiBold,
  },
  disabled: {
    opacity: 0.5,
  },
  inputContainer: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontFamily: Typography.fontFamilyMedium,
    fontSize: Typography.sizes.sm,
    color: Colors.neutral[700],
    marginBottom: Spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.neutral[300],
    borderRadius: Radius.md,
    backgroundColor: Colors.neutral[0],
    paddingHorizontal: Spacing.md,
  },
  input: {
    flex: 1,
    fontFamily: Typography.fontFamilyRegular,
    fontSize: Typography.sizes.md,
    color: Colors.neutral[900],
    paddingVertical: Spacing.md,
  },
  inputError: {
    borderColor: Colors.error[400],
  },
  errorText: {
    fontFamily: Typography.fontFamilyRegular,
    fontSize: Typography.sizes.xs,
    color: Colors.error[600],
    marginTop: Spacing.xs,
  },
  selectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  selectOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.neutral[300],
    backgroundColor: Colors.neutral[0],
  },
  selectOptionActive: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },
  selectOptionText: {
    fontFamily: Typography.fontFamilyMedium,
    fontSize: Typography.sizes.sm,
    color: Colors.neutral[600],
  },
  selectOptionTextActive: {
    color: Colors.primary[700],
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  badgeText: {
    fontFamily: Typography.fontFamilyMedium,
    fontSize: Typography.sizes.xs,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
  loadingText: {
    fontFamily: Typography.fontFamilyRegular,
    fontSize: Typography.sizes.sm,
    color: Colors.neutral[500],
    marginTop: Spacing.md,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  errorTitle: {
    fontFamily: Typography.fontFamilySemiBold,
    fontSize: Typography.sizes.lg,
    color: Colors.neutral[900],
    marginBottom: Spacing.xs,
  },
  errorMessage: {
    fontFamily: Typography.fontFamilyRegular,
    fontSize: Typography.sizes.sm,
    color: Colors.neutral[500],
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  emptyTitle: {
    fontFamily: Typography.fontFamilySemiBold,
    fontSize: Typography.sizes.lg,
    color: Colors.neutral[700],
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptyMessage: {
    fontFamily: Typography.fontFamilyRegular,
    fontSize: Typography.sizes.sm,
    color: Colors.neutral[500],
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontFamily: Typography.fontFamilySemiBold,
    fontSize: Typography.sizes.lg,
    color: Colors.neutral[900],
  },
  sectionAction: {
    fontFamily: Typography.fontFamilyMedium,
    fontSize: Typography.sizes.sm,
    color: Colors.primary[600],
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.neutral[200],
    marginVertical: Spacing.md,
  },
});

const variantStyles = {
  primary: {
    button: { backgroundColor: Colors.primary[600] },
    text: { color: Colors.neutral[0] },
  },
  secondary: {
    button: { backgroundColor: Colors.neutral[100] },
    text: { color: Colors.neutral[800] },
  },
  outline: {
    button: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.neutral[300] },
    text: { color: Colors.neutral[700] },
  },
  ghost: {
    button: { backgroundColor: 'transparent' },
    text: { color: Colors.primary[600] },
  },
  danger: {
    button: { backgroundColor: Colors.error[600] },
    text: { color: Colors.neutral[0] },
  },
};

const sizeStyles = {
  sm: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    text: { fontSize: Typography.sizes.sm },
  },
  md: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    text: { fontSize: Typography.sizes.md },
  },
  lg: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    text: { fontSize: Typography.sizes.lg },
  },
};

// Re-export Header so screens can import from one place
export { Header } from './Header';
