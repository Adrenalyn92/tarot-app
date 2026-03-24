import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView,
  ActivityIndicator, Platform, SafeAreaView, Image, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, SHADOWS, FONTS } from '../../src/theme';
import TarotCardArt from '../../src/components/TarotCardArt';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const LOGO_URL = 'https://customer-assets.emergentagent.com/job_mystische-karten/artifacts/bvq1etbl_1000176305.png';
const MOCKUP_URL = 'https://customer-assets.emergentagent.com/job_mystische-karten/artifacts/pprauem7_1000178241.png';
const { width: SCREEN_W } = Dimensions.get('window');

type CardType = {
  id: string; number: number; name_de: string; type: string;
  suit: string | null; suit_de: string | null;
  meaning_upright: string; meaning_reversed: string;
  description: string; image_short: string; icon: string;
  has_custom_image?: boolean;
};
type DailyDraw = { card: CardType; date_str: string; is_reversed: boolean };

export default function HomeScreen() {
  const router = useRouter();
  const [dailyDraw, setDailyDraw] = useState<DailyDraw | null>(null);
  const [loading, setLoading] = useState(false);
  const [drawn, setDrawn] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { checkExistingDraw(); }, []);

  const checkExistingDraw = async () => {
    try {
      const res = await fetch(`${API_URL}/api/daily-draw`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setDailyDraw(data);
        setDrawn(true);
        flipAnim.setValue(1);
      }
    } catch {}
  };

  const drawCard = async () => {
    if (drawn) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/daily-draw`, { method: 'POST' });
      const data = await res.json();
      setDailyDraw(data);
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.08, duration: 300, useNativeDriver: true }),
        Animated.timing(flipAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
      ]).start(() => setDrawn(true));
    } catch {} finally { setLoading(false); }
  };

  const backOpacity = flipAnim.interpolate({ inputRange: [0, 0.4, 0.5, 1], outputRange: [1, 1, 0, 0] });
  const frontOpacity = flipAnim.interpolate({ inputRange: [0, 0.5, 0.6, 1], outputRange: [0, 0, 1, 1] });
  const glowOpacityVal = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Logo Section */}
        <View style={styles.logoSection}>
          <Image
            source={{ uri: LOGO_URL }}
            style={styles.logo}
            resizeMode="contain"
            testID="diarot-logo"
          />
        </View>

        {/* Deck Name */}
        <View style={styles.deckNameSection}>
          <View style={styles.deckNameDivider} />
          <Text style={styles.deckName}>FACETS</Text>
          <Text style={styles.deckSubtitle}>Where the Light Changes</Text>
          <View style={styles.deckNameDivider} />
        </View>

        {/* Mockup Image */}
        <View style={styles.mockupSection}>
          <Image
            source={{ uri: MOCKUP_URL }}
            style={styles.mockupImage}
            resizeMode="contain"
            testID="deck-mockup"
          />
        </View>

        {/* Gold Divider */}
        <View style={styles.sectionDivider}>
          <View style={styles.dividerLine} />
          <Ionicons name="diamond-outline" size={16} color={COLORS.accent} />
          <View style={styles.dividerLine} />
        </View>

        {/* Daily Card Section */}
        <View style={styles.dailySection}>
          <Text style={styles.sectionTitle}>Deine Tageskarte</Text>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>

          <TouchableOpacity
            testID="daily-draw-button"
            onPress={drawCard}
            activeOpacity={0.8}
            disabled={drawn || loading}
            style={styles.cardWrapper}
          >
            <Animated.View style={[styles.cardContainer, { transform: [{ scale: scaleAnim }] }]}>
              <Animated.View style={[styles.glowOverlay, { opacity: glowOpacityVal }]} />
              <Animated.View style={[styles.cardFace, { opacity: backOpacity }]}>
                {dailyDraw?.card ? (
                  <TarotCardArt card={dailyDraw.card} size="large" isBack />
                ) : (
                  <TarotCardArt card={{ name_de: '', type: 'major', number: 0, icon: 'star-outline', suit: null }} size="large" isBack />
                )}
              </Animated.View>
              <Animated.View style={[styles.cardFace, styles.cardFront, { opacity: frontOpacity }]}>
                {dailyDraw?.card && (
                  <TarotCardArt card={dailyDraw.card} size="large" />
                )}
              </Animated.View>
            </Animated.View>
          </TouchableOpacity>

          {loading && <ActivityIndicator color={COLORS.accent} style={{ marginTop: 16 }} />}
          {!drawn && !loading && (
            <Text style={styles.drawHint}>Tippe auf die Karte, um sie zu ziehen</Text>
          )}
          {drawn && dailyDraw && (
            <View style={styles.drawnInfo}>
              <Text style={styles.cardName}>{dailyDraw.card.name_de}</Text>
              <Text style={styles.positionBadge}>
                {dailyDraw.is_reversed ? 'Umgekehrt' : 'Aufrecht'}
              </Text>
              <Text style={styles.meaningPreview}>
                {dailyDraw.is_reversed ? dailyDraw.card.meaning_reversed : dailyDraw.card.meaning_upright}
              </Text>
              <TouchableOpacity
                testID="view-card-detail-btn"
                style={styles.detailButton}
                onPress={() => router.push(`/card/${dailyDraw.card.id}`)}
              >
                <Text style={styles.detailButtonText}>Karte ansehen</Text>
                <Ionicons name="arrow-forward" size={16} color={COLORS.accent} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Navigation Grid */}
        <View style={styles.navGrid}>
          {[
            { icon: 'grid-outline', label: 'Bibliothek', desc: 'Alle 78 Karten', route: '/library' },
            { icon: 'book-outline', label: 'Lernen', desc: 'Karten studieren', route: '/learn' },
            { icon: 'help-circle-outline', label: 'Quiz', desc: 'Teste dein Wissen', route: '/quiz' },
          ].map((item, i) => (
            <TouchableOpacity
              key={i}
              testID={`nav-${item.label.toLowerCase()}-btn`}
              style={styles.navCard}
              onPress={() => router.push(item.route as any)}
            >
              <Ionicons name={item.icon as any} size={32} color={COLORS.accent} />
              <Text style={styles.navLabel}>{item.label}</Text>
              <Text style={styles.navDesc}>{item.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },
  content: { paddingBottom: 40 },

  // Logo
  logoSection: {
    alignItems: 'center', paddingTop: SPACING.lg,
  },
  logo: {
    width: Math.min(SCREEN_W * 0.55, 220),
    height: Math.min(SCREEN_W * 0.55, 220),
  },

  // Deck Name
  deckNameSection: {
    alignItems: 'center', paddingHorizontal: SPACING.xl, marginTop: SPACING.sm,
  },
  deckName: {
    fontSize: 28, color: COLORS.primary, fontWeight: '300',
    letterSpacing: 12, textAlign: 'center',
    fontFamily: FONTS.cinzelBold,
  },
  deckSubtitle: {
    fontSize: 14, color: COLORS.primaryDark, fontStyle: 'italic',
    marginTop: SPACING.xs, letterSpacing: 2, textAlign: 'center',
    fontFamily: FONTS.script,
  },
  deckNameDivider: {
    width: 60, height: 1, backgroundColor: COLORS.borderGold,
    marginVertical: SPACING.sm, opacity: 0.4,
  },

  // Mockup
  mockupSection: {
    alignItems: 'center', marginTop: SPACING.md, paddingHorizontal: SPACING.md,
  },
  mockupImage: {
    width: Math.min(SCREEN_W - 32, 380),
    height: Math.min((SCREEN_W - 32) * 0.56, 215),
    borderRadius: 12,
  },

  // Divider
  sectionDivider: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, marginTop: SPACING.xl, paddingHorizontal: SPACING.xl,
  },
  dividerLine: {
    flex: 1, height: 1, backgroundColor: COLORS.borderGold, opacity: 0.3,
  },

  // Daily Card
  dailySection: { alignItems: 'center', marginTop: SPACING.lg, paddingHorizontal: SPACING.md },
  sectionTitle: {
    fontSize: 20, color: COLORS.text, fontWeight: '700',
    fontFamily: FONTS.cinzelBold,
  },
  dateText: { color: COLORS.textSecondary, fontSize: 13, marginTop: SPACING.xs },
  cardWrapper: { marginTop: SPACING.lg },
  cardContainer: { alignItems: 'center', justifyContent: 'center' },
  glowOverlay: {
    position: 'absolute', width: 220, height: 320, borderRadius: 16,
    backgroundColor: COLORS.accent, ...SHADOWS.glow,
  },
  cardFace: { alignItems: 'center' },
  cardFront: { position: 'absolute' },
  drawHint: {
    color: COLORS.primaryDark, fontSize: 13, marginTop: SPACING.md,
    fontFamily: FONTS.script,
    fontStyle: 'italic',
  },
  drawnInfo: { alignItems: 'center', marginTop: SPACING.lg },
  cardName: {
    fontSize: 22, color: COLORS.accent, fontWeight: '700',
    fontFamily: FONTS.cinzelBold,
  },
  positionBadge: {
    color: COLORS.primary, fontSize: 13, fontWeight: '600',
    marginTop: SPACING.xs, textTransform: 'uppercase', letterSpacing: 2,
  },
  meaningPreview: {
    color: COLORS.textSecondary, fontSize: 14, textAlign: 'center',
    marginTop: SPACING.sm, paddingHorizontal: SPACING.xl, lineHeight: 22,
  },
  detailButton: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    marginTop: SPACING.md, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.accent, borderRadius: 24,
  },
  detailButtonText: {
    color: COLORS.accent, fontSize: 14, fontWeight: '600',
    fontFamily: FONTS.cinzelBold,
  },

  // Navigation
  navGrid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
    gap: SPACING.md, paddingHorizontal: SPACING.md, marginTop: SPACING.xl,
  },
  navCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: SPACING.lg,
    alignItems: 'center', width: 160, borderWidth: 1, borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  navLabel: {
    color: COLORS.text, fontSize: 16, fontWeight: '700', marginTop: SPACING.sm,
    fontFamily: FONTS.cinzelBold,
  },
  navDesc: { color: COLORS.textSecondary, fontSize: 12, marginTop: SPACING.xs },
});
