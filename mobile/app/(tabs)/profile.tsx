import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  User, Settings, LogOut, Briefcase, ShoppingBag,
  FileText, Star, MapPin, Building2, Plus, ChevronRight,
  Award, CreditCard, Zap,
} from 'lucide-react-native';
import { colors, spacing, radius, shadows } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

const tabs = ['Overview', 'Services', 'Orders', 'RFQs'] as const;
type Tab = typeof tabs[number];

export default function ProfileTab() {
  const [profile, setProfile] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: p } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    setProfile(p);

    if (p?.user_type === 'engineer') {
      const { data: svcs } = await supabase
        .from('services')
        .select('id, title, price, category, active, created_at')
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false });
      setServices(svcs || []);
    }

    const { data: ords } = await supabase
      .from('product_orders')
      .select('*')
      .or(`buyer_id.eq.${user.id},vendor_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(10);
    setOrders(ords || []);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  }

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/(auth)/welcome');
        },
      },
    ]);
  }

  const isEngineer = profile?.user_type === 'engineer';

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Hero */}
        <LinearGradient colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]} style={styles.hero}>
          <SafeAreaView edges={['top']}>
            <View style={styles.heroTop}>
              <Text style={styles.heroLabel}>{isEngineer ? 'Engineer Dashboard' : 'Client Dashboard'}</Text>
              <View style={styles.heroActions}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/settings' as any)}>
                  <Settings size={18} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={handleSignOut}>
                  <LogOut size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Avatar + info */}
            <View style={styles.profileInfo}>
              <View style={styles.avatarWrap}>
                <Image
                  source={{ uri: profile?.avatar_url || `https://api.dicebear.com/7.x/initials/png?seed=${profile?.full_name || 'User'}&backgroundColor=16a34a` }}
                  style={styles.avatar}
                  contentFit="cover"
                />
                {isEngineer && <View style={styles.verifiedBadge}><Star size={10} color="#fff" fill="#fff" /></View>}
              </View>
              <View style={styles.profileMeta}>
                <Text style={styles.name}>{profile?.full_name || 'Your Name'}</Text>
                {profile?.company_name && (
                  <View style={styles.metaRow}>
                    <Building2 size={12} color={colors.primaryPale} />
                    <Text style={styles.metaText}>{profile.company_name}</Text>
                  </View>
                )}
                {profile?.location && (
                  <View style={styles.metaRow}>
                    <MapPin size={12} color={colors.primaryPale} />
                    <Text style={styles.metaText}>{profile.location}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              {(isEngineer
                ? [
                    { label: 'Services', val: services.length },
                    { label: 'Orders', val: orders.length },
                    { label: 'Rating', val: '4.9★' },
                  ]
                : [
                    { label: 'Orders', val: orders.length },
                    { label: 'Tokens', val: profile?.token_balance ?? 0 },
                    { label: 'RFQs', val: '—' },
                  ]
              ).map(({ label, val }) => (
                <View key={label} style={styles.statBox}>
                  <Text style={styles.statVal}>{val}</Text>
                  <Text style={styles.statLabel}>{label}</Text>
                </View>
              ))}
            </View>
          </SafeAreaView>
        </LinearGradient>

        {/* Tab bar */}
        <View style={styles.tabBar}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.content}>
          {/* OVERVIEW */}
          {activeTab === 'Overview' && (
            <View style={styles.section}>
              {/* Bio */}
              {profile?.bio && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>About</Text>
                  <Text style={styles.bioText}>{profile.bio}</Text>
                </View>
              )}

              {/* Quick actions */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Quick Actions</Text>
                <View style={styles.actionList}>
                  {isEngineer ? (
                    <>
                      <QuickAction icon={Plus} label="Add New Service" onPress={() => router.push('/services/create' as any)} />
                      <QuickAction icon={CreditCard} label="Setup Stripe Payouts" onPress={() => {}} />
                      <QuickAction icon={Award} label="View Public Profile" onPress={() => router.push(`/engineer/${profile?.id}` as any)} />
                    </>
                  ) : (
                    <>
                      <QuickAction icon={FileText} label="Post an RFQ" onPress={() => router.push('/(tabs)/rfq' as any)} />
                      <QuickAction icon={Zap} label="Buy Message Tokens" onPress={() => {}} />
                      <QuickAction icon={User} label="Browse Engineers" onPress={() => router.push('/(tabs)/marketplace' as any)} />
                    </>
                  )}
                </View>
              </View>

              {/* Token balance (clients) */}
              {!isEngineer && (
                <View style={[styles.card, styles.tokenCard]}>
                  <View style={styles.tokenLeft}>
                    <Zap size={20} color={colors.accent} />
                    <View>
                      <Text style={styles.tokenTitle}>Message Tokens</Text>
                      <Text style={styles.tokenSub}>Used to send first message</Text>
                    </View>
                  </View>
                  <Text style={styles.tokenBal}>{profile?.token_balance ?? 0}</Text>
                </View>
              )}
            </View>
          )}

          {/* SERVICES (engineers only) */}
          {activeTab === 'Services' && (
            <View style={styles.section}>
              <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/services/create' as any)}>
                <Plus size={16} color="#fff" />
                <Text style={styles.addBtnText}>Add Service</Text>
              </TouchableOpacity>
              {services.map((svc) => (
                <TouchableOpacity
                  key={svc.id}
                  style={styles.svcRow}
                  onPress={() => router.push(`/service/${svc.id}` as any)}
                >
                  <View style={styles.svcLeft}>
                    <View style={[styles.svcDot, { backgroundColor: svc.active ? colors.primary : colors.textMuted }]} />
                    <View>
                      <Text style={styles.svcTitle} numberOfLines={1}>{svc.title}</Text>
                      <Text style={styles.svcCat}>{svc.category}</Text>
                    </View>
                  </View>
                  <View style={styles.svcRight}>
                    <Text style={styles.svcPrice}>${Number(svc.price).toLocaleString()}</Text>
                    <ChevronRight size={14} color={colors.textMuted} />
                  </View>
                </TouchableOpacity>
              ))}
              {services.length === 0 && (
                <Text style={styles.emptyText}>No services yet. Add your first one!</Text>
              )}
            </View>
          )}

          {/* ORDERS */}
          {activeTab === 'Orders' && (
            <View style={styles.section}>
              {orders.length === 0 ? (
                <Text style={styles.emptyText}>No orders yet.</Text>
              ) : (
                orders.map((ord) => (
                  <View key={ord.id} style={styles.orderRow}>
                    <View style={styles.orderLeft}>
                      <ShoppingBag size={18} color={colors.primary} />
                      <View>
                        <Text style={styles.orderId}>Order #{ord.id.slice(0, 8)}</Text>
                        <Text style={styles.orderDate}>
                          {new Date(ord.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.statusBadge, {
                      backgroundColor: ord.status === 'completed' ? '#DCFCE7' : ord.status === 'pending' ? '#FEF9C3' : '#E0F2FE'
                    }]}>
                      <Text style={[styles.statusText, {
                        color: ord.status === 'completed' ? colors.primary : ord.status === 'pending' ? '#92400E' : '#0369A1'
                      }]}>{ord.status}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* RFQs */}
          {activeTab === 'RFQs' && (
            <View style={styles.section}>
              <Text style={styles.emptyText}>RFQ tracking coming soon.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function QuickAction({ icon: Icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={styles.quickIcon}>
        <Icon size={16} color={colors.primary} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
      <ChevronRight size={14} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  hero: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  heroLabel: { fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: '600', letterSpacing: 0.5 },
  heroActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  profileInfo: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: spacing.xl },
  avatarWrap: { position: 'relative' },
  avatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' },
  verifiedBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.gradientMid,
  },
  profileMeta: { flex: 1, gap: 4 },
  name: { fontSize: 20, fontWeight: '800', color: '#fff' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  statsRow: {
    flexDirection: 'row', gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: radius.lg,
    padding: spacing.md,
  },
  statBox: { flex: 1, alignItems: 'center', gap: 2 },
  statVal: { fontSize: 20, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '600' },
  tabBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  tabItemActive: { borderBottomWidth: 2.5, borderBottomColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.primary },
  content: { padding: spacing.lg },
  section: { gap: spacing.md },
  card: {
    backgroundColor: '#fff', borderRadius: radius.xl,
    padding: spacing.lg, gap: 12, ...shadows.sm,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  bioText: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  actionList: { gap: 4 },
  quickAction: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  quickIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center',
  },
  quickLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  tokenCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFBEB',
  },
  tokenLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tokenTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  tokenSub: { fontSize: 12, color: colors.textMuted },
  tokenBal: { fontSize: 28, fontWeight: '800', color: colors.accent },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: 12, paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  addBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  svcRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: radius.lg,
    padding: spacing.md, ...shadows.sm,
  },
  svcLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  svcDot: { width: 10, height: 10, borderRadius: 5 },
  svcTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  svcCat: { fontSize: 12, color: colors.textMuted },
  svcRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  svcPrice: { fontSize: 15, fontWeight: '700', color: colors.primary },
  orderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: radius.lg,
    padding: spacing.md, ...shadows.sm,
  },
  orderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  orderId: { fontSize: 14, fontWeight: '600', color: colors.text },
  orderDate: { fontSize: 12, color: colors.textMuted },
  statusBadge: { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 5 },
  statusText: { fontSize: 12, fontWeight: '700' },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.xl },
});
