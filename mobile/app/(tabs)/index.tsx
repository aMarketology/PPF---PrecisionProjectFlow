import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Bell, Search, TrendingUp, Zap, Award, MessageSquare, Heart } from 'lucide-react-native';
import { colors, spacing, radius, shadows } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import ServiceCard from '@/components/ServiceCard';
import EngineerCard from '@/components/EngineerCard';

interface FeedItem {
  id: string;
  type: 'service_listed' | 'rfq_posted' | 'milestone';
  user_id: string;
  content: string;
  metadata: any;
  likes_count: number;
  created_at: string;
  profile?: { full_name: string; avatar_url?: string; company_name?: string };
}

const categories = ['All', 'Mechanical', 'Electrical', 'Civil', 'Software', 'Consulting'];

export default function FeedTab() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setUserProfile(profile);
    }

    // Load recent services as "feed" content
    const { data: svcData } = await supabase
      .from('services')
      .select(`id, title, description, price, category, images, delivery_time, service_area, active, created_at,
        provider:profiles!services_provider_id_fkey(id, full_name, location, avatar_url)`)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(20);

    setServices(svcData || []);
    setLoading(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }

  const filtered = activeCategory === 'All'
    ? services
    : services.filter((s) => s.category?.toLowerCase().includes(activeCategory.toLowerCase()));

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientMid]}
        style={styles.header}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greeting}>
                {userProfile ? `Hey, ${userProfile.full_name?.split(' ')[0]} 👋` : 'Welcome back 👋'}
              </Text>
              <Text style={styles.headerSub}>Discover engineering talent</Text>
            </View>
            <TouchableOpacity style={styles.bellBtn}>
              <Bell size={20} color="#fff" />
              <View style={styles.bellDot} />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={styles.searchWrap}>
            <Search size={16} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search services, engineers..."
              placeholderTextColor={colors.textMuted}
              onFocus={() => router.push('/(tabs)/marketplace')}
            />
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Category chips */}
      <FlatList
        horizontal
        data={categories}
        keyExtractor={(c) => c}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.chip, activeCategory === item && styles.chipActive]}
            onPress={() => setActiveCategory(item)}
          >
            <Text style={[styles.chipText, activeCategory === item && styles.chipTextActive]}>
              {item}
            </Text>
          </TouchableOpacity>
        )}
        style={styles.chipList}
      />

      {/* Stats strip */}
      <View style={styles.statsStrip}>
        {[
          { icon: TrendingUp, label: 'Active RFQs', val: '24' },
          { icon: Zap, label: 'New this week', val: `${services.length}` },
          { icon: Award, label: 'Verified pros', val: '142' },
        ].map(({ icon: Icon, label, val }) => (
          <View key={label} style={styles.statCard}>
            <Icon size={16} color={colors.primary} />
            <Text style={styles.statVal}>{val}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Feed */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>Recently Listed</Text>
        }
        renderItem={({ item }) => (
          <ServiceCard
            id={item.id}
            title={item.title}
            description={item.description}
            price={item.price}
            category={item.category}
            deliveryTime={item.delivery_time}
            imageUrl={item.images?.[0]}
            providerName={(item.provider as any)?.full_name}
            providerAvatar={(item.provider as any)?.avatar_url}
            location={(item.provider as any)?.location}
            onPress={() => router.push(`/service/${item.id}` as any)}
          />
        )}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No services yet — check back soon!</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  greeting: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  bellBtn: { position: 'relative', padding: 8 },
  bellDot: {
    position: 'absolute', top: 6, right: 6,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.accent, borderWidth: 1.5, borderColor: colors.gradientMid,
  },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: radius.lg,
    paddingHorizontal: spacing.md, height: 46,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },
  chipList: { backgroundColor: colors.background },
  chips: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: 8 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: '#fff' },
  statsStrip: {
    flexDirection: 'row', gap: spacing.sm,
    paddingHorizontal: spacing.lg, marginBottom: spacing.sm,
  },
  statCard: {
    flex: 1, alignItems: 'center', gap: 4,
    backgroundColor: '#fff', borderRadius: radius.lg,
    paddingVertical: 12, borderWidth: 1, borderColor: colors.border,
    ...shadows.sm,
  },
  statVal: { fontSize: 17, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '600', textAlign: 'center' },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyText: { fontSize: 15, color: colors.textMuted },
});
