import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { colors, spacing, radius, typography } from '@/lib/theme';
import Button from '@/components/Button';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please fill in your email and password.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      Alert.alert('Login failed', error.message);
    } else {
      router.replace('/(tabs)');
    }
  }

  return (
    <LinearGradient colors={[colors.gradientStart, colors.gradientMid, '#1a4731']} style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kav}
        >
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            {/* Back */}
            <TouchableOpacity style={styles.back} onPress={() => router.back()}>
              <ArrowLeft size={20} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.subtitle}>Sign in to your PPF account</Text>
            </View>

            {/* Form card */}
            <View style={styles.card}>
              {/* Email */}
              <View style={styles.field}>
                <Text style={styles.label}>Email address</Text>
                <View style={styles.inputWrap}>
                  <Mail size={16} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="you@company.com"
                    placeholderTextColor={colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.field}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputWrap}>
                  <Lock size={16} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Your password"
                    placeholderTextColor={colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPass}
                    autoComplete="password"
                  />
                  <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                    {showPass
                      ? <EyeOff size={16} color={colors.textMuted} />
                      : <Eye size={16} color={colors.textMuted} />
                    }
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={styles.forgotWrap}>
                <Text style={styles.forgot}>Forgot password?</Text>
              </TouchableOpacity>

              <Button
                title="Sign In"
                onPress={handleLogin}
                loading={loading}
                style={{ marginTop: spacing.sm }}
              />

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.divLine} />
                <Text style={styles.divText}>or</Text>
                <View style={styles.divLine} />
              </View>

              <TouchableOpacity
                style={styles.signupLink}
                onPress={() => router.push('/(auth)/signup')}
              >
                <Text style={styles.signupText}>
                  Don't have an account?{' '}
                  <Text style={styles.signupBold}>Create one free</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  kav: { flex: 1 },
  scroll: { padding: spacing.lg, paddingBottom: 60 },
  back: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  header: { marginBottom: spacing.xl },
  title: { fontSize: 32, fontWeight: '800', color: '#fff', lineHeight: 40 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.65)', marginTop: 6 },
  card: {
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 50,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    height: '100%',
  },
  eyeBtn: { padding: 4 },
  forgotWrap: { alignSelf: 'flex-end', marginTop: -4 },
  forgot: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: spacing.xs,
  },
  divLine: { flex: 1, height: 1, backgroundColor: colors.border },
  divText: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  signupLink: { alignItems: 'center' },
  signupText: { fontSize: 14, color: colors.textSecondary },
  signupBold: { color: colors.primary, fontWeight: '700' },
});
