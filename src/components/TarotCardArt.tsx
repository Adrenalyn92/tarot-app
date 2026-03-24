import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SUIT_COLORS, FONTS } from '../theme';
import { getCardImage } from '../imageCache';

type TarotCardArtProps = {
  card: {
    id?: string;
    name_de: string;
    type: string;
    suit?: string | null;
    number: number;
    icon: string;
    has_custom_image?: boolean;
  };
  size?: 'small' | 'medium' | 'large';
  isBack?: boolean;
  customImageBase64?: string | null;
};

const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];

export default function TarotCardArt({ card, size = 'medium', isBack = false, customImageBase64 }: TarotCardArtProps) {
  const [loadedImage, setLoadedImage] = useState<string | null>(customImageBase64 || null);
  const [imageLoading, setImageLoading] = useState(false);

  const dimensions = size === 'small' ? { w: 100, h: 150 } : size === 'medium' ? { w: 140, h: 210 } : { w: 200, h: 300 };
  const iconSize = size === 'small' ? 28 : size === 'medium' ? 40 : 56;
  const fontSize = size === 'small' ? 10 : size === 'medium' ? 12 : 16;
  const numSize = size === 'small' ? 14 : size === 'medium' ? 18 : 24;

  useEffect(() => {
    if (customImageBase64) {
      setLoadedImage(customImageBase64);
      return;
    }
    if (card.has_custom_image && card.id && !loadedImage) {
      setImageLoading(true);
      getCardImage(card.id).then(img => {
        if (img) setLoadedImage(img);
        setImageLoading(false);
      });
    }
  }, [card.id, card.has_custom_image, customImageBase64]);

  const bgColor = card.type === 'major'
    ? SUIT_COLORS.major
    : SUIT_COLORS[card.suit || 'major'];

  if (isBack) {
    return (
      <View style={[styles.card, { width: dimensions.w, height: dimensions.h, backgroundColor: COLORS.surface }]}>
        <View style={styles.innerBorder}>
          <Ionicons name="star" size={iconSize} color={COLORS.primary} />
          <View style={styles.starRow}>
            <Ionicons name="star-outline" size={iconSize * 0.5} color={COLORS.primaryDim} />
            <Ionicons name="star-outline" size={iconSize * 0.5} color={COLORS.primaryDim} />
          </View>
          <Text style={[styles.backText, { fontSize: fontSize - 1 }]}>DIAROT</Text>
          <Text style={[styles.backText, { fontSize: fontSize + 1 }]}>TAROT</Text>
        </View>
      </View>
    );
  }

  // Show custom image if available (from prop or self-loaded)
  if (loadedImage) {
    return (
      <View style={[styles.card, { width: dimensions.w, height: dimensions.h, backgroundColor: COLORS.surface }]}>
        <Image
          source={{ uri: loadedImage }}
          style={styles.customImage}
          resizeMode="cover"
        />
      </View>
    );
  }

  // Show loading indicator while fetching image
  if (imageLoading) {
    return (
      <View style={[styles.card, { width: dimensions.w, height: dimensions.h, backgroundColor: bgColor }]}>
        <View style={[styles.innerBorder, { justifyContent: 'center' }]}>
          <ActivityIndicator color={COLORS.accent} size="small" />
        </View>
      </View>
    );
  }

  const numberDisplay = card.type === 'major' && card.number <= 21
    ? ROMAN[card.number]
    : card.number <= 10 ? String(card.number) : '';

  return (
    <View style={[styles.card, { width: dimensions.w, height: dimensions.h, backgroundColor: bgColor }]}>
      <View style={styles.innerBorder}>
        <Text style={[styles.numberText, { fontSize: numSize }]}>{numberDisplay}</Text>
        <View style={styles.iconContainer}>
          <Ionicons name={card.icon as any} size={iconSize} color={COLORS.accent} />
        </View>
        <Text style={[styles.nameText, { fontSize }]} numberOfLines={2}>
          {card.name_de}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.borderGold,
    padding: 3,
    overflow: 'hidden',
  },
  innerBorder: {
    flex: 1,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  customImage: {
    flex: 1,
    width: '100%',
    borderRadius: 7,
  },
  numberText: {
    color: COLORS.primary,
    fontFamily: FONTS.cinzelBold,
    fontWeight: '700',
    marginBottom: 4,
  },
  iconContainer: {
    marginVertical: 8,
  },
  nameText: {
    color: COLORS.text,
    fontFamily: FONTS.cinzelBold,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  starRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  backText: {
    color: COLORS.primary,
    fontFamily: FONTS.cinzelBold,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 3,
  },
});
