import { VoiceProfile } from '@/types/studio';

export const DEEP_BRITISH_VOICE_PROFILES: VoiceProfile[] = [
  {
    id: 'en-GB-RyanNeural',
    name: 'Ryan (BBC Documentary)',
    accent: 'British',
    tone: 'Deep, calculating, historical documentary authority',
    pitch: -0.15,
    rate: 0.95,
  },
  {
    id: 'en-GB-OliverNeural',
    name: 'Oliver (Nature & Essayist)',
    accent: 'British',
    tone: 'Gravelly, resonant baritone with philosophical cadence',
    pitch: -0.18,
    rate: 0.92,
  },
  {
    id: 'en-GB-ThomasNeural',
    name: 'Thomas (Broadcast Narrator)',
    accent: 'British',
    tone: 'Refined BBC world service deep timbre',
    pitch: -0.12,
    rate: 0.96,
  },
  {
    id: 'en-GB-BrianNeural',
    name: 'Brian (Elder Historian)',
    accent: 'British',
    tone: 'Deep, weathered wisdom, perfect for Machiavelli & history',
    pitch: -0.2,
    rate: 0.9,
  },
  {
    id: 'en-US-ChristopherNeural',
    name: 'Christopher (Cinematic Deep)',
    accent: 'American',
    tone: 'Deep film trailer and essayist voice',
    pitch: -0.15,
    rate: 0.94,
  },
];

export interface WordBoundary {
  word: string;
  startSec: number;
  endSec: number;
}

/**
 * Calculates approximate word timing boundaries for smooth karaoke display
 */
export function calculateWordBoundaries(
  text: string,
  totalDuration: number,
  rate: number = 1.0
): WordBoundary[] {
  if (!text) return [];
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  // Account for word lengths (longer words take slightly longer to articulate)
  const totalWeight = words.reduce((acc, w) => acc + Math.max(1, w.length * 0.15 + 1), 0);
  const speechBudget = Math.max(0.5, totalDuration - 0.6); // reserve last 0.6s for breath/pause

  let currentStart = 0;
  return words.map((word) => {
    const weight = Math.max(1, word.length * 0.15 + 1);
    const duration = (weight / totalWeight) * speechBudget;
    const end = currentStart + duration;
    const boundary: WordBoundary = {
      word,
      startSec: Math.round(currentStart * 100) / 100,
      endSec: Math.round(end * 100) / 100,
    };
    currentStart = end;
    return boundary;
  });
}

/**
 * Generates speech for a scene using Web Speech API with fallback
 */
export function playVoiceSample(
  text: string,
  profile: VoiceProfile,
  onEnd?: () => void
): SpeechSynthesisUtterance | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = profile.accent === 'British' ? 'en-GB' : 'en-US';
  utterance.rate = profile.rate;
  // Note: pitch in Web Speech API is 0.0 to 2.0 (1.0 is default, 0.7-0.85 is deep baritone)
  utterance.pitch = Math.max(0.5, Math.min(1.5, 1.0 + profile.pitch));

  const voices = window.speechSynthesis.getVoices();
  // Find closest matching British/English voice
  const preferredVoice =
    voices.find((v) => v.lang.startsWith(profile.accent === 'British' ? 'en-GB' : 'en-US') && (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Male') || v.name.includes('Google'))) ||
    voices.find((v) => v.lang.startsWith(profile.accent === 'British' ? 'en-GB' : 'en-US')) ||
    voices.find((v) => v.lang.startsWith('en'));

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = () => onEnd();
  }

  window.speechSynthesis.speak(utterance);
  return utterance;
}
