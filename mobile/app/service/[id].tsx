import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ArrowLeft, Star, MapPin, Clock, Award, CheckCircle2,
  MessageSquare, ShoppingCart, Share2, Globe,
} from 'lucide-react-native';
import { colors, spacing, radius, shadows } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import Button from '@/components/Button';

const categoryImages: Record<string, string> = {
  'Structural Engineering': 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=500&fit=crop',
  'Mechanical Engineering': 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&h=500&fit=crop',
  'Default': 'https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=800&h=500&fit=crop',
};

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadService();
  }, [id]);

  async function loadService() {
    const { data } = await supabase
      .from('services')
      .select(`*, provider:profiles!services_provider_id_fkey(id, full_name, bio, location, avatar_url, company_name, email)`)
      .eq('id', id)
      .single();
    setService(data);
    setLoading(false);
  }

  async function handleMessage() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to send a message.');
      return;
    }
    router.push(`/conversation/new?with=${service.provider.id}` as any);
  }

  if (loading || !service) return null;

  const provider = service.provider;
  const image = service.images?.[0] || categoryImages[service.category] || categoryImages['Default'];
  const tags: string[] = service.tags || [];
  const certs: string[] = service.certifications || [];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero image */}
        <View style={styles.imageWrap}>
          <Image source={{ uri: image }} style={styles.heroImage} contentFit="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(5,46,22,0.7)']}
            style={styles.imageOverlay}
          />
          <SafeAreaView edges={['top']} style={styles.navRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <ArrowLeft size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.backBtn}>
              <Share2 size={18} color="#fff" />
            </TouchableOpacity>
          </SafeAreaView>
          <View style={styles.imageMeta}>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>{service.category}</Text>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          {/* Title + rating */}
          <View style={styles.titleRow}>
            <Text style={styles.title}>{service.title}</Text>
            <View style={styles.ratingPill}>
              <Star size={13} color={colors.accent} fill={colors.accent} />
              <Text style={styles.ratingText}>4.9</Text>
            </View>
          </View>

          {/* Price + meta */}
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.priceLabel}>Starting at</Text>
              <Text style={styles.price}>${Number(service.price).toLocaleString()}</Text>
            </View>
            <View style={styles.metaCol}>
              {service.delivery_time && (
                <View style={styles.metaItem}>
                  <Clock size={13} color={colors.primary} />
                  <Text style={styles.metaText}>{service.delivery_time}</Text>
                </View>
              )}
              {service.service_area && (
                <View style={styles.metaItem}>
                  <Globe size={13} color={colors.primary} />
                  <Text style={styles.metaText}>{service.service_area}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Provider card */}
          <TouchableOpacity
            style={styles.providerCard}
            onPress={() => router.push(`/engineer/${provider.id}` as any)}
          >
            <Image
              source={{ uri: provider.avatar_url || `https://api.dicebear.com/7.x/initials/png?seed=${provider.full_name}` }}
              style={styles.providerAvatar}
              contentFit="cover"
            />
            <View style={styles.providerInfo}>
              <Text style={styles.providerName}>{provider.full_name}</Text>
              {provider.company_name && <Text style={styles.providerCompany}>{provider.company_name}</Text>}
              {provider.location && (
                <View style={styles.metaItem}>
                  <MapPin size={11} color={colors.textMuted} />
                  <Text style={styles.metaTextSm}>{provider.location}</Text>
                </View>
              )}
            </View>
            <View style={styles.verifiedPill}>
              <CheckCircle2 size={12} color={colors.primary} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          </TouchableOpacity>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this service</Text>
            <Text style={styles.description}>{service.description}</Text>
          </View>

          {/* Tags */}
          {tags.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Skills & Expertise</Text>
              <View style={styles.tagWrap}>
                {tags.map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Certifications */}
          {certs.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Certifications</Text>
              <View style={styles.certList}>
                {certs.map((cert) => (
                  <View key={cert} style={styles.certRow}>
                    <Award size={14} color={colors.accent} />
                    <Text style={styles.certText}>{cert}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* What's included */}
          <View style={[styles.section, styles.includedBox]}>
            <Text style={styles.includedTitle}>✅ What's Included</Text>
            {[
              'Professional consultation & scoping',
              'Detailed project proposal',
              'Regular progress updates',
              'Final deliverable documentation',
              'Post-project support (14 days)',
            ].map((item) => (
              <View key={item} style={styles.includedRow}>
                <CheckCircle2 size={14} color={colors.primary} />
                <Text style={styles.includedText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={styles.stickyBar}>
        <TouchableOpacity style={styles.msgBtn} onPress={handleMessage}>
          <MessageSquare size={18} color={colors.primary} />
          <Text style={styles.msgBtnText}>Message</Text>
        </TouchableOpacity>
        <Button
          title={`Hire — $${Number(service.price).toLocaleString()}`}
          onPress={() => Alert.alert('Checkout', 'Stripe checkout coming in next release.')}
          variant="accent"
          style={styles.hireBtn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  imageWrap: { position: 'relative', height: 280 },
  heroImage: { width: '100%', height: '100%' },
  imageOverlay: { ...StyleSheet.absoluteFillObject },
  navRow: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: 8,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(5,46,22,0.6)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  imageMeta: {
    position: 'absolute', bottom: 16, left: spacing.lg,
  },
  categoryPill: {
    backgroundColor: colors.primary, borderRadius: radius.full,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  categoryText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  body: { padding: spacing.lg, gap: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: { flex: 1, fontSize: 22, fontWeight: '800', color: colors.text, lineHeight: 30 },
  ratingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFF9EB', borderRadius: radius.md,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  ratingText: { fontSize: 14, fontWeight: '800', color: colors.accentDark },
  priceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: radius.xl, padding: spacing.md,
    ...shadows.sm,
  },
  priceLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  price: { fontSize: 28, fontWeight: '800', color: colors.primary },
  metaCol: { gap: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  metaTextSm: { fontSize: 11, color: colors.textMuted },
  providerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: radius.xl, padding: spacing.md,
    ...shadows.sm,
  },
  providerAvatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: colors.primaryPale },
  providerInfo: { flex: 1, gap: 2 },
  providerName: { fontSize: 15, fontWeight: '700', color: colors.text },
  providerCompany: { fontSize: 12, color: colors.textSecondary },
  verifiedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.background, borderRadius: radius.md,
    paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: colors.primaryPale,
  },
  verifiedText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  section: { gap: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  description: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    backgroundColor: colors.background, borderRadius: radius.full,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: colors.primaryPale,
  },
  tagText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  certList: { gap: 8 },
  certRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  certText: { fontSize: 13, color: colors.text, fontWeight: '500' },
  includedBox: {
    backgroundColor: '#ECFDF5', borderRadius: radius.xl,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.primaryPale,
  },
  includedTitle: { fontSize: 16, fontWeight: '700', color: colors.primaryDark },
  includedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  includedText: { fontSize: 13, color: colors.primaryMid, flex: 1 },
  stickyBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: 12, alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    paddingBottom: 28,
    borderTopWidth: 1, borderTopColor: colors.border,
    ...shadows.lg,
  },
  msgBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: colors.primary,
    borderRadius: radius.lg, paddingVertical: 14, paddingHorizontal: 20,
  },
  msgBtnText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  hireBtn: { flex: 1 },
});
