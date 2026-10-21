/**
 * Utility functions to sanitize YouTube descriptions, tags, and titles.
 * Removes invisible zero-width characters, fixes broken divider lines,
 * removes stray punctuation artifacts, and formats chapters.
 */

export function sanitizeText(input: string): string {
  if (!input) return '';

  let text = input;

  // 1. Remove zero-width characters and invisible control chars
  // \u200B (zero-width space), \u200C (zero-width non-joiner), \u200D (zero-width joiner),
  // \uFEFF (zero-width no-break space / BOM), \u00AD (soft hyphen)
  text = text.replace(/[\u200B\u200C\u200D\uFEFF\u00AD\u2060\u200E\u200F]/g, '');

  // 2. Repair broken divider lines (e.g., mismatched ━ or ─ or -)
  text = text.replace(/[━─—–-]{4,}/g, '━━━━━━━━━━━━━━━━━━━━━━━━━');

  // 3. Remove stray words immediately clinging to question marks/punctuation e.g. "?جديد" or "? جديد" at line breaks
  text = text.replace(/\?\s*جديد\b/g, '?');

  // 4. Clean stray spaces around brackets and punctuation
  text = text.replace(/[ \t]+/g, ' ');

  // 5. Collapse 3+ consecutive newlines into 2 (clean paragraph separation)
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

export function sanitizeTags(tags: string[]): string[] {
  const cleaned: string[] = [];
  const seen = new Set<string>();

  for (const rawTag of tags) {
    if (!rawTag) continue;
    // Remove # if included, strip zero-width chars, trim
    let tag = rawTag.replace(/^#/, '').replace(/[\u200B\u200C\u200D\uFEFF]/g, '').trim();
    const lower = tag.toLowerCase();
    if (tag.length > 0 && !seen.has(lower)) {
      seen.add(lower);
      cleaned.push(tag);
    }
  }

  return cleaned.slice(0, 30); // YouTube limit
}

export interface ChapterTimestamp {
  timeFormatted: string; // e.g. "00:00"
  seconds: number;
  title: string;
}

export function generateYouTubeChapters(
  scenes: Array<{ scene_id: string; narration_text: string; duration?: number }>,
  chapterTitle?: string
): string {
  if (!scenes || scenes.length === 0) return '';

  let accumulatedSeconds = 0;
  const chapters: ChapterTimestamp[] = [];

  // YouTube rule: First chapter MUST start at 00:00
  chapters.push({
    timeFormatted: '00:00',
    seconds: 0,
    title: chapterTitle || 'Introduction: The Architecture of Power',
  });

  // Aggregate scenes into meaningful chapter blocks of >= 45 seconds
  let currentBlockStart = 0;
  let currentBlockSeconds = 0;
  let blockIndex = 1;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const duration = scene.duration || Math.max(8, Math.round((scene.narration_text.split(/\s+/).length / 140) * 60));
    currentBlockSeconds += duration;
    accumulatedSeconds += duration;

    // Create a new chapter every ~120-180 seconds or every 5-6 scenes
    if (i < scenes.length - 1 && currentBlockSeconds >= 120 && (accumulatedSeconds - currentBlockStart) >= 90) {
      const minutes = Math.floor(accumulatedSeconds / 60);
      const seconds = Math.floor(accumulatedSeconds % 60);
      const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      const snippet = scene.narration_text.split('.')[0]?.slice(0, 40) || `Part ${blockIndex + 1}`;
      chapters.push({
        timeFormatted,
        seconds: accumulatedSeconds,
        title: snippet.trim(),
      });
      currentBlockStart = accumulatedSeconds;
      currentBlockSeconds = 0;
      blockIndex++;
    }
  }

  return chapters.map((c) => `${c.timeFormatted} - ${c.title}`).join('\n');
}

export function estimateSceneDuration(narrationText: string): number {
  if (!narrationText) return 8;
  const words = narrationText.trim().split(/\s+/).filter(Boolean).length;
  // Standard English documentary pacing: ~135-145 words per minute (2.3 words/sec) + 0.8s pause
  const seconds = (words / 140) * 60 + 0.8;
  return Math.max(6, Math.round(seconds * 10) / 10);
}
