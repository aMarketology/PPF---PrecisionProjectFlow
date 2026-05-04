import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Star, MapPin, MessageSquare, Briefcase } from 'lucide-react-native';
import { colors, radius, shadows, spacing } from '@/lib/theme';

interface EngineerCardProps {
  id: string;
  name: string;
  company?: string | null;
  bio?: string | null;
  location?: string | null;
  avatar?: string | null;
  category?: string;
  serviceCount?: number;
  rating?: number;
  onPress: () => void;
  onMessage?: () => void;
}

export default function EngineerCard({
  name,
  company,
  bio,
  location,
  avatar,
  category,
  serviceCount = 0,
  rating = 4.9,
  onPress,
  onMessage,
}: EngineerCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.header}>
        {/* Avatar + verified badge */}
        <View style={styles.avatarWrap}>
          <Image
            source={{ uri: avatar || `https://api.dicebear.com/7.x/initials/png?seed=${name}&backgroundColor=16a34a` }}
            style={styles.avatar}
            contentFit="cover"
          />
          <View style={styles.verifiedDot} />
        </View>

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          {company && <Text style={styles.company} numberOfLines={1}>{company}</Text>}
          {location && (
            <View style={styles.locationRow}>
              <MapPin size={11} color={colors.textMuted} />
              <Text style={styles.locationText}>{location}</Text>
            </View>
          )}
        </View>

        {/* Rating */}
        <View style={styles.ratingBox}>
          <Star size={14} color={colors.accent} fill={colors.accent} />
          <Text style={styles.ratingNum}>{rating.toFixed(1)}</Text>
        </View>
      </View>

      {bio && (
        <Text style={styles.bio} numberOfLines={2}>{bio}</Text>
      )}

      {/* Footer stats */}
      <View style={styles.footer}>
        {category && (
          <View style={styles.pill}>
            <Text style={styles.pillText}>{category}</Text>
          </View>
        )}
        <View style={styles.stat}>
          <Briefcase size={12} color={colors.primary} />
          <Text style={styles.statText}>{serviceCount} service{serviceCount !== 1 ? 's' : ''}</Text>
        </View>

        {onMessage && (
          <TouchableOpacity style={styles.msgBtn} onPress={onMessage} activeOpacity={0.8}>
            <MessageSquare size={14} color="#fff" />
            <Text style={styles.msgText}>Message</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.md,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: colors.primaryPale,
  },
  verifiedDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#fff',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  company: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  locationText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  ratingBox: {
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFF9EB',
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ratingNum: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.accentDark,
  },
  bio: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pill: {
    backgroundColor: colors.background,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.primaryPale,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  statText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  msgBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  msgText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
});
