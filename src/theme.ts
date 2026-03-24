// DIAROT Tarot - Original Farbpalette
// Cinematic, soft, elegant - kein reines Weiß, alles gedämpft

export const COLORS = {
  // BASE - Hintergrund (Dark Mode)
  background: '#0A0A0A',
  backgroundLight: '#111111',
  surface: '#1A1A1A',
  surfaceLight: '#222222',
  surfaceDark: '#0D0D0D',
  
  // PRIMARY - Gold (Luxury) für Rahmen, Schrift, Highlights
  primary: '#D6C3A3',
  primaryBright: '#CBB08A',
  primaryDark: '#BFA074',
  primaryDim: '#A88C5A',
  primaryMuted: '#8B7347',
  
  // LIGHT - Diamant / Glow für Lichtstellen, Highlights
  text: '#F5F3EF',
  textSecondary: '#EAE7E1',
  textMuted: '#DCD7CF',
  textDark: '#CFC7BD',
  
  // SHADOWS - Tiefe (Kontraste ohne hartes Schwarz)
  shadow: '#2A2A2A',
  shadowMedium: '#3A3A3A',
  shadowLight: '#4A4A4A',
  
  // Borders
  border: '#2A2A2A',
  borderGold: '#D6C3A3',
  borderGoldDim: 'rgba(214, 195, 163, 0.3)',
  
  // STATUS
  success: '#7A8F85',
  successGlow: 'rgba(122, 143, 133, 0.3)',
  error: '#A44B1A',
  errorGlow: 'rgba(164, 75, 26, 0.3)',
  
  // GLOW EFFECTS
  goldGlow: 'rgba(214, 195, 163, 0.15)',
  goldGlowStrong: 'rgba(214, 195, 163, 0.3)',
  
  // ELEMENT COLORS (for suits)
  // WANDS - Feuerenergie (Wärme, Power, Bewegung)
  wands: '#C46A2D',
  wandsDark: '#A44B1A',
  wandsLight: '#E2A15B',
  wandsDeep: '#6B3A1A',
  
  // SWORDS - Klarheit (Luft, Fokus, Kühle)
  swords: '#C9D6E3',
  swordsMedium: '#A8B8C8',
  swordsDark: '#7F93A6',
  swordsDeep: '#4F6478',
  
  // CUPS - Emotion (weich, ruhig, tief)
  cups: '#D8C6C6',
  cupsMedium: '#C9B2B2',
  cupsDark: '#BFA3A3',
  cupsDeep: '#9E8A8A',
  
  // PENTACLES - using gold tones
  pentacles: '#BFA074',
  pentaclesMedium: '#A88C5A',
  pentaclesDark: '#8B7347',
  pentaclesDeep: '#6B5A3A',
  
  // ACCENT - Balance (Natur / Ausgleich / Details)
  accent: '#7A8F85',
  accentDark: '#5F6F66',
  
  // MAJOR ARCANA - using diamond glow
  major: '#D6C3A3',
  majorDark: '#BFA074',
  
  // GAMIFICATION
  xp: '#D6C3A3',
  streak: '#C46A2D',
  achievement: '#7A8F85',
  levelUp: '#CBB08A',
};

export const FONTS = {
  cinzel: 'Cinzel_400Regular',
  cinzelBold: 'Cinzel_700Bold',
  script: 'GreatVibes_400Regular',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const BORDER_RADIUS = {
  sm: 6,
  md: 12,
  lg: 20,
  xl: 28,
  full: 100,
};

export const SHADOWS = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  cardGlow: {
    shadowColor: '#D6C3A3',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
  },
  button: {
    shadowColor: '#D6C3A3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  glow: {
    shadowColor: '#D6C3A3',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
};

export const SUIT_ICONS: Record<string, string> = {
  wands: 'flame-outline',
  cups: 'water-outline',
  swords: 'flash-outline',
  pentacles: 'ellipse-outline',
};

// Suit-specific background colors (all use dark background)
export const SUIT_COLORS: Record<string, string> = {
  wands: '#1A1A1A',
  cups: '#1A1A1A',
  swords: '#1A1A1A',
  pentacles: '#1A1A1A',
  major: '#1A1A1A',
};

// Suit-specific accent colors
export const SUIT_ACCENTS: Record<string, string> = {
  wands: '#C46A2D',
  cups: '#D8C6C6',
  swords: '#C9D6E3',
  pentacles: '#BFA074',
  major: '#D6C3A3',
};

// GAMIFICATION CONSTANTS
export const LEVELS = [
  { level: 1, name: 'Anfänger', xpRequired: 0, icon: 'leaf-outline' },
  { level: 2, name: 'Lernend', xpRequired: 100, icon: 'book-outline' },
  { level: 3, name: 'Intuitiv', xpRequired: 300, icon: 'eye-outline' },
  { level: 4, name: 'Fortgeschritten', xpRequired: 600, icon: 'star-outline' },
  { level: 5, name: 'Tarot Reader', xpRequired: 1000, icon: 'sparkles' },
  { level: 6, name: 'Meister', xpRequired: 1500, icon: 'diamond-outline' },
  { level: 7, name: 'Mystiker', xpRequired: 2500, icon: 'moon-outline' },
  { level: 8, name: 'Erleuchteter', xpRequired: 4000, icon: 'sunny-outline' },
];

export const ACHIEVEMENTS = [
  { id: 'first_card', name: 'Erste Karte', desc: 'Lerne deine erste Karte', icon: 'ribbon-outline', xp: 10 },
  { id: 'ten_cards', name: '10 Karten', desc: 'Lerne 10 Karten', icon: 'school-outline', xp: 25 },
  { id: 'all_major', name: 'Große Arkana', desc: 'Lerne alle 22 Große Arkana', icon: 'star-outline', xp: 100 },
  { id: 'all_cards', name: 'Komplettes Deck', desc: 'Lerne alle 78 Karten', icon: 'trophy-outline', xp: 500 },
  { id: 'streak_3', name: '3 Tage Streak', desc: '3 Tage am Stück lernen', icon: 'flame-outline', xp: 30 },
  { id: 'streak_7', name: 'Wochenstreak', desc: '7 Tage am Stück lernen', icon: 'flame', xp: 75 },
  { id: 'streak_30', name: 'Monatsstreak', desc: '30 Tage am Stück lernen', icon: 'bonfire-outline', xp: 300 },
  { id: 'quiz_perfect', name: 'Perfektes Quiz', desc: 'Quiz ohne Fehler abschließen', icon: 'checkmark-circle-outline', xp: 50 },
  { id: 'quiz_10', name: 'Quiz-Fan', desc: '10 Quizze spielen', icon: 'help-circle-outline', xp: 40 },
  { id: 'combo_5', name: '5er Combo', desc: '5 Fragen richtig am Stück', icon: 'flash-outline', xp: 20 },
  { id: 'combo_10', name: '10er Combo', desc: '10 Fragen richtig am Stück', icon: 'thunderstorm-outline', xp: 50 },
];

// XP VALUES
export const XP_VALUES = {
  learn_knew: 10,
  learn_unsure: 5,
  learn_repeat: 2,
  quiz_correct: 15,
  quiz_wrong: 0,
  combo_bonus: 5,
  daily_bonus: 25,
  perfect_quiz: 50,
};
