import AsyncStorage from '@react-native-async-storage/async-storage';
import { LEVELS, ACHIEVEMENTS, XP_VALUES } from './theme';

const STORAGE_KEYS = {
  PROGRESS: '@diarot_progress',
  STREAK: '@diarot_streak',
  ACHIEVEMENTS: '@diarot_achievements',
  DIFFICULT_CARDS: '@diarot_difficult',
  LEARNED_CARDS: '@diarot_learned',
  QUIZ_STATS: '@diarot_quiz_stats',
};

export type UserProgress = {
  xp: number;
  level: number;
  totalCardsLearned: number;
  cardsLearnedToday: number;
  quizzesCompleted: number;
  perfectQuizzes: number;
  bestCombo: number;
  lastLearnDate: string | null;
};

export type StreakData = {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
};

export type LearnedCard = {
  cardId: string;
  timesStudied: number;
  lastStudied: string;
  confidence: 'mastered' | 'learning' | 'difficult';
};

export type QuizStats = {
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  averageScore: number;
};

// Initial states
const initialProgress: UserProgress = {
  xp: 0,
  level: 1,
  totalCardsLearned: 0,
  cardsLearnedToday: 0,
  quizzesCompleted: 0,
  perfectQuizzes: 0,
  bestCombo: 0,
  lastLearnDate: null,
};

const initialStreak: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: null,
};

const initialQuizStats: QuizStats = {
  totalQuestions: 0,
  correctAnswers: 0,
  wrongAnswers: 0,
  averageScore: 0,
};

// Helper functions
const getToday = () => new Date().toISOString().split('T')[0];

const isYesterday = (dateStr: string | null) => {
  if (!dateStr) return false;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return dateStr === yesterday.toISOString().split('T')[0];
};

const isToday = (dateStr: string | null) => {
  if (!dateStr) return false;
  return dateStr === getToday();
};

// Calculate level from XP
export const calculateLevel = (xp: number): { level: number; name: string; icon: string; progress: number; nextLevelXP: number } => {
  let currentLevel = LEVELS[0];
  let nextLevel = LEVELS[1];
  
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpRequired) {
      currentLevel = LEVELS[i];
      nextLevel = LEVELS[i + 1] || LEVELS[i];
      break;
    }
  }
  
  const xpInCurrentLevel = xp - currentLevel.xpRequired;
  const xpForNextLevel = nextLevel.xpRequired - currentLevel.xpRequired;
  const progress = xpForNextLevel > 0 ? (xpInCurrentLevel / xpForNextLevel) * 100 : 100;
  
  return {
    level: currentLevel.level,
    name: currentLevel.name,
    icon: currentLevel.icon,
    progress: Math.min(progress, 100),
    nextLevelXP: nextLevel.xpRequired,
  };
};

// Progress Management
export const getProgress = async (): Promise<UserProgress> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PROGRESS);
    if (data) {
      const progress = JSON.parse(data);
      // Reset daily count if it's a new day
      if (!isToday(progress.lastLearnDate)) {
        progress.cardsLearnedToday = 0;
      }
      return progress;
    }
    return initialProgress;
  } catch {
    return initialProgress;
  }
};

export const saveProgress = async (progress: UserProgress): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progress));
  } catch {}
};

export const addXP = async (amount: number): Promise<{ newXP: number; leveledUp: boolean; newLevel: number }> => {
  const progress = await getProgress();
  const oldLevel = calculateLevel(progress.xp).level;
  progress.xp += amount;
  const newLevelData = calculateLevel(progress.xp);
  progress.level = newLevelData.level;
  progress.lastLearnDate = getToday();
  await saveProgress(progress);
  
  return {
    newXP: progress.xp,
    leveledUp: newLevelData.level > oldLevel,
    newLevel: newLevelData.level,
  };
};

// Streak Management
export const getStreak = async (): Promise<StreakData> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.STREAK);
    if (data) {
      const streak = JSON.parse(data);
      // Check if streak is broken
      if (streak.lastActiveDate && !isToday(streak.lastActiveDate) && !isYesterday(streak.lastActiveDate)) {
        streak.currentStreak = 0;
      }
      return streak;
    }
    return initialStreak;
  } catch {
    return initialStreak;
  }
};

export const updateStreak = async (): Promise<{ streak: number; isNewDay: boolean; bonusXP: number }> => {
  const streakData = await getStreak();
  const today = getToday();
  let isNewDay = false;
  let bonusXP = 0;
  
  if (streakData.lastActiveDate !== today) {
    isNewDay = true;
    
    if (isYesterday(streakData.lastActiveDate)) {
      // Continue streak
      streakData.currentStreak += 1;
    } else if (streakData.lastActiveDate === null) {
      // First day
      streakData.currentStreak = 1;
    } else {
      // Streak broken, start new
      streakData.currentStreak = 1;
    }
    
    if (streakData.currentStreak > streakData.longestStreak) {
      streakData.longestStreak = streakData.currentStreak;
    }
    
    streakData.lastActiveDate = today;
    bonusXP = XP_VALUES.daily_bonus;
    
    await AsyncStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(streakData));
  }
  
  return { streak: streakData.currentStreak, isNewDay, bonusXP };
};

// Learned Cards Management
export const getLearnedCards = async (): Promise<Record<string, LearnedCard>> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.LEARNED_CARDS);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

