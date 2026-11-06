import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
  StyleProp,
} from 'react-native';
import { colors, spacing, radius, fontSizes, fontWeights } from '@/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const bg = variantBg(variant);
  const fg = variantFg(variant);
  const borderColor = variantBorder(variant);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={[
        styles.base,
        sizeStyles[size],
        { backgroundColor: bg, borderColor },
        isDisabled && styles.disabled,
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <View style={styles.content}>
          {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
          <Text style={[styles.label, { color: fg }, sizeTextStyles[size]]}>{label}</Text>
          {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
}

function variantBg(v: Variant): string {
  switch (v) {
    case 'primary': return colors.blue;
    case 'secondary': return colors.navy;
    case 'outline': return 'transparent';
    case 'ghost': return 'transparent';
    case 'danger': return colors.danger;
  }
}

function variantFg(v: Variant): string {
  switch (v) {
    case 'primary':
    case 'secondary':
    case 'danger':
      return colors.textInverse;
    case 'outline':
      return colors.blue;
    case 'ghost':
      return colors.blue;
  }
}

function variantBorder(v: Variant): string {
  switch (v) {
    case 'primary':
    case 'secondary':
    case 'danger':
      return 'transparent';
    case 'outline':
      return colors.blue;
    case 'ghost':
      return 'transparent';
  }
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  } as ViewStyle,
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  label: {
    fontWeight: fontWeights.semibold,
  } as TextStyle,
  iconLeft: {
    marginRight: 6,
  } as ViewStyle,
  iconRight: {
    marginLeft: 6,
  } as ViewStyle,
  disabled: {
    opacity: 0.5,
  } as ViewStyle,
  fullWidth: {
    width: '100%',
  } as ViewStyle,
});

const sizeStyles: Record<Size, ViewStyle> = {
  sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  md: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  lg: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl },
};

const sizeTextStyles: Record<Size, TextStyle> = {
  sm: { fontSize: fontSizes.sm },
  md: { fontSize: fontSizes.md },
  lg: { fontSize: fontSizes.lg },
};
