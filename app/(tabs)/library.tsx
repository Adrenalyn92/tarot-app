import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Platform, SafeAreaView, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, SHADOWS, FONTS } from '../../src/theme';
import TarotCardArt from '../../src/components/TarotCardArt';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

type CardType = {
  id: string; number: number; name_de: string; type: string;
  suit: string | null; suit_de: string | null;
  meaning_upright: string; meaning_reversed: string;
  image_short: string; icon: string; has_custom_image?: boolean;
};

const FILTERS = [
  { key: 'all', label: 'Alle', icon: 'apps-outline' },
  { key: 'major', label: 'Große Arkana', icon: 'star-outline' },
  { key: 'wands', label: 'Stäbe', icon: 'flame-outline' },
  { key: 'cups', label: 'Kelche', icon: 'water-outline' },
  { key: 'swords', label: 'Schwerter', icon: 'flash-outline' },
  { key: 'pentacles', label: 'Münzen', icon: 'ellipse-outline' },
];

export default function LibraryScreen() {
  const router = useRouter();
  const [cards, setCards] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadCards(); }, []);

  const loadCards = async () => {
    try {
      const res = await fetch(`${API_URL}/api/cards`);
      const data = await res.json();
      setCards(data);
    } catch {} finally { setLoading(false); }
  };

  const filteredCards = cards.filter(c => {
    if (filter === 'all') return true;
    if (filter === 'major') return c.type === 'major';
    return c.suit === filter;
  });

  const renderCard = useCallback(({ item }: { item: CardType }) => (
    <TouchableOpacity
      testID={`card-${item.id}`}
      style={styles.gridCard}
      onPress={() => router.push(`/card/${item.id}`)}
      activeOpacity={0.7}
    >
      <TarotCardArt card={item} size="small" />
      <Text style={styles.gridCardName} numberOfLines={2}>{item.name_de}</Text>
    </TouchableOpacity>
  ), []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Bibliothek</Text>
        <Text style={styles.countText}>{filteredCards.length} Karten</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            testID={`filter-${f.key}`}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Ionicons name={f.icon as any} size={14} color={filter === f.key ? COLORS.background : COLORS.textSecondary} />
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={COLORS.accent} size="large" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={filteredCards}
          renderItem={renderCard}
          keyExtractor={item => item.id}
          numColumns={3}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingHorizontal: SPACING.md, paddingTop: SPACING.xl,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
  },
  title: {
    fontSize: 28, color: COLORS.accent, fontWeight: '700',
    fontFamily: FONTS.cinzelBold,
  },
  countText: { color: COLORS.textSecondary, fontSize: 13 },
  filterBar: { maxHeight: 50, marginTop: SPACING.md },
  filterContent: { paddingHorizontal: SPACING.md, gap: SPACING.sm },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  filterChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  filterText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: COLORS.background },
  grid: { paddingHorizontal: SPACING.sm, paddingTop: SPACING.md, paddingBottom: 40 },
  row: { justifyContent: 'flex-start', gap: SPACING.sm },
  gridCard: {
    alignItems: 'center', marginBottom: SPACING.md, width: '31%',
  },
  gridCardName: {
    color: COLORS.text, fontSize: 11, marginTop: SPACING.xs,
    textAlign: 'center', fontFamily: FONTS.cinzelBold,
  },
});
