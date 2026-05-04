import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, radius, typography } from '@/lib/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'accent' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
}: ButtonProps) {
  const bg = {
    primary: colors.primary,
    accent: colors.accent,
    outline: 'transparent',
    ghost: 'transparent',
  }[variant];

  const borderColor = variant === 'outline' ? colors.primary : 'transparent';
  const textColor = variant === 'outline' ? colors.primary : variant === 'ghost' ? colors.primary : '#fff';

  const padV = { sm: 8, md: 14, lg: 18 }[size];
  const padH = { sm: 16, md: 24, lg: 32 }[size];
  const fontSize = { sm: 13, md: 15, lg: 17 }[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.base,
        {
          backgroundColor: bg,
          borderColor,
          borderWidth: variant === 'outline' ? 1.5 : 0,
          paddingVertical: padV,
          paddingHorizontal: padH,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[styles.text, { color: textColor, fontSize }, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
