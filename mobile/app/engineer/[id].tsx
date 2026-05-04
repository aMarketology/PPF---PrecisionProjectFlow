import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, Star, MapPin, Building2, MessageSquare, Briefcase, Award } from 'lucide-react-native';
import { colors, spacing, radius, shadows } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import ServiceCard from '@/components/ServiceCard';
import Button from '@/components/Button';

export default function EngineerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [engineer, setEngineer] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadEngineer();
  }, [id]);

  async function loadEngineer() {
    const [{ data: profile }, { data: svcs }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase
        .from('services')
        .select('id, title, description, price, category, images, delivery_time, service_area, created_at')
        .eq('provider_id', id)
        .eq('active', true),
    ]);
    setEngineer(profile);
    setServices(svcs || []);
    setLoading(false);
  }

  if (loading || !engineer) return null;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero */}
        <LinearGradient colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]} style={styles.hero}>
          <SafeAreaView edges={['top']}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <ArrowLeft size={20} color="#fff" />
            </TouchableOpacity>

            <View style={styles.profileRow}>
              <View style={styles.avatarWrap}>
                <Image
                  source={{ uri: engineer.avatar_url || `https://api.dicebear.com/7.x/initials/png?seed=${engineer.full_name}&backgroundColor=16a34a` }}
                  style={styles.avatar}
                  contentFit="cover"
                />
                <View style={styles.verifiedDot} />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.name}>{engineer.full_name}</Text>
                {engineer.company_name && (
                  <View style={styles.metaRow}>
                    <Building2 size={12} color={colors.primaryPale} />
                    <Text style={styles.metaText}>{engineer.company_name}</Text>
                  </View>
                )}
                {engineer.location && (
                  <View style={styles.metaRow}>
                    <MapPin size={12} color={colors.primaryPale} />
                    <Text style={styles.metaText}>{engineer.location}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              {[
                { label: 'Services', val: services.length },
                { label: 'Rating', val: '4.9' },
                { label: 'Jobs Done', val: '23+' },
              ].map(({ label, val }) => (
                <View key={label} style={styles.statBox}>
                  <Text style={styles.statVal}>{val}</Text>
                  <Text style={styles.statLabel}>{label}</Text>
                </View>
              ))}
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.body}>
          {/* About */}
          {engineer.bio && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>About</Text>
              <Text style={styles.bio}>{engineer.bio}</Text>
            </View>
          )}

          {/* Certifications / skills (stub) */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Highlights</Text>
            {[
              { icon: Award, text: 'Licensed Professional Engineer' },
              { icon: Star, text: '4.9/5 average rating' },
              { icon: Briefcase, text: `${services.length} active service listing${services.length !== 1 ? 's' : ''}` },
            ].map(({ icon: Icon, text }) => (
              <View key={text} style={styles.highlightRow}>
                <View style={styles.highlightIcon}>
                  <Icon size={14} color={colors.primary} />
                </View>
                <Text style={styles.highlightText}>{text}</Text>
              </View>
            ))}
          </View>

          {/* Services */}
          {services.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Services Offered</Text>
              {services.map((svc) => (
                <ServiceCard
                  key={svc.id}
                  id={svc.id}
                  title={svc.title}
                  description={svc.description}
                  price={svc.price}
                  category={svc.category}
                  deliveryTime={svc.delivery_time}
                  imageUrl={svc.images?.[0]}
                  providerName={engineer.full_name}
                  providerAvatar={engineer.avatar_url}
                  location={engineer.location}
                  onPress={() => router.push(`/service/${svc.id}` as any)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={styles.stickyBar}>
        <Button
          title="Send Message"
          onPress={() => router.push(`/conversation/new?with=${id}` as any)}
          variant="primary"
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  hero: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  profileRow: { flexDirection: 'row', gap: 16, marginBottom: spacing.xl },
  avatarWrap: { position: 'relative' },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' },
  verifiedDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.accent, borderWidth: 2.5, borderColor: colors.gradientMid,
  },
  profileInfo: { flex: 1, justifyContent: 'center', gap: 5 },
  name: { fontSize: 22, fontWeight: '800', color: '#fff' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  statsRow: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.lg, padding: spacing.md, gap: 4,
  },
  statBox: { flex: 1, alignItems: 'center', gap: 3 },
  statVal: { fontSize: 20, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '600' },
  body: { padding: spacing.lg, gap: spacing.lg },
  card: {
    backgroundColor: '#fff', borderRadius: radius.xl, padding: spacing.lg,
    gap: 10, ...shadows.sm,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  bio: { fontSize: 14, color: colors.textSecondary, lineHeight: 21 },
  highlightRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  highlightIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center',
  },
  highlightText: { fontSize: 14, color: colors.text, fontWeight: '500' },
  section: { gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  stickyBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md, paddingBottom: 28,
    borderTopWidth: 1, borderTopColor: colors.border,
    ...shadows.lg,
  },
});
