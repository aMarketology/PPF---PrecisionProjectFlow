import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Mail, Lock, User, Building2, Eye, EyeOff } from 'lucide-react-native';
import { colors, spacing, radius } from '@/lib/theme';
import Button from '@/components/Button';
import { supabase } from '@/lib/supabase';

export default function SignupScreen() {
  const [userType, setUserType] = useState<'engineer' | 'client'>('client');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    if (!name || !email || !password) {
      Alert.alert('Missing fields', 'Please fill in all required fields.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name, user_type: userType, company_name: company },
      },
    });
    setLoading(false);
    if (error) {
      Alert.alert('Signup failed', error.message);
    } else {
      Alert.alert(
        'Check your email',
        'We sent you a confirmation link. Please verify before signing in.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
      );
    }
  }

  return (
    <LinearGradient colors={[colors.gradientStart, colors.gradientMid, '#1a4731']} style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <TouchableOpacity style={styles.back} onPress={() => router.back()}>
              <ArrowLeft size={20} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>

            <View style={styles.header}>
              <Text style={styles.title}>Create account</Text>
              <Text style={styles.subtitle}>Join the engineering marketplace</Text>
            </View>

            <View style={styles.card}>
              {/* User type toggle */}
              <View style={styles.typeToggle}>
                {(['client', 'engineer'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeBtn, userType === type && styles.typeBtnActive]}
                    onPress={() => setUserType(type)}
                  >
                    {type === 'engineer'
                      ? <Building2 size={16} color={userType === type ? '#fff' : colors.textSecondary} />
                      : <User size={16} color={userType === type ? '#fff' : colors.textSecondary} />
                    }
                    <Text style={[styles.typeBtnText, userType === type && styles.typeBtnTextActive]}>
                      {type === 'engineer' ? 'Vendor / Engineer' : 'Client'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Name */}
              <View style={styles.field}>
                <Text style={styles.label}>Full name *</Text>
                <View style={styles.inputWrap}>
                  <User size={16} color={colors.textMuted} style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Jane Smith"
                    placeholderTextColor={colors.textMuted}
                    value={name}
                    onChangeText={setName}
                    autoComplete="name"
                  />
                </View>
              </View>

              {/* Company */}
              <View style={styles.field}>
                <Text style={styles.label}>Company / Organization</Text>
                <View style={styles.inputWrap}>
                  <Building2 size={16} color={colors.textMuted} style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Acme Engineering Co."
                    placeholderTextColor={colors.textMuted}
                    value={company}
                    onChangeText={setCompany}
                  />
                </View>
              </View>

              {/* Email */}
              <View style={styles.field}>
                <Text style={styles.label}>Email address *</Text>
                <View style={styles.inputWrap}>
                  <Mail size={16} color={colors.textMuted} style={styles.icon} />
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
                <Text style={styles.label}>Password * (min 8 chars)</Text>
                <View style={styles.inputWrap}>
                  <Lock size={16} color={colors.textMuted} style={styles.icon} />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Create a strong password"
                    placeholderTextColor={colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPass}
                    autoComplete="new-password"
                  />
                  <TouchableOpacity onPress={() => setShowPass(!showPass)} style={{ padding: 4 }}>
                    {showPass ? <EyeOff size={16} color={colors.textMuted} /> : <Eye size={16} color={colors.textMuted} />}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Password strength */}
              <View style={styles.strengthRow}>
                {[0, 1, 2, 3].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.strengthBar,
                      {
                        backgroundColor:
                          password.length > i * 3
                            ? password.length >= 12 ? colors.primary : colors.accent
                            : colors.border,
                      },
                    ]}
                  />
                ))}
              </View>

              <Button title="Create Account" onPress={handleSignup} loading={loading} style={{ marginTop: spacing.sm }} />

              <TouchableOpacity style={styles.loginLink} onPress={() => router.push('/(auth)/login')}>
                <Text style={styles.loginText}>
                  Already have an account?{' '}
                  <Text style={styles.loginBold}>Sign in</Text>
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
  scroll: { padding: spacing.lg, paddingBottom: 60 },
  back: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl,
  },
  header: { marginBottom: spacing.xl },
  title: { fontSize: 32, fontWeight: '800', color: '#fff', lineHeight: 40 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.65)', marginTop: 6 },
  card: {
    backgroundColor: '#fff', borderRadius: radius.xl,
    padding: spacing.xl, gap: spacing.md,
  },
  typeToggle: {
    flexDirection: 'row', gap: 8,
    backgroundColor: colors.background, borderRadius: radius.lg, padding: 4,
  },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: radius.md,
  },
  typeBtnActive: { backgroundColor: colors.primary },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  typeBtnTextActive: { color: '#fff' },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.background, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border,
    paddingHorizontal: spacing.md, height: 50,
  },
  icon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: colors.text, height: '100%' },
  strengthRow: { flexDirection: 'row', gap: 4 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  loginLink: { alignItems: 'center', marginTop: 4 },
  loginText: { fontSize: 14, color: colors.textSecondary },
  loginBold: { color: colors.primary, fontWeight: '700' },
});
