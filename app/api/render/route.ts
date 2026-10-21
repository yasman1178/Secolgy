import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const maxDuration = 120; // 2 minutes execution timeout for server rendering

interface RenderSceneInput {
  scene_id: string;
  imageData?: string; // base64 / data URL / svg
  duration: number;
  motion?: string;
  subtitle?: string;
}

export async function POST(req: NextRequest) {
  let tmpDir = '';

  try {
    const body = await req.json();
    const {
      scenes = [],
      resolution = '1080p',
      watermarkText = 'MACHINAMIND',
      includeWatermark = true,
      fps = 30,
    } = body;

    if (!Array.isArray(scenes) || scenes.length === 0) {
      return NextResponse.json({ error: 'No scenes provided for rendering' }, { status: 400 });
    }

    // Limit to reasonable batch to prevent server crash
    const scenesToRender: RenderSceneInput[] = scenes.slice(0, 35);

    // Create unique temporary workspace in /tmp
    const jobId = `render_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    tmpDir = path.join(os.tmpdir(), jobId);
    await fs.mkdir(tmpDir, { recursive: true });

    const width = resolution === '720p' ? 1280 : 1920;
    const height = resolution === '720p' ? 720 : 1080;

    // Process and save each scene image
    const imageFiles: Array<{ filePath: string; duration: number }> = [];

    for (let i = 0; i < scenesToRender.length; i++) {
      const scene = scenesToRender[i];
      const duration = Math.max(2, Math.min(60, Number(scene.duration) || 6));
      let imgExt = 'png';
      let imgBuffer: Buffer;

      if (scene.imageData && scene.imageData.startsWith('data:image/')) {
        if (scene.imageData.includes('image/svg+xml')) {
          imgExt = 'svg';
          const base64Index = scene.imageData.indexOf(';base64,');
          if (base64Index !== -1) {
            imgBuffer = Buffer.from(scene.imageData.slice(base64Index + 8), 'base64');
          } else {
            const rawSvg = decodeURIComponent(scene.imageData.replace(/^data:image\/svg\+xml;utf8,/, ''));
            imgBuffer = Buffer.from(rawSvg, 'utf-8');
          }
        } else {
          // PNG or JPEG base64
          const matches = scene.imageData.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
          if (matches) {
            imgExt = matches[1] === 'jpeg' ? 'jpg' : matches[1];
            imgBuffer = Buffer.from(matches[2], 'base64');
          } else {
            imgBuffer = Buffer.from('');
          }
        }
      } else {
        // Fallback default SVG image
        imgExt = 'svg';
        const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
          <rect width="100%" height="100%" fill="#090D16" />
          <text x="50%" y="50%" fill="#38BDF8" font-size="36" font-family="sans-serif" text-anchor="middle">
            Scene ${i + 1} · ${watermarkText}
          </text>
        </svg>`;
        imgBuffer = Buffer.from(fallbackSvg, 'utf-8');
      }

      const sceneImgPath = path.join(tmpDir, `scene_${i.toString().padStart(3, '0')}.${imgExt}`);
      await fs.writeFile(sceneImgPath, imgBuffer);

      imageFiles.push({
        filePath: sceneImgPath,
        duration,
      });
    }

    // Build FFmpeg concat file
    const concatFilePath = path.join(tmpDir, 'input.txt');
    let concatContent = '';
    for (const item of imageFiles) {
      concatContent += `file '${item.filePath}'\n`;
      concatContent += `duration ${item.duration}\n`;
    }
    // Repeat last file as required by concat demuxer
    if (imageFiles.length > 0) {
      concatContent += `file '${imageFiles[imageFiles.length - 1].filePath}'\n`;
    }

    await fs.writeFile(concatFilePath, concatContent, 'utf-8');

    // Build video filter chain (scale, pad, watermark)
    const filters: string[] = [
      `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
      `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black`,
      `fps=${fps}`,
      'format=yuv420p',
    ];

    if (includeWatermark && watermarkText) {
      const cleanWatermark = watermarkText.replace(/[':\\]/g, '');
      const fontPath = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf';
      filters.push(
        `drawtext=fontfile='${fontPath}':text='${cleanWatermark}':fontcolor=white@0.85:fontsize=${
          resolution === '720p' ? 22 : 30
        }:x=w-tw-50:y=50:shadowcolor=black@0.8:shadowx=2:shadowy=2`
      );
    }

    const vfString = filters.join(',');
    const outputMp4Path = path.join(tmpDir, 'output.mp4');

    // Generate silent AAC audio track so the MP4 container plays everywhere smoothly
    const totalDuration = imageFiles.reduce((acc, curr) => acc + curr.duration, 0);

    const ffmpegCmd = `ffmpeg -y -f concat -safe 0 -i "${concatFilePath}" -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -vf "${vfString}" -c:v libx264 -preset veryfast -crf 22 -c:a aac -t ${totalDuration} -movflags +faststart "${outputMp4Path}"`;

    await execAsync(ffmpegCmd, { timeout: 90000 });

    const mp4Buffer = await fs.readFile(outputMp4Path);

    // Clean up temporary files asynchronously
    fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});

    return new Response(mp4Buffer, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="MachinaMind_16x9_${resolution}.mp4"`,
        'Content-Length': mp4Buffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('FFmpeg render error:', error);
    if (tmpDir) {
      fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
    return NextResponse.json(
      { error: error.message || 'Failed to compile MP4 video with FFmpeg' },
      { status: 500 }
    );
  }
}
