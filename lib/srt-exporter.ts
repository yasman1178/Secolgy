import { SceneV7 } from '@/types/studio';

function formatTimestamp(seconds: number, isVtt: boolean = false): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  const hStr = hrs.toString().padStart(2, '0');
  const mStr = mins.toString().padStart(2, '0');
  const sStr = secs.toString().padStart(2, '0');
  const msStr = ms.toString().padStart(3, '0');

  if (isVtt) {
    return `${hStr}:${mStr}:${sStr}.${msStr}`;
  }
  return `${hStr}:${mStr}:${sStr},${msStr}`;
}

export function generateSrt(
  scenes: SceneV7[],
  language: 'en' | 'ar' | 'dual' = 'en'
): string {
  let srt = '';
  let currentTime = 0;
  let index = 1;

  for (const scene of scenes) {
    const duration = scene.duration || 10;
    const startTime = currentTime;
    const endTime = currentTime + duration;
    currentTime = endTime + 0.3; // subtle pause between scenes

    let text = '';
    if (language === 'en') {
      text = scene.subtitleEn || scene.narration_text;
    } else if (language === 'ar') {
      text = scene.subtitleAr || scene.subtitleEn || scene.narration_text;
    } else {
      // Dual: English on top, Arabic below
      const en = scene.subtitleEn || scene.narration_text;
      const ar = scene.subtitleAr || '';
      text = ar ? `${en}\n${ar}` : en;
    }

    srt += `${index}\n`;
    srt += `${formatTimestamp(startTime, false)} --> ${formatTimestamp(endTime, false)}\n`;
    srt += `${text.trim()}\n\n`;
    index++;
  }

  return srt;
}

export function generateVtt(
  scenes: SceneV7[],
  language: 'en' | 'ar' | 'dual' = 'en'
): string {
  let vtt = 'WEBVTT\n\n';
  let currentTime = 0;
  let index = 1;

  for (const scene of scenes) {
    const duration = scene.duration || 10;
    const startTime = currentTime;
    const endTime = currentTime + duration;
    currentTime = endTime + 0.3;

    let text = '';
    if (language === 'en') {
      text = scene.subtitleEn || scene.narration_text;
    } else if (language === 'ar') {
      text = scene.subtitleAr || scene.subtitleEn || scene.narration_text;
    } else {
      const en = scene.subtitleEn || scene.narration_text;
      const ar = scene.subtitleAr || '';
      text = ar ? `${en}\n${ar}` : en;
    }

    vtt += `${index}\n`;
    vtt += `${formatTimestamp(startTime, true)} --> ${formatTimestamp(endTime, true)}\n`;
    vtt += `${text.trim()}\n\n`;
    index++;
  }

  return vtt;
}

export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
