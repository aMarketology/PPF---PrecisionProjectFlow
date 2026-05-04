import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { MessageSquare, Check, CheckCheck, Clock, Search } from 'lucide-react-native';
import { colors, spacing, radius, shadows } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';

interface Conversation {
  id: string;
  participant_one_id: string;
  participant_two_id: string;
  last_message_at: string;
  other_user: {
    id: string;
    full_name: string;
    avatar_url?: string;
    user_type: string;
  };
  last_message?: { content: string; sender_id: string };
  unread_count: number;
}

export default function MessagesTab() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => { loadConversations(); }, []);

  async function loadConversations() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setCurrentUserId(user.id);

    const { data: convos } = await supabase
      .from('user_conversations')
      .select('*')
      .or(`participant_one_id.eq.${user.id},participant_two_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false });

    if (!convos || convos.length === 0) { setLoading(false); return; }

    // Fetch other user profiles
    const enriched = await Promise.all(
      convos.map(async (c) => {
        const otherId = c.participant_one_id === user.id ? c.participant_two_id : c.participant_one_id;
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, user_type')
          .eq('id', otherId)
          .single();

        // Last message
        const { data: msgs } = await supabase
          .from('user_messages')
          .select('content, sender_id, created_at')
          .eq('conversation_id', c.id)
          .order('created_at', { ascending: false })
          .limit(1);

        // Unread count
        const { count } = await supabase
          .from('user_messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', c.id)
          .eq('is_read', false)
          .neq('sender_id', user.id);

        return {
          ...c,
          other_user: profile || { id: otherId, full_name: 'Unknown', user_type: 'client' },
          last_message: msgs?.[0],
          unread_count: count || 0,
        };
      })
    );

    setConversations(enriched as Conversation[]);
    setLoading(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  }

  function renderConversation({ item }: { item: Conversation }) {
    const isUnread = item.unread_count > 0;
    const isMine = item.last_message?.sender_id === currentUserId;
    const timeAgo = item.last_message_at
      ? formatDistanceToNow(new Date(item.last_message_at), { addSuffix: true })
      : '';

    return (
      <TouchableOpacity
        style={[styles.convRow, isUnread && styles.convRowUnread]}
        onPress={() => router.push(`/conversation/${item.id}` as any)}
        activeOpacity={0.8}
      >
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <Image
            source={{ uri: item.other_user.avatar_url || `https://api.dicebear.com/7.x/initials/png?seed=${item.other_user.full_name}` }}
            style={styles.avatar}
            contentFit="cover"
          />
          <View style={[styles.onlineDot, { backgroundColor: colors.primary }]} />
        </View>

        {/* Content */}
        <View style={styles.convContent}>
          <View style={styles.convTopRow}>
            <Text style={[styles.convName, isUnread && styles.convNameBold]}>
              {item.other_user.full_name}
            </Text>
            <Text style={styles.convTime}>{timeAgo}</Text>
          </View>
          <View style={styles.convMsgRow}>
            {isMine && <CheckCheck size={12} color={colors.primary} />}
            <Text style={[styles.convMsg, isUnread && styles.convMsgBold]} numberOfLines={1}>
              {item.last_message?.content || 'Start a conversation'}
            </Text>
            {isUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadNum}>{item.unread_count}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.gradientStart, colors.gradientMid]} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Messages</Text>
            <TouchableOpacity style={styles.editBtn}>
              <Search size={18} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>{conversations.length} conversations</Text>
        </SafeAreaView>
      </LinearGradient>

      <FlatList
        data={conversations}
        keyExtractor={(c) => c.id}
        renderItem={renderConversation}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <MessageSquare size={40} color={colors.primaryPale} />
              </View>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptyText}>
                Browse the marketplace and message an engineer to get started.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  editBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  list: { paddingBottom: 100 },
  convRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: 14, gap: 12,
  },
  convRowUnread: { backgroundColor: '#F0FDF4' },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 50, height: 50, borderRadius: 25,
    borderWidth: 2, borderColor: colors.primaryPale,
  },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 12, height: 12, borderRadius: 6,
    borderWidth: 2, borderColor: '#fff',
  },
  convContent: { flex: 1, gap: 4 },
  convTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convName: { fontSize: 15, fontWeight: '500', color: colors.text },
  convNameBold: { fontWeight: '700' },
  convTime: { fontSize: 11, color: colors.textMuted },
  convMsgRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  convMsg: { flex: 1, fontSize: 13, color: colors.textSecondary },
  convMsgBold: { fontWeight: '600', color: colors.text },
  unreadBadge: {
    backgroundColor: colors.primary, borderRadius: 10,
    minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadNum: { fontSize: 11, fontWeight: '700', color: '#fff' },
  separator: { height: 1, backgroundColor: colors.border, marginLeft: 74 },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: spacing.xl, gap: 12 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