export const markCardLearned = async (
  cardId: string, 
  confidence: 'mastered' | 'learning' | 'difficult'
): Promise<void> => {
  const cards = await getLearnedCards();
  const existing = cards[cardId];
  
  cards[cardId] = {
    cardId,
    timesStudied: (existing?.timesStudied || 0) + 1,
    lastStudied: new Date().toISOString(),
    confidence,
  };
  
  await AsyncStorage.setItem(STORAGE_KEYS.LEARNED_CARDS, JSON.stringify(cards));
  
  // Update progress
  const progress = await getProgress();
  if (!existing) {
    progress.totalCardsLearned += 1;
  }
  progress.cardsLearnedToday += 1;
  progress.lastLearnDate = getToday();
  await saveProgress(progress);
};

// Difficult Cards Management
export const getDifficultCards = async (): Promise<string[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.DIFFICULT_CARDS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const addDifficultCard = async (cardId: string): Promise<void> => {
  const cards = await getDifficultCards();
  if (!cards.includes(cardId)) {
    cards.push(cardId);
    await AsyncStorage.setItem(STORAGE_KEYS.DIFFICULT_CARDS, JSON.stringify(cards));
  }
};

export const removeDifficultCard = async (cardId: string): Promise<void> => {
  const cards = await getDifficultCards();
  const filtered = cards.filter(id => id !== cardId);
  await AsyncStorage.setItem(STORAGE_KEYS.DIFFICULT_CARDS, JSON.stringify(filtered));
};

// Achievements Management
export const getUnlockedAchievements = async (): Promise<string[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const unlockAchievement = async (achievementId: string): Promise<{ unlocked: boolean; achievement: typeof ACHIEVEMENTS[0] | null }> => {
  const unlocked = await getUnlockedAchievements();
  const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
  
  if (!achievement || unlocked.includes(achievementId)) {
    return { unlocked: false, achievement: null };
  }
  
  unlocked.push(achievementId);
  await AsyncStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(unlocked));
  
  // Award XP
  await addXP(achievement.xp);
  
  return { unlocked: true, achievement };
};

export const checkAchievements = async (): Promise<typeof ACHIEVEMENTS[0] | null> => {
  const progress = await getProgress();
  const streak = await getStreak();
  const learned = await getLearnedCards();
  const unlocked = await getUnlockedAchievements();
  
  const learnedCount = Object.keys(learned).length;
  const majorCount = Object.keys(learned).filter(id => id.startsWith('major_')).length;
  
  // Check each achievement
  if (learnedCount >= 1 && !unlocked.includes('first_card')) {
    const result = await unlockAchievement('first_card');
    if (result.unlocked) return result.achievement;
  }
  if (learnedCount >= 10 && !unlocked.includes('ten_cards')) {
    const result = await unlockAchievement('ten_cards');
    if (result.unlocked) return result.achievement;
  }
  if (majorCount >= 22 && !unlocked.includes('all_major')) {
    const result = await unlockAchievement('all_major');
    if (result.unlocked) return result.achievement;
  }
  if (learnedCount >= 78 && !unlocked.includes('all_cards')) {
    const result = await unlockAchievement('all_cards');
    if (result.unlocked) return result.achievement;
  }
  if (streak.currentStreak >= 3 && !unlocked.includes('streak_3')) {
    const result = await unlockAchievement('streak_3');
    if (result.unlocked) return result.achievement;
  }
  if (streak.currentStreak >= 7 && !unlocked.includes('streak_7')) {
    const result = await unlockAchievement('streak_7');
    if (result.unlocked) return result.achievement;
  }
  if (streak.currentStreak >= 30 && !unlocked.includes('streak_30')) {
    const result = await unlockAchievement('streak_30');
    if (result.unlocked) return result.achievement;
  }
  if (progress.perfectQuizzes >= 1 && !unlocked.includes('quiz_perfect')) {
    const result = await unlockAchievement('quiz_perfect');
    if (result.unlocked) return result.achievement;
  }
  if (progress.quizzesCompleted >= 10 && !unlocked.includes('quiz_10')) {
    const result = await unlockAchievement('quiz_10');
    if (result.unlocked) return result.achievement;
  }
  if (progress.bestCombo >= 5 && !unlocked.includes('combo_5')) {
    const result = await unlockAchievement('combo_5');
    if (result.unlocked) return result.achievement;
  }
  if (progress.bestCombo >= 10 && !unlocked.includes('combo_10')) {
    const result = await unlockAchievement('combo_10');
    if (result.unlocked) return result.achievement;
  }
  
  return null;
};

// Quiz Stats
export const getQuizStats = async (): Promise<QuizStats> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.QUIZ_STATS);
    return data ? JSON.parse(data) : initialQuizStats;
  } catch {
    return initialQuizStats;
  }
};

export const updateQuizStats = async (correct: number, total: number, isPerfect: boolean): Promise<void> => {
  const stats = await getQuizStats();
  stats.totalQuestions += total;
  stats.correctAnswers += correct;
  stats.wrongAnswers += (total - correct);
  stats.averageScore = stats.totalQuestions > 0 
    ? Math.round((stats.correctAnswers / stats.totalQuestions) * 100) 
    : 0;
  
  await AsyncStorage.setItem(STORAGE_KEYS.QUIZ_STATS, JSON.stringify(stats));
  
  // Update progress
  const progress = await getProgress();
  progress.quizzesCompleted += 1;
  if (isPerfect) {
    progress.perfectQuizzes += 1;
  }
  await saveProgress(progress);
};

export const updateBestCombo = async (combo: number): Promise<void> => {
  const progress = await getProgress();
  if (combo > progress.bestCombo) {
    progress.bestCombo = combo;
    await saveProgress(progress);
  }
};

// Reset all data (for testing)
export const resetAllData = async (): Promise<void> => {
  await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
};
