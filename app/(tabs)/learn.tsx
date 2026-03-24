import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  ActivityIndicator, SafeAreaView, ScrollView, Dimensions, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, SHADOWS, FONTS, BORDER_RADIUS, XP_VALUES, LEVELS, ACHIEVEMENTS } from '../../src/theme';
import TarotCardArt from '../../src/components/TarotCardArt';
import {
  getProgress, getStreak, updateStreak, addXP, markCardLearned,
  getDifficultCards, addDifficultCard, removeDifficultCard,
  getLearnedCards, calculateLevel, checkAchievements,
  type UserProgress, type StreakData, type LearnedCard,
} from '../../src/gamificationStore';
import { playFlipSound, playXPSound, playLevelUpSound, playAchievementSound, playClickSound } from '../../src/soundManager';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width: SCREEN_W } = Dimensions.get('window');

type CardType = {
  id: string; number: number; name_de: string; type: string;
  suit: string | null; suit_de: string | null;
  meaning_upright: string; meaning_reversed: string;
  description: string; image_short: string; icon: string;
  has_custom_image?: boolean;
};

type LearnMode = 'all' | 'difficult' | 'new';

export default function LearnScreen() {
  const router = useRouter();
  const [cards, setCards] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);
  const [mode, setMode] = useState<LearnMode>('all');
  const [filter, setFilter] = useState<string>('all');
  
  // Gamification state
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [streak, setStreakData] = useState<StreakData | null>(null);
  const [learnedCards, setLearnedCardsData] = useState<Record<string, LearnedCard>>({});
  const [difficultCardIds, setDifficultCardIds] = useState<string[]>([]);
  const [xpGained, setXpGained] = useState<number | null>(null);
  const [levelUp, setLevelUp] = useState<{ level: number; name: string } | null>(null);
  const [newAchievement, setNewAchievement] = useState<typeof ACHIEVEMENTS[0] | null>(null);
  const [showStreakBonus, setShowStreakBonus] = useState(false);
  
  // Animations
  const cardAnim = useRef(new Animated.Value(1)).current;
  const flipAnim = useRef(new Animated.Value(0)).current;
  const xpAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [cardsRes, progressData, streakData, learned, difficult] = await Promise.all([
        fetch(`${API_URL}/api/cards`).then(r => r.json()),
        getProgress(),
        getStreak(),
        getLearnedCards(),
        getDifficultCards(),
      ]);
      setCards(cardsRes);
      setProgress(progressData);
      setStreakData(streakData);
      setLearnedCardsData(learned);
      setDifficultCardIds(difficult);
      
      // Check for streak bonus on first load
      const streakResult = await updateStreak();
      if (streakResult.isNewDay && streakResult.bonusXP > 0) {
        setShowStreakBonus(true);
        setTimeout(() => setShowStreakBonus(false), 3000);
      }
    } catch {} finally { setLoading(false); }
  };

  const filteredCards = React.useMemo(() => {
    let result = cards;
    
    // Filter by suit/type
    if (filter === 'major') result = result.filter(c => c.type === 'major');
    else if (filter !== 'all') result = result.filter(c => c.suit === filter);
    
    // Filter by mode
    if (mode === 'difficult') {
      result = result.filter(c => difficultCardIds.includes(c.id));
    } else if (mode === 'new') {
      result = result.filter(c => !learnedCards[c.id]);
    }
    
    // Shuffle
    return [...result].sort(() => Math.random() - 0.5);
  }, [cards, filter, mode, difficultCardIds, learnedCards]);

  const current = filteredCards[currentIndex];
  const levelData = progress ? calculateLevel(progress.xp) : null;
  const learnedCount = Object.keys(learnedCards).length;

  const animateFlip = () => {
    playFlipSound();
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(flipAnim, { toValue: showMeaning ? 0 : 1, duration: 200, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    setShowMeaning(!showMeaning);
  };

  const animateXP = (amount: number) => {
    setXpGained(amount);
    playXPSound();
    Animated.sequence([
      Animated.timing(xpAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(800),
      Animated.timing(xpAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setXpGained(null));
  };

  const animateGlow = () => {
    Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  };

  const goToNextCard = () => {
    playClickSound();
    Animated.timing(cardAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      if (currentIndex < filteredCards.length - 1) {
        setCurrentIndex(i => i + 1);
      } else {
        setCurrentIndex(0);
      }
      setShowMeaning(false);
      flipAnim.setValue(0);
      Animated.timing(cardAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  const handleResponse = async (response: 'knew' | 'unsure' | 'repeat') => {
    if (!current || !progress) return;
    
    playClickSound();
    let xpAmount = 0;
    let confidence: 'mastered' | 'learning' | 'difficult' = 'learning';
    
    switch (response) {
      case 'knew':
        xpAmount = XP_VALUES.learn_knew;
        confidence = 'mastered';
        await removeDifficultCard(current.id);
        break;
      case 'unsure':
        xpAmount = XP_VALUES.learn_unsure;
        confidence = 'learning';
        break;
      case 'repeat':
        xpAmount = XP_VALUES.learn_repeat;
        confidence = 'difficult';
        await addDifficultCard(current.id);
        break;
    }
    
    // Mark card as learned
    await markCardLearned(current.id, confidence);
    
    // Add XP
    const result = await addXP(xpAmount);
    animateXP(xpAmount);
    animateGlow();
    
    // Check for level up
    if (result.leveledUp) {
      const newLevelData = LEVELS.find(l => l.level === result.newLevel);
      if (newLevelData) {
        playLevelUpSound();
        setLevelUp({ level: result.newLevel, name: newLevelData.name });
        setTimeout(() => setLevelUp(null), 3000);
      }
    }
    
    // Check for achievements
    const achievement = await checkAchievements();
    if (achievement) {
      playAchievementSound();
      setNewAchievement(achievement);
      setTimeout(() => setNewAchievement(null), 4000);
    }
    
    // Reload data
    const [progressData, learned, difficult] = await Promise.all([
      getProgress(),
      getLearnedCards(),
      getDifficultCards(),
    ]);
    setProgress(progressData);
    setLearnedCardsData(learned);
    setDifficultCardIds(difficult);
    
    // Auto-advance after short delay
    setTimeout(goToNextCard, 500);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.loadingText}>Lade Karten...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header with Stats */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Lernmodus</Text>
            {levelData && (
              <View style={styles.levelBadge}>
                <Ionicons name={levelData.icon as any} size={14} color={COLORS.primary} />
                <Text style={styles.levelText}>Lvl {levelData.level} – {levelData.name}</Text>
              </View>
            )}
          </View>
          <View style={styles.statsRight}>
            {streak && streak.currentStreak > 0 && (
              <View style={styles.streakBadge}>
                <Ionicons name="flame" size={16} color={COLORS.streak} />
                <Text style={styles.streakText}>{streak.currentStreak}</Text>
              </View>
            )}
            <View style={styles.xpBadge}>
              <Text style={styles.xpText}>{progress?.xp || 0} XP</Text>
            </View>
          </View>
        </View>
        
        {/* XP Progress Bar */}
        {levelData && (
          <View style={styles.xpBarContainer}>
            <View style={styles.xpBar}>
              <View style={[styles.xpBarFill, { width: `${levelData.progress}%` }]} />
            </View>
            <Text style={styles.xpBarText}>{Math.round(levelData.progress)}%</Text>
          </View>
        )}
        
        {/* Progress */}
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>{learnedCount} / 78 Karten gelernt</Text>
          <Text style={styles.progressText}>{filteredCards.length > 0 ? `${currentIndex + 1} / ${filteredCards.length}` : '0'}</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(learnedCount / 78) * 100}%` }]} />
        </View>
      </View>

      {/* Mode Selector */}
      <View style={styles.modeContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modeContent}>
          {[
            { key: 'all', label: 'Alle', icon: 'grid-outline' },
            { key: 'new', label: 'Neue', icon: 'add-circle-outline' },
            { key: 'difficult', label: 'Wiederholen', icon: 'refresh-outline', count: difficultCardIds.length },
          ].map(m => (
            <TouchableOpacity
              key={m.key}
              style={[styles.modeChip, mode === m.key && styles.modeChipActive]}
              onPress={() => { setMode(m.key as LearnMode); setCurrentIndex(0); setShowMeaning(false); }}
            >
              <Ionicons name={m.icon as any} size={16} color={mode === m.key ? COLORS.background : COLORS.primary} />
              <Text style={[styles.modeText, mode === m.key && styles.modeTextActive]}>{m.label}</Text>
              {m.count !== undefined && m.count > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{m.count}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Card Area */}
      {current ? (
        <View style={styles.cardArea}>
          <Animated.View style={[
            styles.cardContainer,
            { 
              opacity: cardAnim,
              transform: [{ scale: scaleAnim }],
            }
          ]}>
            {/* XP Popup */}
            {xpGained !== null && (
              <Animated.View style={[styles.xpPopup, { opacity: xpAnim, transform: [{ translateY: xpAnim.interpolate({ inputRange: [0, 1], outputRange: [20, -20] }) }] }]}>
                <Text style={styles.xpPopupText}>+{xpGained} XP</Text>
              </Animated.View>
            )}
            
            <TouchableOpacity onPress={animateFlip} activeOpacity={0.9}>
              {!showMeaning ? (
                <View style={styles.cardWrapper}>
                  <Animated.View style={[styles.cardGlow, { opacity: glowAnim }]} />
                  <TarotCardArt card={current} size="large" />
                </View>
              ) : (
                <View style={styles.meaningCard}>
                  <LinearGradient
                    colors={[COLORS.surface, COLORS.surfaceDark]}
                    style={styles.meaningGradient}
                  >
                    <View style={styles.meaningHeader}>
                      <Ionicons name={current.icon as any} size={28} color={COLORS.primary} />
                      <Text style={styles.meaningName}>{current.name_de}</Text>
                      {current.type === 'minor' && (
                        <Text style={styles.meaningSubtitle}>{current.suit_de}</Text>
                      )}
                    </View>
                    
                    <View style={styles.meaningDivider} />
                    
                    <ScrollView style={styles.meaningScroll} showsVerticalScrollIndicator={false}>
                      <View style={styles.meaningSection}>
                        <View style={styles.meaningLabel}>
                          <Ionicons name="arrow-up-circle" size={18} color={COLORS.primary} />
                          <Text style={styles.meaningLabelText}>Aufrecht</Text>
                        </View>
                        <Text style={styles.meaningText}>{current.meaning_upright}</Text>
                      </View>
                      
                      <View style={styles.meaningSection}>
                        <View style={styles.meaningLabel}>
                          <Ionicons name="arrow-down-circle" size={18} color={COLORS.cups} />
                          <Text style={[styles.meaningLabelText, { color: COLORS.cups }]}>Umgekehrt</Text>
                        </View>
                        <Text style={styles.meaningText}>{current.meaning_reversed}</Text>
                      </View>
                      
                      {current.description && (
                        <Text style={styles.descriptionText}>{current.description}</Text>
                      )}
                    </ScrollView>
                  </LinearGradient>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.tapHint}>
              {showMeaning ? '↑ Tippe für Karte' : '↓ Tippe für Bedeutung'}
            </Text>
          </Animated.View>

          {/* Response Buttons */}
          {showMeaning && (
            <View style={styles.responseContainer}>
              <TouchableOpacity 
                style={[styles.responseButton, styles.responseKnew]}
                onPress={() => handleResponse('knew')}
              >
                <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                <Text style={styles.responseText}>Wusste ich</Text>
                <Text style={styles.responseXP}>+{XP_VALUES.learn_knew} XP</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.responseButton, styles.responseUnsure]}
                onPress={() => handleResponse('unsure')}
              >
                <Ionicons name="help-circle" size={24} color={COLORS.textSecondary} />
                <Text style={styles.responseText}>Unsicher</Text>
                <Text style={styles.responseXP}>+{XP_VALUES.learn_unsure} XP</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.responseButton, styles.responseRepeat]}
                onPress={() => handleResponse('repeat')}
              >
                <Ionicons name="refresh" size={24} color={COLORS.streak} />
                <Text style={styles.responseText}>Nochmal</Text>
                <Text style={styles.responseXP}>+{XP_VALUES.learn_repeat} XP</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Navigation */}
          <View style={styles.navRow}>
            <TouchableOpacity style={styles.navButton} onPress={goToNextCard}>
              <Text style={styles.navButtonText}>Nächste Karte</Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.background} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle" size={64} color={COLORS.primary} />
          <Text style={styles.emptyTitle}>
            {mode === 'difficult' ? 'Keine Karten zum Wiederholen!' : 
             mode === 'new' ? 'Alle Karten gelernt!' : 'Keine Karten gefunden'}
          </Text>
          <Text style={styles.emptyText}>
            {mode === 'difficult' ? 'Super! Du hast alle schwierigen Karten gemeistert.' :
             mode === 'new' ? 'Du kennst bereits alle Karten. Weiter so!' : 'Ändere den Filter.'}
          </Text>
        </View>
      )}

      {/* Level Up Modal */}
      <Modal visible={levelUp !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.levelUpModal}>
            <Ionicons name="star" size={64} color={COLORS.primary} />
            <Text style={styles.levelUpTitle}>Level Up!</Text>
            <Text style={styles.levelUpText}>Du bist jetzt Level {levelUp?.level}</Text>
            <Text style={styles.levelUpName}>{levelUp?.name}</Text>
          </View>
        </View>
      </Modal>

      {/* Achievement Modal */}
      <Modal visible={newAchievement !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.achievementModal}>
            <Ionicons name={newAchievement?.icon as any} size={56} color={COLORS.achievement} />
            <Text style={styles.achievementTitle}>Achievement!</Text>
            <Text style={styles.achievementName}>{newAchievement?.name}</Text>
            <Text style={styles.achievementDesc}>{newAchievement?.desc}</Text>
            <Text style={styles.achievementXP}>+{newAchievement?.xp} XP</Text>
          </View>
        </View>
      </Modal>

      {/* Streak Bonus Popup */}
      {showStreakBonus && streak && (
        <View style={styles.streakPopup}>
          <Ionicons name="flame" size={24} color={COLORS.streak} />
          <Text style={styles.streakPopupText}>{streak.currentStreak} Tage Streak! +{XP_VALUES.daily_bonus} XP</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.md },
  loadingText: { color: COLORS.textSecondary, fontSize: 14 },
  
  // Header
  header: { paddingHorizontal: SPACING.md, paddingTop: SPACING.lg },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 28, color: COLORS.primary, fontWeight: '700', fontFamily: FONTS.cinzelBold },
  levelBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  levelText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  statsRight: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' },
  streakBadge: { 
    flexDirection: 'row', alignItems: 'center', gap: 4, 
    backgroundColor: 'rgba(255, 107, 53, 0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  streakText: { color: COLORS.streak, fontSize: 14, fontWeight: '700' },
  xpBadge: { backgroundColor: COLORS.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  xpText: { color: COLORS.xp, fontSize: 14, fontWeight: '700' },
  
  // XP Bar
  xpBarContainer: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.sm },
  xpBar: { flex: 1, height: 6, backgroundColor: COLORS.surface, borderRadius: 3, overflow: 'hidden' },
  xpBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  xpBarText: { color: COLORS.textMuted, fontSize: 11, width: 35 },
  
  // Progress
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.md },
  progressText: { color: COLORS.textSecondary, fontSize: 12 },
  progressBar: { height: 4, backgroundColor: COLORS.surface, borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 2 },
  
  // Mode Selector
  modeContainer: { marginTop: SPACING.md },
  modeContent: { paddingHorizontal: SPACING.md, gap: SPACING.sm },
  modeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  modeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  modeText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
  modeTextActive: { color: COLORS.background },
  countBadge: { 
    backgroundColor: COLORS.streak, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, marginLeft: 2,
  },
  countBadgeText: { color: COLORS.text, fontSize: 10, fontWeight: '700' },
  
  // Card Area
  cardArea: { flex: 1, alignItems: 'center', paddingTop: SPACING.lg },
  cardContainer: { alignItems: 'center', position: 'relative' },
  cardWrapper: { position: 'relative' },
  cardGlow: {
    position: 'absolute', top: -10, left: -10, right: -10, bottom: -10,
    backgroundColor: COLORS.goldGlowStrong, borderRadius: 20,
  },
  
  // XP Popup
  xpPopup: { position: 'absolute', top: -40, zIndex: 100 },
  xpPopupText: { color: COLORS.xp, fontSize: 24, fontWeight: '700', fontFamily: FONTS.cinzelBold },
  
  // Meaning Card
  meaningCard: { width: 220, height: 340, borderRadius: 14, overflow: 'hidden', borderWidth: 2, borderColor: COLORS.primary },
  meaningGradient: { flex: 1, padding: SPACING.md },
  meaningHeader: { alignItems: 'center', gap: 4 },
  meaningName: { color: COLORS.primary, fontSize: 17, fontWeight: '700', fontFamily: FONTS.cinzelBold, textAlign: 'center' },
  meaningSubtitle: { color: COLORS.textSecondary, fontSize: 11 },
  meaningDivider: { height: 1, backgroundColor: COLORS.borderGoldDim, marginVertical: SPACING.sm },
  meaningScroll: { flex: 1 },
  meaningSection: { marginBottom: SPACING.sm },
  meaningLabel: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  meaningLabelText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  meaningText: { color: COLORS.text, fontSize: 12, lineHeight: 18 },
  descriptionText: { color: COLORS.textMuted, fontSize: 11, fontStyle: 'italic', marginTop: SPACING.sm, lineHeight: 16 },
  
  tapHint: { color: COLORS.textMuted, fontSize: 12, marginTop: SPACING.md, fontStyle: 'italic' },
  
  // Response Buttons
  responseContainer: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg, paddingHorizontal: SPACING.sm },
  responseButton: {
    flex: 1, alignItems: 'center', paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surface, borderWidth: 1,
  },
  responseKnew: { borderColor: COLORS.primary },
  responseUnsure: { borderColor: COLORS.textMuted },
  responseRepeat: { borderColor: COLORS.streak },
  responseText: { color: COLORS.text, fontSize: 11, fontWeight: '600', marginTop: 4 },
  responseXP: { color: COLORS.xp, fontSize: 10, marginTop: 2 },
  
  // Navigation
  navRow: { marginTop: SPACING.lg, paddingHorizontal: SPACING.xl },
  navButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: SPACING.xl, borderRadius: 28,
    ...SHADOWS.button,
  },
  navButtonText: { color: COLORS.background, fontSize: 16, fontWeight: '700', fontFamily: FONTS.cinzelBold },
  
  // Empty State
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xl },
  emptyTitle: { color: COLORS.primary, fontSize: 20, fontWeight: '700', marginTop: SPACING.md, textAlign: 'center' },
  emptyText: { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', marginTop: SPACING.sm },
  
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  levelUpModal: {
    backgroundColor: COLORS.surface, padding: SPACING.xl, borderRadius: 24, alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.primary, width: SCREEN_W * 0.8,
  },
  levelUpTitle: { color: COLORS.primary, fontSize: 32, fontWeight: '700', fontFamily: FONTS.cinzelBold, marginTop: SPACING.md },
  levelUpText: { color: COLORS.text, fontSize: 16, marginTop: SPACING.sm },
  levelUpName: { color: COLORS.primaryBright, fontSize: 20, fontWeight: '700', marginTop: 4 },
  
  achievementModal: {
    backgroundColor: COLORS.surface, padding: SPACING.xl, borderRadius: 24, alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.achievement, width: SCREEN_W * 0.8,
  },
  achievementTitle: { color: COLORS.achievement, fontSize: 24, fontWeight: '700', marginTop: SPACING.sm },
  achievementName: { color: COLORS.text, fontSize: 18, fontWeight: '700', marginTop: SPACING.sm },
  achievementDesc: { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 4 },
  achievementXP: { color: COLORS.xp, fontSize: 16, fontWeight: '700', marginTop: SPACING.sm },
  
  // Streak Popup
  streakPopup: {
    position: 'absolute', top: 100, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.streak,
  },
  streakPopupText: { color: COLORS.streak, fontSize: 14, fontWeight: '700' },
});
