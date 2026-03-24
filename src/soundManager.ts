import { Audio } from 'expo-av';
import { Platform } from 'react-native';

// Sound effect types
type SoundType = 
  | 'correct' 
  | 'wrong' 
  | 'flip' 
  | 'levelUp' 
  | 'achievement' 
  | 'xp' 
  | 'click'
  | 'combo'
  | 'streak';

// Sound URLs (using free sound effects)
const SOUND_URLS: Record<SoundType, string> = {
  correct: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3', // Success chime
  wrong: 'https://assets.mixkit.co/active_storage/sfx/2001/2001-preview.mp3', // Error tone
  flip: 'https://assets.mixkit.co/active_storage/sfx/2073/2073-preview.mp3', // Card flip
  levelUp: 'https://assets.mixkit.co/active_storage/sfx/1997/1997-preview.mp3', // Level up fanfare
  achievement: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3', // Achievement unlock
  xp: 'https://assets.mixkit.co/active_storage/sfx/2004/2004-preview.mp3', // XP gain
  click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3', // Button click
  combo: 'https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3', // Combo
  streak: 'https://assets.mixkit.co/active_storage/sfx/2021/2021-preview.mp3', // Streak
};

// Cache for loaded sounds
const soundCache: Partial<Record<SoundType, Audio.Sound>> = {};

// Sound enabled state
let soundEnabled = true;

// Initialize audio mode
const initializeAudio = async () => {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
  } catch (error) {
    console.log('Audio initialization error:', error);
  }
};

// Preload a specific sound
const preloadSound = async (type: SoundType): Promise<Audio.Sound | null> => {
  if (soundCache[type]) {
    return soundCache[type]!;
  }

  try {
    const { sound } = await Audio.Sound.createAsync(
      { uri: SOUND_URLS[type] },
      { shouldPlay: false, volume: 0.5 }
    );
    soundCache[type] = sound;
    return sound;
  } catch (error) {
    console.log(`Failed to load sound ${type}:`, error);
    return null;
  }
};

// Play a sound effect
export const playSound = async (type: SoundType): Promise<void> => {
  if (!soundEnabled) return;
  
  // Skip on web for now (can cause issues)
  if (Platform.OS === 'web') {
    console.log(`[Sound] ${type}`);
    return;
  }

  try {
    let sound = soundCache[type];
    
    if (!sound) {
      sound = await preloadSound(type);
    }
    
    if (sound) {
      await sound.setPositionAsync(0);
      await sound.playAsync();
    }
  } catch (error) {
    console.log(`Failed to play sound ${type}:`, error);
  }
};

// Preload all sounds (call on app start)
export const preloadAllSounds = async (): Promise<void> => {
  await initializeAudio();
  
  // Only preload on native platforms
  if (Platform.OS === 'web') return;
  
  const soundTypes: SoundType[] = ['correct', 'wrong', 'flip', 'levelUp', 'achievement', 'xp', 'click', 'combo'];
  
  for (const type of soundTypes) {
    await preloadSound(type);
  }
};

// Cleanup sounds (call on app unmount)
export const unloadAllSounds = async (): Promise<void> => {
  for (const sound of Object.values(soundCache)) {
    if (sound) {
      try {
        await sound.unloadAsync();
      } catch {}
    }
  }
};

// Toggle sound on/off
export const setSoundEnabled = (enabled: boolean): void => {
  soundEnabled = enabled;
};

export const isSoundEnabled = (): boolean => {
  return soundEnabled;
};

// Convenience functions for specific sounds
export const playCorrectSound = () => playSound('correct');
export const playWrongSound = () => playSound('wrong');
export const playFlipSound = () => playSound('flip');
export const playLevelUpSound = () => playSound('levelUp');
export const playAchievementSound = () => playSound('achievement');
export const playXPSound = () => playSound('xp');
export const playClickSound = () => playSound('click');
export const playComboSound = () => playSound('combo');
export const playStreakSound = () => playSound('streak');
