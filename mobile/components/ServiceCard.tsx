import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Star, MapPin, Clock, ChevronRight } from 'lucide-react-native';
import { colors, radius, shadows, typography, spacing } from '@/lib/theme';

interface ServiceCardProps {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  deliveryTime?: string | null;
  imageUrl?: string | null;
  providerName?: string;
  providerAvatar?: string | null;
  location?: string | null;
  rating?: number;
  onPress: () => void;
}

const categoryImages: Record<string, string> = {
  'Structural Engineering': 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&h=400&fit=crop',
  'Mechanical Engineering': 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&h=400&fit=crop',
  'Electrical Engineering': 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=600&h=400&fit=crop',
  'Civil Engineering': 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&h=400&fit=crop',
  'Software Engineering': 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&h=400&fit=crop',
  'Consulting Services': 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&h=400&fit=crop',
  'Default': 'https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=600&h=400&fit=crop',
};

export default function ServiceCard({
  title,
  description,
  price,
  category,
  deliveryTime,
  imageUrl,
  providerName,
  providerAvatar,
  location,
  rating = 4.8,
  onPress,
}: ServiceCardProps) {
  const image = imageUrl || categoryImages[category] || categoryImages['Default'];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      {/* Hero image */}
      <Image source={{ uri: image }} style={styles.image} contentFit="cover" />

      {/* Category pill */}
      <View style={styles.categoryPill}>
        <Text style={styles.categoryText}>{category}</Text>
      </View>

      <View style={styles.body}>
        {/* Provider row */}
        <View style={styles.providerRow}>
          <Image
            source={{ uri: providerAvatar || `https://api.dicebear.com/7.x/initials/png?seed=${providerName}` }}
            style={styles.avatar}
            contentFit="cover"
          />
          <Text style={styles.providerName} numberOfLines={1}>{providerName || 'Engineer'}</Text>
          <View style={styles.ratingPill}>
            <Star size={10} color={colors.accent} fill={colors.accent} />
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        <Text style={styles.description} numberOfLines={2}>{description}</Text>

        {/* Meta row */}
        <View style={styles.meta}>
          {location && (
            <View style={styles.metaItem}>
              <MapPin size={12} color={colors.textMuted} />
              <Text style={styles.metaText}>{location}</Text>
            </View>
          )}
          {deliveryTime && (
            <View style={styles.metaItem}>
              <Clock size={12} color={colors.textMuted} />
              <Text style={styles.metaText}>{deliveryTime}</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View>
            <Text style={styles.priceLabel}>Starting at</Text>
            <Text style={styles.price}>${price.toLocaleString()}</Text>
          </View>
          <View style={styles.cta}>
            <Text style={styles.ctaText}>View</Text>
            <ChevronRight size={14} color={colors.primary} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...shadows.md,
  },
  image: {
    width: '100%',
    height: 180,
  },
  categoryPill: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  body: {
    padding: spacing.md,
    gap: 6,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.primaryPale,
  },
  providerName: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFF9EB',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accentDark,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 22,
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  meta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  priceLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  price: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.primaryPale,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
});
