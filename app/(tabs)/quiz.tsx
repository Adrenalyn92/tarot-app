import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, SafeAreaView, ScrollView, Animated, Modal, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, SHADOWS, FONTS, BORDER_RADIUS, XP_VALUES, LEVELS, ACHIEVEMENTS } from '../../src/theme';
import {
  getProgress, addXP, calculateLevel, checkAchievements, updateQuizStats, updateBestCombo,
  type UserProgress,
} from '../../src/gamificationStore';
import { playCorrectSound, playWrongSound, playComboSound, playLevelUpSound, playAchievementSound, playClickSound } from '../../src/soundManager';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width: SCREEN_W } = Dimensions.get('window');

type Question = {
  id: string; question: string; options: string[];
  correct_answer: number; card_id: string; type: string;
};

type QuizScore = {
  id: string; score: number; total: number;
  percentage: number; date_str: string;
};

type QuizState = 'start' | 'playing' | 'result' | 'leaderboard';
type QuizCategory = 'all' | 'major' | 'minor' | 'meanings' | 'suits';

const CATEGORIES = [
  { key: 'all', label: 'Alle Fragen', icon: 'apps-outline', desc: 'Gemischte Fragen' },
  { key: 'major', label: 'Große Arkana', icon: 'star-outline', desc: '22 Trumpfkarten' },
  { key: 'minor', label: 'Kleine Arkana', icon: 'grid-outline', desc: '56 Karten' },
  { key: 'meanings', label: 'Bedeutungen', icon: 'book-outline', desc: 'Auf-/Umgekehrt' },
  { key: 'suits', label: 'Elemente', icon: 'leaf-outline', desc: 'Stäbe, Kelche, ...' },
];

