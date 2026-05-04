import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wrench, Search, MessageSquare, TrendingUp } from 'lucide-react-native';
import { colors, spacing, radius, typography, shadows } from '@/lib/theme';
import Button from '@/components/Button';

const { width } = Dimensions.get('window');

const features = [
  { icon: Search, title: 'Find Engineers', desc: 'Browse 500+ verified engineering professionals' },
  { icon: Wrench, title: 'Post RFQs', desc: 'Describe your project, get proposals fast' },
  { icon: MessageSquare, title: 'Direct Messaging', desc: 'Communicate securely with token-based privacy' },
  { icon: TrendingUp, title: 'Track Projects', desc: 'Manage orders and milestones in one place' },
];

export default function WelcomeScreen() {
  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Brand */}
          <View style={styles.brand}>
            <View style={styles.logoCircle}>
              <Wrench size={36} color={colors.primaryLight} strokeWidth={2.5} />
            </View>
            <Text style={styles.brandName}>Precision Project Flow</Text>
            <Text style={styles.tagline}>The Engineering Marketplace</Text>
          </View>

          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>
              Connect with{'\n'}
              <Text style={styles.heroAccent}>Top Engineers</Text>
              {'\n'}in minutes.
            </Text>
            <Text style={styles.heroSub}>
              Post an RFQ, browse vetted professionals, and manage your entire project — all in one app.
            </Text>
          </View>

          {/* Feature cards */}
          <View style={styles.features}>
            {features.map((f, i) => (
              <View key={i} style={styles.featureCard}>
                <View style={styles.featureIcon}>
                  <f.icon size={20} color={colors.primary} />
                </View>
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  <Text style={styles.featureDesc}>{f.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Stats strip */}
          <View style={styles.stats}>
            {[['500+', 'Engineers'], ['2,400+', 'Projects'], ['98%', 'Satisfaction']].map(([num, lbl]) => (
              <View key={lbl} style={styles.statItem}>
                <Text style={styles.statNum}>{num}</Text>
                <Text style={styles.statLbl}>{lbl}</Text>
              </View>
            ))}
          </View>

          {/* CTAs */}
          <View style={styles.ctas}>
            <Button
              title="Get Started — It's Free"
              onPress={() => router.push('/(auth)/signup')}
              variant="accent"
              size="lg"
              style={styles.ctaPrimary}
            />
            <Button
              title="Sign In"
              onPress={() => router.push('/(auth)/login')}
              variant="outline"
              size="lg"
              style={styles.ctaSecondary}
              textStyle={{ color: '#fff' }}
            />
          </View>

          <Text style={styles.legal}>
            By signing up you agree to our Terms of Service & Privacy Policy.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  brand: { alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.xl },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(34,197,94,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  brandName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 13,
    color: colors.primaryPale,
    marginTop: 4,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  hero: { marginBottom: spacing.xl },
  heroTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 46,
    textAlign: 'center',
  },
  heroAccent: {
    color: colors.primaryLight,
  },
  heroSub: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: spacing.md,
  },
  features: { gap: 12, marginBottom: spacing.xl },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(34,197,94,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { flex: 1, gap: 3 },
  featureTitle: { fontSize: 14, fontWeight: '700', color: '#fff' },
  featureDesc: { fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 16 },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800', color: colors.primaryLight },
  statLbl: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2, fontWeight: '500' },
  ctas: { gap: 12, marginBottom: spacing.lg },
  ctaPrimary: { width: '100%' },
  ctaSecondary: {
    width: '100%',
    borderColor: 'rgba(255,255,255,0.5)',
  },
  legal: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    lineHeight: 16,
  },
});
