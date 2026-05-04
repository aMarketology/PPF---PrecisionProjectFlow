import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ScrollView, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Search, SlidersHorizontal, X } from 'lucide-react-native';
import { colors, spacing, radius } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import ServiceCard from '@/components/ServiceCard';

const categories = [
  'All', 'Structural Engineering', 'Mechanical Engineering',
  'Electrical Engineering', 'Civil Engineering', 'Software Engineering',
  'Consulting Services', 'Design Services', 'Analysis & Testing',
  'Project Management',
];

const sortOptions = [
  { label: 'Newest', value: 'newest' },
  { label: 'Price: Low', value: 'price_asc' },
  { label: 'Price: High', value: 'price_desc' },
];

export default function MarketplaceTab() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('newest');
  const [showSort, setShowSort] = useState(false);

  useEffect(() => { fetchServices(); }, []);

  async function fetchServices() {
    const { data } = await supabase
      .from('services')
      .select(`id, title, description, price, category, tags, images, delivery_time, service_area, certifications, active, created_at,
        provider:profiles!services_provider_id_fkey(id, full_name, location, avatar_url)`)
      .eq('active', true)
      .order('created_at', { ascending: false });
    setServices(data || []);
    setLoading(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await fetchServices();
    setRefreshing(false);
  }

  const filtered = useMemo(() => {
    let out = [...services];
    if (search) {
      const q = search.toLowerCase();
      out = out.filter((s) =>
        s.title?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q)
      );
    }
    if (category !== 'All') out = out.filter((s) => s.category === category);
    if (sort === 'price_asc') out.sort((a, b) => a.price - b.price);
    if (sort === 'price_desc') out.sort((a, b) => b.price - a.price);
    return out;
  }, [services, search, category, sort]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={[colors.gradientStart, colors.gradientMid]} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <Text style={styles.title}>Marketplace</Text>
          <Text style={styles.subtitle}>{services.length} engineering services</Text>

          {/* Search */}
          <View style={styles.searchRow}>
            <View style={styles.searchWrap}>
              <Search size={16} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search services..."
                placeholderTextColor={colors.textMuted}
                value={search}
                onChangeText={setSearch}
              />
              {search ? (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <X size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>
            <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSort(!showSort)}>
              <SlidersHorizontal size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Sort dropdown */}
          {showSort && (
            <View style={styles.sortMenu}>
              {sortOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.sortOpt, sort === opt.value && styles.sortOptActive]}
                  onPress={() => { setSort(opt.value); setShowSort(false); }}
                >
                  <Text style={[styles.sortOptText, sort === opt.value && styles.sortOptTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </SafeAreaView>
      </LinearGradient>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipScroll}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, category === cat && styles.chipActive]}
            onPress={() => setCategory(cat)}
          >
            <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Results count */}
      <View style={styles.resultRow}>
        <Text style={styles.resultCount}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
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
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No services found</Text>
              <Text style={styles.emptyText}>Try adjusting your filters</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: spacing.md },
  searchRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  searchWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: radius.lg,
    paddingHorizontal: spacing.md, height: 46,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },
  sortBtn: {
    width: 46, height: 46, borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  sortMenu: {
    backgroundColor: '#fff', borderRadius: radius.lg, marginTop: spacing.sm,
    padding: spacing.xs, gap: 2,
  },
  sortOpt: { paddingVertical: 10, paddingHorizontal: spacing.md, borderRadius: radius.md },
  sortOptActive: { backgroundColor: colors.background },
  sortOptText: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  sortOptTextActive: { color: colors.primary, fontWeight: '700' },
  chipScroll: { backgroundColor: colors.background },
  chips: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: '#fff' },
  resultRow: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  resultCount: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 14, color: colors.textMuted },
});
