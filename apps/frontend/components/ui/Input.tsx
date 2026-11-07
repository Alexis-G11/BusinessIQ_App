import React from 'react';
import { View, Text, TextInput, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { colors, spacing, radius, fontSizes, fontWeights } from '@/theme';

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  error?: string;
  hint?: string;
  style?: TextStyle;
  multiline?: boolean;
  numberOfLines?: number;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  editable?: boolean;
  autoFocus?: boolean;
  onSubmitEditing?: (value: string) => void;
  returnKeyType?: 'done' | 'go' | 'next' | 'search' | 'send';
  blurOnSubmit?: boolean;
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'none',
  error,
  hint,
  style,
  multiline,
  numberOfLines,
  leftIcon,
  rightIcon,
  editable = true,
  autoFocus = false,
  onSubmitEditing,
  returnKeyType,
  blurOnSubmit,
}: InputProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[
        styles.inputRow,
        !!error && styles.inputRowError,
        !editable && styles.inputRowDisabled,
      ]}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          style={[styles.input, style, multiline && styles.multiline]}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={editable}
          autoFocus={autoFocus}
          onSubmitEditing={(event) => onSubmitEditing?.(event.nativeEvent.text)}
          returnKeyType={returnKeyType}
          blurOnSubmit={blurOnSubmit}
        />
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md } as ViewStyle,
  label: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  } as TextStyle,
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  } as ViewStyle,
  inputRowError: {
    borderColor: colors.danger,
  } as ViewStyle,
  inputRowDisabled: {
    backgroundColor: colors.surfaceAlt,
    opacity: 0.6,
  } as ViewStyle,
  input: {
    flex: 1,
    fontSize: fontSizes.md,
    color: colors.text,
    paddingVertical: spacing.sm,
  } as TextStyle,
  multiline: {
    textAlignVertical: 'top',
    minHeight: 80,
  } as TextStyle,
  leftIcon: {
    marginRight: spacing.sm,
  } as ViewStyle,
  rightIcon: {
    marginLeft: spacing.sm,
  } as ViewStyle,
  error: {
    fontSize: fontSizes.xs,
    color: colors.danger,
    marginTop: spacing.xs,
  } as TextStyle,
  hint: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  } as TextStyle,
});