export default function QuizScreen() {
  const [state, setState] = useState<QuizState>('start');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [questionCount, setQuestionCount] = useState(10);
  const [category, setCategory] = useState<QuizCategory>('all');
  const [scores, setScores] = useState<QuizScore[]>([]);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  
  // Gamification
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [levelUp, setLevelUp] = useState<{ level: number; name: string } | null>(null);
  const [newAchievement, setNewAchievement] = useState<typeof ACHIEVEMENTS[0] | null>(null);
  
  // Animations
  const feedbackAnim = useRef(new Animated.Value(0)).current;
  const comboAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const cardGlowAnim = useRef(new Animated.Value(0)).current;
  const xpPopAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { 
    loadScores();
    loadProgress();
  }, []);

  const loadScores = async () => {
    try {
      const res = await fetch(`${API_URL}/api/quiz/scores`);
      const data = await res.json();
      setScores(data.slice(0, 10));
    } catch {}
  };

  const loadProgress = async () => {
    const p = await getProgress();
    setProgress(p);
  };

  const generateQuestions = async () => {
    setLoading(true);
    try {
      // Fetch all cards
      const cardsRes = await fetch(`${API_URL}/api/cards`);
      const allCards = await cardsRes.json();
      
      // Filter based on category
      let cards = allCards;
      if (category === 'major') {
        cards = allCards.filter((c: any) => c.type === 'major');
      } else if (category === 'minor') {
        cards = allCards.filter((c: any) => c.type === 'minor');
      }
      
      if (cards.length < 4) {
        cards = allCards;
      }
      
      // Generate different question types
      const questions: Question[] = [];
      const shuffledCards = [...cards].sort(() => Math.random() - 0.5).slice(0, questionCount);
      
      for (const card of shuffledCards) {
        let questionType = 'meaning_to_card';
        
        // Randomize question type based on category
        if (category === 'meanings') {
          questionType = Math.random() > 0.5 ? 'upright_meaning' : 'reversed_meaning';
        } else if (category === 'suits') {
          questionType = 'suit_recognition';
        } else {
          const types = ['meaning_to_card', 'card_to_meaning', 'upright_meaning', 'reversed_meaning'];
          if (card.type === 'minor') types.push('suit_recognition');
          questionType = types[Math.floor(Math.random() * types.length)];
        }
        
        let questionText = '';
        let correct = '';
        let wrongOptions: string[] = [];
        const otherCards = cards.filter((c: any) => c.id !== card.id);
        const randomOthers = otherCards.sort(() => Math.random() - 0.5).slice(0, 3);
        
        switch (questionType) {
          case 'meaning_to_card':
            questionText = `Welche Karte hat diese aufrechte Bedeutung?\n\n"${card.meaning_upright}"`;
            correct = card.name_de;
            wrongOptions = randomOthers.map((c: any) => c.name_de);
            break;
            
          case 'card_to_meaning':
            questionText = `Was bedeutet "${card.name_de}" in aufrechter Position?`;
            correct = card.meaning_upright;
            wrongOptions = randomOthers.map((c: any) => c.meaning_upright);
            break;
            
          case 'upright_meaning':
            questionText = `"${card.name_de}" – Aufrechte Bedeutung:`;
            correct = card.meaning_upright;
            wrongOptions = randomOthers.map((c: any) => c.meaning_upright);
            break;
            
          case 'reversed_meaning':
            questionText = `"${card.name_de}" – Umgekehrte Bedeutung:`;
            correct = card.meaning_reversed;
            wrongOptions = randomOthers.map((c: any) => c.meaning_reversed);
            break;
            
          case 'suit_recognition':
            const suits = ['Stäbe', 'Kelche', 'Schwerter', 'Münzen'];
            questionText = `Zu welchem Element gehört "${card.name_de}"?`;
            correct = card.suit_de || 'Große Arkana';
            wrongOptions = suits.filter(s => s !== card.suit_de);
            if (card.type === 'major') wrongOptions = suits.slice(0, 3);
            break;
        }
        
        const options = [correct, ...wrongOptions.slice(0, 3)].sort(() => Math.random() - 0.5);
        const correctIdx = options.indexOf(correct);
        
        questions.push({
          id: `${card.id}_${questionType}_${Date.now()}`,
          question: questionText,
          options,
          correct_answer: correctIdx,
          card_id: card.id,
          type: questionType,
        });
      }
      
      setQuestions(questions);
      setCurrentQ(0);
      setScore(0);
      setSelected(null);
      setCombo(0);
      setMaxCombo(0);
      setTotalXP(0);
      setState('playing');
    } catch (e) {
      console.error('Error generating questions:', e);
    } finally {
      setLoading(false);
    }
  };

  const animateCorrect = () => {
    playCorrectSound();
    Animated.parallel([
      Animated.sequence([
        Animated.timing(feedbackAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(feedbackAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(cardGlowAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(cardGlowAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
    ]).start();
  };

  const animateWrong = () => {
    playWrongSound();
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 15, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -15, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const animateCombo = (newCombo: number) => {
    if (newCombo >= 3) {
      playComboSound();
      Animated.sequence([
        Animated.timing(comboAnim, { toValue: 1.3, duration: 150, useNativeDriver: true }),
        Animated.timing(comboAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  };

  const selectAnswer = async (idx: number) => {
    if (selected !== null) return;
    playClickSound();
    setSelected(idx);
    const isCorrect = idx === questions[currentQ].correct_answer;
    
    let earnedXP = 0;
    
    if (isCorrect) {
      setScore(s => s + 1);
      const newCombo = combo + 1;
      setCombo(newCombo);
      if (newCombo > maxCombo) setMaxCombo(newCombo);
      animateCorrect();
      animateCombo(newCombo);
      
      // Calculate XP with combo bonus
      earnedXP = XP_VALUES.quiz_correct + (Math.floor(newCombo / 3) * XP_VALUES.combo_bonus);
      setTotalXP(prev => prev + earnedXP);
    } else {
      setCombo(0);
      animateWrong();
    }

    setTimeout(async () => {
      if (currentQ < questions.length - 1) {
        setCurrentQ(q => q + 1);
        setSelected(null);
      } else {
        // Quiz finished
        const finalScore = score + (isCorrect ? 1 : 0);
        const isPerfect = finalScore === questions.length;
        const perfectBonus = isPerfect ? XP_VALUES.perfect_quiz : 0;
        const finalXP = totalXP + earnedXP + perfectBonus;
        
        // Save stats
        await updateQuizStats(finalScore, questions.length, isPerfect);
        await updateBestCombo(maxCombo > combo ? maxCombo : (isCorrect ? combo + 1 : maxCombo));
        
        // Add XP
        const result = await addXP(finalXP);
        
        // Check for level up
        if (result.leveledUp) {
          const newLevelData = LEVELS.find(l => l.level === result.newLevel);
          if (newLevelData) {
            playLevelUpSound();
            setLevelUp({ level: result.newLevel, name: newLevelData.name });
          }
        }
        
        // Check achievements
        const achievement = await checkAchievements();
        if (achievement) {
          playAchievementSound();
          setNewAchievement(achievement);
        }
        
        // Save to backend
        try {
          await fetch(`${API_URL}/api/quiz/scores`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ score: finalScore, total: questions.length }),
          });
          loadScores();
        } catch {}
        
        setTotalXP(finalXP);
        await loadProgress();
        setState('result');
      }
    }, 1200);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    } catch {
      return '';
    }
  };

  const levelData = progress ? calculateLevel(progress.xp) : null;

  // START SCREEN
  if (state === 'start') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.startContainer} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.quizIcon}>
            <LinearGradient colors={[COLORS.surface, COLORS.surfaceDark]} style={styles.quizIconGradient}>
              <Ionicons name="help-circle" size={48} color={COLORS.primary} />
            </LinearGradient>
          </View>
          
          <Text style={styles.startTitle}>Tarot Quiz</Text>
          <Text style={styles.startDesc}>
            Teste dein Wissen über die mystischen Bedeutungen der Tarot-Karten!
          </Text>

          {/* Stats Bar */}
          {levelData && (
            <View style={styles.statsBar}>
              <View style={styles.statItem}>
                <Ionicons name={levelData.icon as any} size={20} color={COLORS.primary} />
                <Text style={styles.statLabel}>Level {levelData.level}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="sparkles" size={20} color={COLORS.xp} />
                <Text style={styles.statLabel}>{progress?.xp || 0} XP</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="trophy" size={20} color={COLORS.primary} />
                <Text style={styles.statLabel}>{progress?.quizzesCompleted || 0} Spiele</Text>
              </View>
            </View>
          )}

          {/* Category Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Kategorie wählen</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.categoryCard, category === cat.key && styles.categoryCardActive]}
                  onPress={() => { playClickSound(); setCategory(cat.key as QuizCategory); }}
                >
                  <Ionicons 
                    name={cat.icon as any} 
                    size={28} 
                    color={category === cat.key ? COLORS.background : COLORS.primary} 
                  />
                  <Text style={[styles.categoryLabel, category === cat.key && styles.categoryLabelActive]}>
                    {cat.label}
                  </Text>
                  <Text style={[styles.categoryDesc, category === cat.key && styles.categoryDescActive]}>
                    {cat.desc}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Question Count */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Anzahl Fragen</Text>
            <View style={styles.countRow}>
              {[5, 10, 15, 20].map(n => (
                <TouchableOpacity
                  key={n}
                  style={[styles.countChip, questionCount === n && styles.countChipActive]}
                  onPress={() => { playClickSound(); setQuestionCount(n); }}
                >
                  <Text style={[styles.countChipText, questionCount === n && styles.countChipTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* XP Preview */}
          <View style={styles.xpPreview}>
            <Text style={styles.xpPreviewText}>
              Mögliche XP: {questionCount * XP_VALUES.quiz_correct} - {questionCount * (XP_VALUES.quiz_correct + XP_VALUES.combo_bonus * 3) + XP_VALUES.perfect_quiz}
            </Text>
          </View>

          {/* Buttons */}
          <TouchableOpacity 
            style={styles.startButton} 
            onPress={generateQuestions}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.background} />
            ) : (
              <>
                <Ionicons name="play" size={24} color={COLORS.background} />
                <Text style={styles.startButtonText}>Quiz starten</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.outlineButton}
            onPress={() => setState('leaderboard')}
          >
            <Ionicons name="trophy-outline" size={20} color={COLORS.primary} />
            <Text style={styles.outlineButtonText}>Bestenliste</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // LEADERBOARD SCREEN
  if (state === 'leaderboard') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.leaderboardHeader}>
          <TouchableOpacity onPress={() => setState('start')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.leaderboardTitle}>Bestenliste</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.leaderboardContent}>
          {scores.length === 0 ? (
            <View style={styles.emptyLeaderboard}>
              <Ionicons name="trophy-outline" size={64} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>Noch keine Ergebnisse</Text>
              <Text style={styles.emptyText}>Spiele ein Quiz!</Text>
            </View>
          ) : (
            scores.map((s, idx) => (
              <View key={s.id} style={[styles.scoreRow, idx < 3 && styles.scoreRowTop]}>
                <View style={[
                  styles.rankBadge, 
                  idx === 0 && styles.rankGold, 
                  idx === 1 && styles.rankSilver, 
                  idx === 2 && styles.rankBronze
                ]}>
                  {idx < 3 ? (
                    <Ionicons name="trophy" size={16} color={COLORS.background} />
                  ) : (
                    <Text style={styles.rankText}>{idx + 1}</Text>
                  )}
                </View>
                <View style={styles.scoreInfo}>
                  <Text style={styles.scoreValue}>{s.score} / {s.total}</Text>
                  <Text style={styles.scoreDate}>{formatDate(s.date_str)}</Text>
                </View>
                <View style={[
                  styles.scorePctBadge, 
                  s.percentage >= 80 && styles.pctGood,
                  s.percentage < 50 && styles.pctBad
                ]}>
                  <Text style={styles.pctText}>{s.percentage}%</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // RESULT SCREEN
  if (state === 'result') {
    const pct = Math.round((score / questions.length) * 100);
    const isPerfect = pct === 100;
    const message = isPerfect ? 'PERFEKT!' : pct >= 80 ? 'Ausgezeichnet!' : pct >= 60 ? 'Sehr gut!' : pct >= 40 ? 'Gut!' : 'Weiter üben!';
    const emoji = isPerfect ? 'trophy' : pct >= 80 ? 'star' : pct >= 60 ? 'thumbs-up' : pct >= 40 ? 'happy-outline' : 'refresh';
    const messageColor = isPerfect ? COLORS.xp : pct >= 60 ? COLORS.primary : COLORS.textSecondary;

    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.resultContainer}>
          <Ionicons name={emoji as any} size={80} color={messageColor} />
          <Text style={[styles.resultTitle, { color: messageColor }]}>{message}</Text>
          
          <View style={styles.scoreDisplay}>
            <Text style={styles.scoreNumber}>{score}</Text>
            <Text style={styles.scoreDivider}>/</Text>
            <Text style={styles.scoreTotal}>{questions.length}</Text>
          </View>
          <Text style={styles.scorePercent}>{pct}% richtig</Text>

          {/* Stats Grid */}
          <View style={styles.resultStats}>
            <View style={styles.resultStatBox}>
              <Ionicons name="flame" size={28} color={COLORS.streak} />
              <Text style={styles.resultStatValue}>{maxCombo}</Text>
              <Text style={styles.resultStatLabel}>Beste Combo</Text>
            </View>
            <View style={styles.resultStatBox}>
              <Ionicons name="sparkles" size={28} color={COLORS.xp} />
              <Text style={styles.resultStatValue}>+{totalXP}</Text>
              <Text style={styles.resultStatLabel}>XP verdient</Text>
            </View>
            <View style={styles.resultStatBox}>
              <Ionicons name="checkmark-circle" size={28} color={COLORS.success} />
              <Text style={styles.resultStatValue}>{score}</Text>
              <Text style={styles.resultStatLabel}>Richtig</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.resultActions}>
            <TouchableOpacity style={styles.startButton} onPress={generateQuestions}>
              <Ionicons name="refresh" size={22} color={COLORS.background} />
              <Text style={styles.startButtonText}>Nochmal spielen</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.outlineButton} onPress={() => setState('start')}>
              <Text style={styles.outlineButtonText}>Zurück zum Start</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Level Up Modal */}
        <Modal visible={levelUp !== null} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.levelUpModal}>
              <Ionicons name="star" size={64} color={COLORS.primary} />
              <Text style={styles.levelUpTitle}>Level Up!</Text>
              <Text style={styles.levelUpText}>Level {levelUp?.level}</Text>
              <Text style={styles.levelUpName}>{levelUp?.name}</Text>
              <TouchableOpacity style={styles.modalButton} onPress={() => setLevelUp(null)}>
                <Text style={styles.modalButtonText}>Super!</Text>
              </TouchableOpacity>
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
              <TouchableOpacity style={styles.modalButton} onPress={() => setNewAchievement(null)}>
                <Text style={styles.modalButtonText}>Toll!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // PLAYING SCREEN
  const q = questions[currentQ];
  const cardGlowOpacity = cardGlowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] });

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.quizHeader}>
        <View style={styles.quizHeaderTop}>
          <Text style={styles.quizProgress}>Frage {currentQ + 1}/{questions.length}</Text>
          {combo >= 3 && (
            <Animated.View style={[styles.comboBadge, { transform: [{ scale: comboAnim }] }]}>
              <Ionicons name="flame" size={16} color={COLORS.streak} />
              <Text style={styles.comboText}>{combo}x</Text>
            </Animated.View>
          )}
          <Text style={styles.quizScore}>{score} Punkte</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${((currentQ + 1) / questions.length) * 100}%` }]} />
        </View>
      </View>

      {/* Question */}
      <Animated.ScrollView 
        contentContainerStyle={styles.questionContainer}
        style={{ transform: [{ translateX: shakeAnim }] }}
      >
        <Animated.View style={[
          styles.questionCard, 
          selected !== null && selected === q.correct_answer && { borderColor: COLORS.success },
          selected !== null && selected !== q.correct_answer && { borderColor: COLORS.error },
        ]}>
          <Animated.View style={[styles.questionGlow, { opacity: cardGlowOpacity }]} />
          <Ionicons name="help-circle-outline" size={32} color={COLORS.primary} />
          <Text style={styles.questionText}>{q.question}</Text>
        </Animated.View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {q.options.map((opt, idx) => {
            let optStyle = styles.optionDefault;
            let iconName: any = null;
            let iconColor = COLORS.textMuted;
            
            if (selected !== null) {
              if (idx === q.correct_answer) {
                optStyle = styles.optionCorrect;
                iconName = 'checkmark-circle';
                iconColor = COLORS.success;
              } else if (idx === selected) {
                optStyle = styles.optionWrong;
                iconName = 'close-circle';
                iconColor = COLORS.error;
              }
            }
            
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.optionButton, optStyle]}
                onPress={() => selectAnswer(idx)}
                disabled={selected !== null}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.optionLetter,
                  selected !== null && idx === q.correct_answer && styles.optionLetterCorrect,
                  selected !== null && idx === selected && idx !== q.correct_answer && styles.optionLetterWrong,
                ]}>
                  <Text style={styles.optionLetterText}>{String.fromCharCode(65 + idx)}</Text>
                </View>
                <Text style={[
                  styles.optionText,
                  selected !== null && idx === q.correct_answer && styles.optionTextCorrect,
                  selected !== null && idx === selected && idx !== q.correct_answer && styles.optionTextWrong,
                ]} numberOfLines={3}>{opt}</Text>
                {iconName && (
                  <Ionicons name={iconName} size={24} color={iconColor} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  
  // Start Screen
  startContainer: { flexGrow: 1, alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.xl },
  quizIcon: { marginBottom: SPACING.md },
  quizIconGradient: {
    width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.primary,
  },
  startTitle: { fontSize: 32, color: COLORS.primary, fontWeight: '700', fontFamily: FONTS.cinzelBold },
  startDesc: { color: COLORS.textSecondary, fontSize: 15, textAlign: 'center', marginTop: SPACING.sm, lineHeight: 22 },
  
  // Stats Bar
  statsBar: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, 
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg, borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.lg, gap: SPACING.md,
  },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statLabel: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  statDivider: { width: 1, height: 20, backgroundColor: COLORS.border },
  
  // Section
  section: { width: '100%', marginTop: SPACING.xl },
  sectionLabel: { color: COLORS.textSecondary, fontSize: 14, marginBottom: SPACING.md, textAlign: 'center' },
  
  // Categories
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: SPACING.sm },
  categoryCard: {
    width: (SCREEN_W - SPACING.lg * 2 - SPACING.sm) / 2 - SPACING.sm,
    padding: SPACING.md, borderRadius: BORDER_RADIUS.lg, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  categoryCardActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryLabel: { color: COLORS.text, fontSize: 13, fontWeight: '700', marginTop: SPACING.sm, textAlign: 'center' },
  categoryLabelActive: { color: COLORS.background },
  categoryDesc: { color: COLORS.textMuted, fontSize: 11, marginTop: 2, textAlign: 'center' },
  categoryDescActive: { color: COLORS.background },
  
  // Count
  countRow: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.md },
  countChip: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
  },
  countChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  countChipText: { color: COLORS.text, fontSize: 20, fontWeight: '700' },
  countChipTextActive: { color: COLORS.background },
  
  // XP Preview
  xpPreview: { marginTop: SPACING.md },
  xpPreviewText: { color: COLORS.xp, fontSize: 12, fontStyle: 'italic' },
  
  // Buttons
  startButton: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.primary, paddingVertical: 16, paddingHorizontal: SPACING.xxl,
    borderRadius: 28, marginTop: SPACING.xl, ...SHADOWS.button,
  },
  startButtonText: { color: COLORS.background, fontSize: 18, fontWeight: '700', fontFamily: FONTS.cinzelBold },
  outlineButton: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: 14, paddingHorizontal: SPACING.xl, borderRadius: 28,
    borderWidth: 1, borderColor: COLORS.primary, marginTop: SPACING.md,
  },
  outlineButtonText: { color: COLORS.primary, fontSize: 15, fontWeight: '600' },
  
  // Leaderboard
  leaderboardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingTop: SPACING.lg, paddingBottom: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { padding: SPACING.sm },
  leaderboardTitle: { fontSize: 22, color: COLORS.primary, fontWeight: '700', fontFamily: FONTS.cinzelBold },
  leaderboardContent: { padding: SPACING.md },
  emptyLeaderboard: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { color: COLORS.textSecondary, fontSize: 18, marginTop: SPACING.md },
  emptyText: { color: COLORS.textMuted, fontSize: 14 },
  scoreRow: {
    flexDirection: 'row', alignItems: 'center', padding: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  scoreRowTop: { borderColor: COLORS.primary },
  rankBadge: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.shadow,
    alignItems: 'center', justifyContent: 'center',
  },
  rankGold: { backgroundColor: COLORS.primary },
  rankSilver: { backgroundColor: '#B8B8B8' },
  rankBronze: { backgroundColor: '#CD7F32' },
  rankText: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  scoreInfo: { flex: 1, marginLeft: SPACING.md },
  scoreValue: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  scoreDate: { color: COLORS.textMuted, fontSize: 12 },
  scorePctBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: COLORS.shadow },
  pctGood: { backgroundColor: 'rgba(76, 175, 80, 0.2)' },
  pctBad: { backgroundColor: 'rgba(198, 40, 40, 0.2)' },
  pctText: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  
  // Result
  resultContainer: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xl },
  resultTitle: { fontSize: 32, fontWeight: '700', fontFamily: FONTS.cinzelBold, marginTop: SPACING.md },
  scoreDisplay: { flexDirection: 'row', alignItems: 'baseline', marginTop: SPACING.lg },
  scoreNumber: { fontSize: 72, color: COLORS.primary, fontWeight: '700' },
  scoreDivider: { fontSize: 36, color: COLORS.textSecondary, marginHorizontal: SPACING.sm },
  scoreTotal: { fontSize: 40, color: COLORS.text, fontWeight: '600' },
  scorePercent: { color: COLORS.textSecondary, fontSize: 20, marginTop: SPACING.sm },
  resultStats: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.xl },
  resultStatBox: {
    alignItems: 'center', padding: SPACING.md, backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg, minWidth: 100, borderWidth: 1, borderColor: COLORS.border,
  },
  resultStatValue: { color: COLORS.text, fontSize: 24, fontWeight: '700', marginTop: 4 },
  resultStatLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  resultActions: { alignItems: 'center', marginTop: SPACING.xl },
  
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  levelUpModal: {
    backgroundColor: COLORS.surface, padding: SPACING.xl, borderRadius: 24, alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.primary, width: SCREEN_W * 0.8,
  },
  levelUpTitle: { color: COLORS.primary, fontSize: 32, fontWeight: '700', fontFamily: FONTS.cinzelBold, marginTop: SPACING.md },
  levelUpText: { color: COLORS.text, fontSize: 18, marginTop: SPACING.sm },
  levelUpName: { color: COLORS.primaryBright, fontSize: 22, fontWeight: '700', marginTop: 4 },
  modalButton: {
    backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: SPACING.xl,
    borderRadius: 20, marginTop: SPACING.lg,
  },
  modalButtonText: { color: COLORS.background, fontSize: 16, fontWeight: '700' },
  achievementModal: {
    backgroundColor: COLORS.surface, padding: SPACING.xl, borderRadius: 24, alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.achievement, width: SCREEN_W * 0.8,
  },
  achievementTitle: { color: COLORS.achievement, fontSize: 24, fontWeight: '700', marginTop: SPACING.sm },
  achievementName: { color: COLORS.text, fontSize: 18, fontWeight: '700', marginTop: SPACING.sm },
  achievementDesc: { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 4 },
  achievementXP: { color: COLORS.xp, fontSize: 18, fontWeight: '700', marginTop: SPACING.sm },
  
  // Playing
  quizHeader: { paddingHorizontal: SPACING.md, paddingTop: SPACING.lg },
  quizHeaderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quizProgress: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  comboBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255, 107, 53, 0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16,
  },
  comboText: { color: COLORS.streak, fontSize: 16, fontWeight: '700' },
  quizScore: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
  progressBar: { height: 6, backgroundColor: COLORS.surface, borderRadius: 3, marginTop: SPACING.sm, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  
  questionContainer: { paddingHorizontal: SPACING.md, paddingTop: SPACING.xl, paddingBottom: 40 },
  questionCard: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.xl,
    borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', position: 'relative', overflow: 'hidden',
    ...SHADOWS.card,
  },
  questionGlow: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: COLORS.goldGlow, borderRadius: BORDER_RADIUS.lg,
  },
  questionText: {
    color: COLORS.text, fontSize: 17, textAlign: 'center', lineHeight: 26,
    fontFamily: FONTS.cinzelBold, marginTop: SPACING.md,
  },
  
  optionsContainer: { marginTop: SPACING.xl, gap: SPACING.sm },
  optionButton: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    padding: SPACING.md, borderRadius: BORDER_RADIUS.md, borderWidth: 1,
    backgroundColor: COLORS.surface,
  },
  optionDefault: { borderColor: COLORS.border },
  optionCorrect: { borderColor: COLORS.success, backgroundColor: 'rgba(76, 175, 80, 0.1)' },
  optionWrong: { borderColor: COLORS.error, backgroundColor: 'rgba(198, 40, 40, 0.1)' },
  optionLetter: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.shadow,
    alignItems: 'center', justifyContent: 'center',
  },
  optionLetterCorrect: { backgroundColor: COLORS.success },
  optionLetterWrong: { backgroundColor: COLORS.error },
  optionLetterText: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  optionText: { flex: 1, fontSize: 14, lineHeight: 20, color: COLORS.text },
  optionTextCorrect: { color: COLORS.success },
  optionTextWrong: { color: COLORS.error },
});
