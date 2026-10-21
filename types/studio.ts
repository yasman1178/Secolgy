export type MotionType = 'static' | 'zoom_in' | 'zoom_out' | 'pan_left' | 'pan_right';
export type TransitionType = 'cut' | 'fade' | 'dissolve';

export interface SceneV7 {
  scene_id: string; // e.g. "sc001"
  narration_text: string;
  image_filename: string; // e.g. "ch01_sc001_intro.png"
  image_prompt_en: string;
  motion: MotionType;
  transition: TransitionType;
  // Runtime fields:
  duration?: number; // duration in seconds (computed or estimated from audio)
  audioUrl?: string; // audio url or blob
  matchedImageData?: string; // data URL or blob URL of uploaded/generated image
  subtitleEn?: string;
  subtitleAr?: string;
  wordTimings?: Array<{ word: string; startSec: number; endSec: number }>;
}

export interface ChapterV7 {
  chapter_id: string;
  title: string;
  scenes: SceneV7[];
}

export interface ProjectInfoV7 {
  title: string;
  language: string; // "en"
  voice: string; // e.g. "en-GB-RyanNeural"
  target_minutes: number; // e.g. 28
}

export interface ThumbnailConceptV7 {
  concept: string;
  prompt_en: string;
  overlay_text: string;
}

export interface PublishInfoV7 {
  title_options: string[];
  description: string;
  tags: string[];
  thumbnails: ThumbnailConceptV7[];
  pinned_comment: string;
}

export interface ProjectV7 {
  project: ProjectInfoV7;
  chapters: ChapterV7[];
  publish: PublishInfoV7;
}

export interface ValidationReport {
  isValid: boolean;
  totalScenes: number;
  totalWords: number;
  estimatedMinutes: number;
  targetMinutes: number;
  durationDifferenceWarning?: string;
  missingImageCount: number;
  missingImageFilenames: string[];
  warnings: string[];
  errors: string[];
}

export type SubtitleDisplayMode = 'off' | 'en' | 'ar' | 'dual';
export type SubtitleFontFamily = 'Cairo' | 'Tajawal' | 'Outfit' | 'JetBrains Mono';

export interface SubtitleStyleSettings {
  displayMode: SubtitleDisplayMode;
  fontFamily: SubtitleFontFamily;
  fontSize: number; // px at 1080p scale, e.g. 42
  textColor: string;
  textSecondaryColor: string; // For dual subtitles secondary language
  backgroundColor: string; // semi-transparent bar e.g. rgba(10, 15, 30, 0.75)
  backgroundPadding: number;
  positionY: number; // percent from bottom, default 8%
  showTextShadow: boolean;
  // Karaoke and glassmorphic enhancements
  karaokeEnabled: boolean;
  karaokeHighlightColor: string; // e.g. '#FDE047' (Gold) or '#38BDF8' (Cyan)
  backdropStyle: 'glassmorphic' | 'solid' | 'minimal';
  boxBorder: boolean;
}

export interface ChannelWatermarkSettings {
  enabled: boolean;
  channelName: string; // default "MachinaMind"
  tagline?: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  opacity: number; // 0.1 to 1.0, default 0.85
  scale: number; // 0.8 to 1.5, default 1.0
}

export interface VoiceProfile {
  id: string;
  name: string;
  accent: 'British' | 'American';
  tone: string;
  pitch: number; // e.g. -0.15 for deep baritone
  rate: number; // e.g. 0.95
}
