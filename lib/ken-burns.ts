import { MotionType, SubtitleStyleSettings, ChannelWatermarkSettings } from '@/types/studio';

export interface RenderFrameParams {
  ctx: CanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;
  currentImage: HTMLImageElement | null;
  previousImage: HTMLImageElement | null;
  progress: number; // 0.0 to 1.0 in current scene
  motion: MotionType;
  transitionProgress: number; // 0.0 to 1.0 during transition (e.g. first 0.6s)
  transitionType: 'cut' | 'fade' | 'dissolve';
  subtitleEn?: string;
  subtitleAr?: string;
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
  motion,
  transitionProgress,
  transitionType,
  subtitleEn,
  subtitleAr,
  subtitleSettings,
  watermarkSettings,
}: RenderFrameParams) {
  // Clear canvas
  ctx.fillStyle = '#050811';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // 1. Draw Image with Ken Burns transformation
  if (currentImage && currentImage.complete && currentImage.naturalWidth > 0) {
    ctx.save();

    // If dissolve or fade transition from previous image
    if (previousImage && previousImage.complete && transitionProgress < 1.0 && transitionType !== 'cut') {
      if (transitionType === 'dissolve') {
        // Draw previous image first
        drawImageWithMotion(ctx, previousImage, canvasWidth, canvasHeight, 1.0, motion);
        // Overlay current image with alpha
        ctx.globalAlpha = transitionProgress;
        drawImageWithMotion(ctx, currentImage, canvasWidth, canvasHeight, progress, motion);
        ctx.globalAlpha = 1.0;
      } else if (transitionType === 'fade') {
        // Fade to black then fade in
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
    // Elegant fallback canvas when no image loaded yet
    drawFallbackCanvas(ctx, canvasWidth, canvasHeight);
  }

  // 2. Draw MachinaMind Channel Watermark Overlay
  if (watermarkSettings.enabled) {
    drawWatermark(ctx, canvasWidth, canvasHeight, watermarkSettings);
  }

  // 3. Draw Subtitles (if enabled)
  if (subtitleSettings.displayMode !== 'off') {
    drawSubtitles(ctx, canvasWidth, canvasHeight, subtitleEn, subtitleAr, subtitleSettings);
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
  // Clamp progress between 0 and 1
  const t = Math.max(0, Math.min(1, progress));

  // Determine cover scale for image
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const canvasRatio = w / h;

  let baseScale = 1.0;
  if (imgRatio > canvasRatio) {
    baseScale = h / img.naturalHeight;
  } else {
    baseScale = w / img.naturalWidth;
  }

  // Motion parameter bounds
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
      offsetX = (0.5 - t) * 60; // slow drift right-to-left
      break;
    case 'pan_right':
      scale = 1.08;
      offsetX = (t - 0.5) * 60; // slow drift left-to-right
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

  // Subtle cinematic letterbox / vignette gradient for filmic contrast
  const vignette = ctx.createLinearGradient(0, h * 0.7, 0, h);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, h * 0.7, w, h * 0.3);
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

  // Logo text
  const fontSize = Math.round(24 * settings.scale);
  ctx.font = `800 ${fontSize}px 'Outfit', sans-serif`;
  
  // Shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(settings.channelName.toUpperCase(), x, y);

  // Subtle accent dot
  if (align === 'right') {
    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.arc(x - (settings.channelName.length * fontSize * 0.6) - 12, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawSubtitles(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  subEn: string | undefined,
  subAr: string | undefined,
  settings: SubtitleStyleSettings
) {
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

  const scaleFactor = w / 1920; // responsive scale if canvas is preview size
  const fontSize = Math.round(settings.fontSize * scaleFactor);
  const secondaryFontSize = Math.round(fontSize * 0.9);

  const fontName = settings.fontFamily || 'Cairo';
  const yBottom = h - h * (settings.positionY / 100);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Measure and wrap primary text into max 2 lines
  const maxLineWidth = w * 0.82;
  ctx.font = `600 ${fontSize}px '${isPrimaryArabic ? 'Cairo' : fontName}', sans-serif`;

  const primaryLines = wrapText(ctx, primaryText, maxLineWidth);
  const secondaryLines = secondaryText
    ? wrapText(ctx, secondaryText, maxLineWidth)
    : [];

  const totalLines = primaryLines.length + secondaryLines.length;
  const lineHeight = fontSize * 1.35;
  const boxHeight = totalLines * lineHeight + settings.backgroundPadding * scaleFactor * 2;
  const boxY = yBottom - boxHeight;

  // Background Bar
  if (settings.backgroundColor && settings.backgroundColor !== 'transparent') {
    ctx.fillStyle = settings.backgroundColor;
    const maxTextWidth = Math.min(
      maxLineWidth + 60 * scaleFactor,
      Math.max(
        ...primaryLines.map((l) => ctx.measureText(l).width),
        ...secondaryLines.map((l) => ctx.measureText(l).width),
        200
      ) + 48 * scaleFactor
    );

    const boxX = (w - maxTextWidth) / 2;
    roundRect(ctx, boxX, boxY, maxTextWidth, boxHeight, 8 * scaleFactor);
    ctx.fill();
  }

  // Draw Primary Text
  ctx.fillStyle = settings.textColor || '#FFFFFF';
  if (settings.showTextShadow) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
  }

  let currentY = boxY + settings.backgroundPadding * scaleFactor + lineHeight / 2;

  for (const line of primaryLines) {
    ctx.font = `700 ${fontSize}px '${isPrimaryArabic ? 'Cairo' : fontName}', sans-serif`;
    ctx.fillText(line, w / 2, currentY);
    currentY += lineHeight;
  }

  // Draw Secondary (Arabic for Dual mode)
  if (secondaryLines.length > 0) {
    ctx.fillStyle = settings.textSecondaryColor || '#FDE047';
    for (const line of secondaryLines) {
      ctx.font = `600 ${secondaryFontSize}px 'Cairo', 'Tajawal', sans-serif`;
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
  return lines.slice(0, 3); // Max 3 lines
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
