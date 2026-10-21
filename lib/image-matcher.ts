import { SceneV7 } from '@/types/studio';

/**
 * Natural comparison for sorting strings with embedded numbers (e.g., 'img_1.png', 'img_2.png', 'img_10.png')
 */
export function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * Removes file extension and normalizes string
 */
export function getFileStem(filename: string): string {
  if (!filename) return '';
  const lastDotIndex = filename.lastIndexOf('.');
  const base = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
  return base.toLowerCase().trim();
}

/**
 * Extracts all integer numbers found in a filename
 * e.g., "ch01_sc005_intro.png" -> [1, 5]
 * "1.jpg" -> [1]
 * "scene_12.png" -> [12]
 */
export function extractNumbers(str: string): number[] {
  if (!str) return [];
  const matches = str.match(/\d+/g);
  if (!matches) return [];
  return matches.map((m) => parseInt(m, 10)).filter((n) => !isNaN(n));
}

export interface MatchResult {
  sceneIndex: number;
  file: File;
  strategy: 'exact_name' | 'scene_id' | 'number' | 'order' | 'token';
  confidence: number;
}

export interface SmartMatchReport {
  matches: Map<number, MatchResult>; // sceneIndex -> MatchResult
  unmatchedFiles: File[];
  totalMatched: number;
  totalScenes: number;
}

/**
 * Multi-Strategy Smart Image Matcher
 */
export function smartMatchFilesToScenes(
  files: File[],
  scenes: SceneV7[]
): SmartMatchReport {
  const matches = new Map<number, MatchResult>();
  const usedFileNames = new Set<string>();

  // Sort files naturally first
  const sortedFiles = [...files].sort((a, b) => naturalCompare(a.name, b.name));

  // --- Strategy 1: Exact Name or Stem Equality ---
  for (let sIdx = 0; sIdx < scenes.length; sIdx++) {
    const scene = scenes[sIdx];
    const targetFile = (scene.image_filename || '').toLowerCase().trim();
    const targetStem = getFileStem(targetFile);

    for (const file of sortedFiles) {
      if (usedFileNames.has(file.name)) continue;

      const fileNameLower = file.name.toLowerCase().trim();
      const fileStem = getFileStem(file.name);

      if (fileNameLower === targetFile || fileStem === targetStem) {
        matches.set(sIdx, {
          sceneIndex: sIdx,
          file,
          strategy: 'exact_name',
          confidence: 1.0,
        });
        usedFileNames.add(file.name);
        break;
      }
    }
  }

  // --- Strategy 2: Scene ID Match (e.g. "sc001", "sc01", "scene_1") ---
  for (let sIdx = 0; sIdx < scenes.length; sIdx++) {
    if (matches.has(sIdx)) continue;
    const scene = scenes[sIdx];
    const sceneId = (scene.scene_id || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    for (const file of sortedFiles) {
      if (usedFileNames.has(file.name)) continue;

      const fileStem = getFileStem(file.name).replace(/[^a-z0-9]/g, '');
      if (sceneId && (fileStem === sceneId || fileStem.includes(sceneId))) {
        matches.set(sIdx, {
          sceneIndex: sIdx,
          file,
          strategy: 'scene_id',
          confidence: 0.95,
        });
        usedFileNames.add(file.name);
        break;
      }
    }
  }

  // --- Strategy 3: Number Extraction Match ---
  // e.g. file is "1.png" or "01.jpg" and scene is scene 1 (index 0) or has number 1
  for (let sIdx = 0; sIdx < scenes.length; sIdx++) {
    if (matches.has(sIdx)) continue;
    const scene = scenes[sIdx];
    const sceneNumbers = [
      ...extractNumbers(scene.scene_id || ''),
      ...extractNumbers(scene.image_filename || ''),
      sIdx + 1, // 1-based scene index
    ];

    for (const file of sortedFiles) {
      if (usedFileNames.has(file.name)) continue;

      const fileNumbers = extractNumbers(file.name);
      if (fileNumbers.length === 0) continue;

      // Check if file number matches scene sequence number (e.g. file number 1 -> scene 1)
      const primaryFileNumber = fileNumbers[fileNumbers.length - 1]; // last number in file name is usually scene number
      const primarySceneNumber = sceneNumbers[sceneNumbers.length - 1]; // 1-based index or scene num

      const hasMatch =
        fileNumbers.some((fn) => sceneNumbers.includes(fn)) ||
        primaryFileNumber === sIdx + 1 ||
        primaryFileNumber === primarySceneNumber;

      if (hasMatch) {
        matches.set(sIdx, {
          sceneIndex: sIdx,
          file,
          strategy: 'number',
          confidence: 0.85,
        });
        usedFileNames.add(file.name);
        break;
      }
    }
  }

  // --- Strategy 4: Sequential Fallback Match (If still unmatched scenes exist) ---
  const remainingFiles = sortedFiles.filter((f) => !usedFileNames.has(f.name));
  let remIdx = 0;

  for (let sIdx = 0; sIdx < scenes.length; sIdx++) {
    if (matches.has(sIdx)) continue;
    if (remIdx < remainingFiles.length) {
      const file = remainingFiles[remIdx];
      matches.set(sIdx, {
        sceneIndex: sIdx,
        file,
        strategy: 'order',
        confidence: 0.7,
      });
      usedFileNames.add(file.name);
      remIdx++;
    }
  }

  const finalUnmatched = sortedFiles.filter((f) => !usedFileNames.has(f.name));

  return {
    matches,
    unmatchedFiles: finalUnmatched,
    totalMatched: matches.size,
    totalScenes: scenes.length,
  };
}

/**
 * Sequential-only matching (Strict 1-to-1 order matching)
 */
export function sequentialMatchFiles(
  files: File[],
  scenes: SceneV7[]
): SmartMatchReport {
  const matches = new Map<number, MatchResult>();
  const sortedFiles = [...files].sort((a, b) => naturalCompare(a.name, b.name));

  const count = Math.min(sortedFiles.length, scenes.length);
  for (let i = 0; i < count; i++) {
    matches.set(i, {
      sceneIndex: i,
      file: sortedFiles[i],
      strategy: 'order',
      confidence: 1.0,
    });
  }

  const unmatched = sortedFiles.slice(count);

  return {
    matches,
    unmatchedFiles: unmatched,
    totalMatched: count,
    totalScenes: scenes.length,
  };
}

/**
 * Reads a File into a Data URL asynchronously with Promise
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
