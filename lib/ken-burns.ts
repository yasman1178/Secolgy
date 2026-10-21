import { MotionType, SubtitleStyleSettings, ChannelWatermarkSettings } from '@/types/studio';

export interface RenderFrameParams {
  ctx: CanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;
  currentImage: HTMLImageElement | null;
  previousImage: HTMLImageElement | null;
  progress: number; // 0.0 to 1.0 in current scene
  sceneElapsed?: number; // current elapsed seconds in this scene
  sceneDuration?: number; // total duration of current scene in seconds
  motion: MotionType;
  transitionProgress: number; // 0.0 to 1.0 during transition (e.g. first 0.6s)
  transitionType: 'cut' | 'fade' | 'dissolve';
  subtitleEn?: string;
  subtitleAr?: string;
  wordTimings?: Array<{ word: string; startSec: number; endSec: number }>;
  subtitleSettings: SubtitleStyleSettings;
  watermarkSettings: ChannelWatermarkSettings;
}

export function draw16x9Frame({
  ctx,
  canvasWidth,
  canvasHeight,
  currentImage,
  previousImage,
  progress,
  sceneElapsed = 0,
  sceneDuration = 10,
  motion,
  transitionProgress,
  transitionType,
  subtitleEn,
  subtitleAr,
  wordTimings,
  subtitleSettings,
  watermarkSettings,
}: RenderFrameParams) {
  // Clear canvas with deep dark baseline
  ctx.fillStyle = '#050811';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // 1. Draw Image with Ken Burns transformation
  if (currentImage && currentImage.complete && currentImage.naturalWidth > 0) {
    ctx.save();

    // If dissolve or fade transition from previous image
    if (previousImage && previousImage.complete && transitionProgress < 1.0 && transitionType !== 'cut') {
      if (transitionType === 'dissolve') {
        drawImageWithMotion(ctx, previousImage, canvasWidth, canvasHeight, 1.0, motion);
        ctx.globalAlpha = transitionProgress;
        drawImageWithMotion(ctx, currentImage, canvasWidth, canvasHeight, progress, motion);
        ctx.globalAlpha = 1.0;
      } else if (transitionType === 'fade') {
        if (transitionProgress < 0.5) {
          const fadeOutAlpha = 1.0 - transitionProgress * 2;
          ctx.globalAlpha = fadeOutAlpha;
          drawImageWithMotion(ctx, previousImage, canvasWidth, canvasHeight, 1.0, motion);
          ctx.globalAlpha = 1.0;
        } else {
          const fadeInAlpha = (transitionProgress - 0.5) * 2;
          ctx.globalAlpha = fadeInAlpha;
          drawImageWithMotion(ctx, currentImage, canvasWidth, canvasHeight, progress, motion);
          ctx.globalAlpha = 1.0;
        }
      }
    } else {
      // Normal continuous scene render
      drawImageWithMotion(ctx, currentImage, canvasWidth, canvasHeight, progress, motion);
    }

    ctx.restore();
  } else {
    // Elegant fallback canvas
    drawFallbackCanvas(ctx, canvasWidth, canvasHeight);
  }

  // 2. Draw MachinaMind Channel Watermark Overlay
  if (watermarkSettings.enabled) {
    drawWatermark(ctx, canvasWidth, canvasHeight, watermarkSettings);
  }

  // 3. Draw Subtitles with Karaoke & Glassmorphic Backdrop
  if (subtitleSettings.displayMode !== 'off') {
    drawSubtitles({
      ctx,
      w: canvasWidth,
      h: canvasHeight,
      subEn: subtitleEn,
      subAr: subtitleAr,
      sceneElapsed,
      sceneDuration,
      wordTimings,
      settings: subtitleSettings,
    });
  }
}

function drawImageWithMotion(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
  progress: number,
  motion: MotionType
) {
  const t = Math.max(0, Math.min(1, progress));

  const imgRatio = img.naturalWidth / img.naturalHeight;
  const canvasRatio = w / h;

  let baseScale = 1.0;
  if (imgRatio > canvasRatio) {
    baseScale = h / img.naturalHeight;
  } else {
    baseScale = w / img.naturalWidth;
  }

  let scale = 1.0;
  let offsetX = 0;
  let offsetY = 0;

  switch (motion) {
    case 'zoom_in':
      scale = 1.0 + t * 0.12; // 1.0 -> 1.12
      break;
    case 'zoom_out':
      scale = 1.12 - t * 0.12; // 1.12 -> 1.0
      break;
    case 'pan_left':
      scale = 1.08;
      offsetX = (0.5 - t) * 60;
      break;
    case 'pan_right':
      scale = 1.08;
      offsetX = (t - 0.5) * 60;
      break;
    case 'static':
    default:
      scale = 1.02;
      break;
  }

  const finalScale = baseScale * scale;
  const drawWidth = img.naturalWidth * finalScale;
  const drawHeight = img.naturalHeight * finalScale;

  const centerX = w / 2 + offsetX;
  const centerY = h / 2 + offsetY;

  const dx = centerX - drawWidth / 2;
  const dy = centerY - drawHeight / 2;

  ctx.drawImage(img, dx, dy, drawWidth, drawHeight);

  // Cinematic lower-third gradient for subtitle readability
  const vignette = ctx.createLinearGradient(0, h * 0.65, 0, h);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.78)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, h * 0.65, w, h * 0.35);
}

function drawFallbackCanvas(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#0F172A');
  grad.addColorStop(1, '#020617');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 2;
  ctx.strokeRect(60, 60, w - 120, h - 120);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = `600 24px 'Outfit', sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('16:9 PREVIEW STAGE (1920 × 1080)', w / 2, h / 2);
}

function drawWatermark(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  settings: ChannelWatermarkSettings
) {
  ctx.save();
  ctx.globalAlpha = settings.opacity;

  const padding = 50;
  let x = w - padding;
  let y = padding + 28;
  let align: CanvasTextAlign = 'right';

  if (settings.position === 'top-left') {
    x = padding;
    y = padding + 28;
    align = 'left';
  } else if (settings.position === 'bottom-left') {
    x = padding;
    y = h - padding;
    align = 'left';
  } else if (settings.position === 'bottom-right') {
    x = w - padding;
    y = h - padding;
    align = 'right';
  }

  ctx.textAlign = align;
  ctx.textBaseline = 'middle';

  const fontSize = Math.round(24 * settings.scale);
  ctx.font = `800 ${fontSize}px 'Outfit', sans-serif`;
  
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(settings.channelName.toUpperCase(), x, y);

  if (align === 'right') {
    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.arc(x - (settings.channelName.length * fontSize * 0.6) - 12, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

interface DrawSubtitlesArgs {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  subEn?: string;
  subAr?: string;
  sceneElapsed: number;
  sceneDuration: number;
  wordTimings?: Array<{ word: string; startSec: number; endSec: number }>;
  settings: SubtitleStyleSettings;
}

function drawSubtitles({
  ctx,
  w,
  h,
  subEn,
  subAr,
  sceneElapsed,
  sceneDuration,
  wordTimings,
  settings,
}: DrawSubtitlesArgs) {
  let primaryText = '';
  let secondaryText = '';
  let isPrimaryArabic = false;

  switch (settings.displayMode) {
    case 'en':
      primaryText = subEn || '';
      break;
    case 'ar':
      primaryText = subAr || subEn || '';
      isPrimaryArabic = Boolean(subAr);
      break;
    case 'dual':
      primaryText = subEn || '';
      secondaryText = subAr || '';
      break;
    default:
      return;
  }

  if (!primaryText && !secondaryText) return;

  ctx.save();

  const scaleFactor = w / 1920;
  const fontSize = Math.round(settings.fontSize * scaleFactor);
  const secondaryFontSize = Math.round(fontSize * 0.88);
  const fontName = settings.fontFamily || 'Cairo';
  const yBottom = h - h * (settings.positionY / 100);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const maxLineWidth = w * 0.82;
  ctx.font = `700 ${fontSize}px '${isPrimaryArabic ? 'Cairo' : fontName}', sans-serif`;

  // Words breakdown for English Karaoke
  const words = primaryText.split(/\s+/).filter(Boolean);
  const wordsCount = words.length;

  // Active word index calculation based on elapsed time
  let activeWordIdx = -1;
  if (settings.karaokeEnabled && !isPrimaryArabic && wordsCount > 0) {
    if (wordTimings && wordTimings.length === wordsCount) {
      activeWordIdx = wordTimings.findIndex(
        (wt) => sceneElapsed >= wt.startSec && sceneElapsed <= wt.endSec
      );
    }
    if (activeWordIdx === -1) {
      const progressRatio = Math.max(0, Math.min(0.98, sceneElapsed / (sceneDuration || 1)));
      activeWordIdx = Math.floor(progressRatio * wordsCount);
    }
  }

  // Wrap into lines while tracking word indices
  const wrappedLines: Array<{ lineText: string; startWordIdx: number; endWordIdx: number }> = [];
  let curLine = '';
  let startWordIdx = 0;

  for (let i = 0; i < words.length; i++) {
    const testLine = curLine ? `${curLine} ${words[i]}` : words[i];
    const width = ctx.measureText(testLine).width;
    if (width < maxLineWidth) {
      curLine = testLine;
    } else {
      wrappedLines.push({ lineText: curLine, startWordIdx, endWordIdx: i - 1 });
      curLine = words[i];
      startWordIdx = i;
    }
  }
  if (curLine) {
    wrappedLines.push({ lineText: curLine, startWordIdx, endWordIdx: words.length - 1 });
  }

  // Wrap secondary text (Arabic)
  const secondaryLines = secondaryText
    ? wrapText(ctx, secondaryText, maxLineWidth)
    : [];

  const totalLines = wrappedLines.length + secondaryLines.length;
  const lineHeight = fontSize * 1.35;
  const boxHeight = totalLines * lineHeight + (settings.backgroundPadding * scaleFactor * 2.2);
  const boxY = yBottom - boxHeight;

  // Calculate box width
  const maxMeasuredTextWidth = Math.min(
    maxLineWidth + 60 * scaleFactor,
    Math.max(
      ...wrappedLines.map((l) => ctx.measureText(l.lineText).width),
      ...secondaryLines.map((l) => ctx.measureText(l).width),
      220
    ) + 60 * scaleFactor
  );
  const boxX = (w - maxMeasuredTextWidth) / 2;

  // Render Glassmorphic Backdrop
  if (settings.backgroundColor && settings.backgroundColor !== 'transparent') {
    ctx.save();
    // Glassmorphic fill
    ctx.fillStyle = settings.backdropStyle === 'solid'
      ? settings.backgroundColor
      : 'rgba(10, 15, 30, 0.72)';

    roundRect(ctx, boxX, boxY, maxMeasuredTextWidth, boxHeight, 14 * scaleFactor);
    ctx.fill();

    // Subtle frosted hairline border
    if (settings.boxBorder !== false) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.lineWidth = 1.5 * scaleFactor;
      ctx.stroke();
    }
    ctx.restore();
  }

  // Draw Primary Text with Karaoke Word Highlighting
  let currentY = boxY + (settings.backgroundPadding * scaleFactor * 1.1) + lineHeight / 2;

  for (const lineObj of wrappedLines) {
    if (settings.karaokeEnabled && !isPrimaryArabic) {
      // Draw line word-by-word
      const lineWords = lineObj.lineText.split(' ');
      const spaceWidth = ctx.measureText(' ').width;
      const totalLineWidth = ctx.measureText(lineObj.lineText).width;
      let curX = (w - totalLineWidth) / 2;

      lineWords.forEach((word, localIdx) => {
        const globalIdx = lineObj.startWordIdx + localIdx;
        const isCurrent = globalIdx === activeWordIdx;
        const isPast = globalIdx < activeWordIdx;

        ctx.save();
        if (isCurrent) {
          ctx.fillStyle = settings.karaokeHighlightColor || '#FDE047';
          ctx.shadowColor = settings.karaokeHighlightColor || '#FDE047';
          ctx.shadowBlur = 12 * scaleFactor;
          ctx.font = `800 ${fontSize}px '${fontName}', sans-serif`;
        } else if (isPast) {
          ctx.fillStyle = '#FFFFFF';
          ctx.font = `700 ${fontSize}px '${fontName}', sans-serif`;
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.font = `600 ${fontSize}px '${fontName}', sans-serif`;
        }

        ctx.textAlign = 'left';
        ctx.fillText(word, curX, currentY);
        curX += ctx.measureText(word).width + spaceWidth;
        ctx.restore();
      });
    } else {
      // Standard line draw
      ctx.fillStyle = settings.textColor || '#FFFFFF';
      if (settings.showTextShadow) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 6 * scaleFactor;
        ctx.shadowOffsetY = 2 * scaleFactor;
      }
      ctx.textAlign = 'center';
      ctx.font = `700 ${fontSize}px '${isPrimaryArabic ? 'Cairo' : fontName}', sans-serif`;
      ctx.fillText(lineObj.lineText, w / 2, currentY);
    }
    currentY += lineHeight;
  }

  // Draw Secondary Text (Arabic in Dual Mode)
  if (secondaryLines.length > 0) {
    ctx.fillStyle = settings.textSecondaryColor || '#38BDF8';
    ctx.textAlign = 'center';
    for (const line of secondaryLines) {
      ctx.font = `700 ${secondaryFontSize}px 'Cairo', 'Tajawal', sans-serif`;
      ctx.fillText(line, w / 2, currentY);
      currentY += lineHeight;
    }
  }

  ctx.restore();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  if (!text) return [];
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + ' ' + word).width;
    if (width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines.slice(0, 3);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
