'use client';

import React, { useState } from 'react';
import { Download, Film, CheckCircle2, AlertCircle, RefreshCw, X, ShieldCheck, Cpu } from 'lucide-react';
import { SceneV7, SubtitleStyleSettings, ChannelWatermarkSettings } from '@/types/studio';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenes: SceneV7[];
  subtitleSettings: SubtitleStyleSettings;
  watermarkSettings: ChannelWatermarkSettings;
}

export function ExportModal({
  isOpen,
  onClose,
  scenes,
  subtitleSettings,
  watermarkSettings,
}: ExportModalProps) {
  const [resolution, setResolution] = useState<'1080p' | '720p'>('1080p');
  const [includeWatermark, setIncludeWatermark] = useState(true);
  const [burnSubtitles, setBurnSubtitles] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [renderError, setRenderError] = useState<string | null>(null);
  const [renderSuccess, setRenderSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleStartFFmpegRender = async () => {
    setIsRendering(true);
    setRenderError(null);
    setRenderSuccess(false);
    setProgressStatus('Preparing scenes & image assets for server-side FFmpeg pipeline...');

    try {
      // Package scenes payload (take first 25 scenes for optimal processing)
      const scenesPayload = scenes.slice(0, 25).map((s) => ({
        scene_id: s.scene_id,
        duration: s.duration || 8,
        motion: s.motion,
        subtitle: burnSubtitles ? (s.subtitleAr || s.subtitleEn || s.narration_text) : undefined,
        imageData: s.matchedImageData,
      }));

      setProgressStatus('Spawning native server FFmpeg process (libx264, 16:9, yuv420p)...');

      const response = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenes: scenesPayload,
          resolution,
          includeWatermark,
          watermarkText: watermarkSettings.channelName || 'MACHINAMIND',
          fps: 30,
        }),
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.error || `Server FFmpeg render returned status ${response.status}`);
      }

      setProgressStatus('Rendering complete! Packaging MP4 download...');

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `MachinaMind_${resolution}_${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      setRenderSuccess(true);
      setProgressStatus('MP4 downloaded successfully!');
    } catch (err: any) {
      console.error('Render error:', err);
      setRenderError(err.message || 'Failed to render video with FFmpeg');
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold font-outfit text-white tracking-tight">
                Export 16:9 MP4 Video
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Server-side FFmpeg Engine · H.264 MP4
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isRendering}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings options */}
        <div className="space-y-4 text-xs">
          {/* Resolution */}
          <div>
            <label className="text-slate-400 font-medium block mb-1.5">Output Resolution (16:9):</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setResolution('1080p')}
                className={`py-2 px-3 rounded-xl border text-center transition-all ${
                  resolution === '1080p'
                    ? 'bg-sky-500/10 border-sky-500 text-sky-400 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                1080p Full HD (1920 × 1080)
              </button>
              <button
                type="button"
                onClick={() => setResolution('720p')}
                className={`py-2 px-3 rounded-xl border text-center transition-all ${
                  resolution === '720p'
                    ? 'bg-sky-500/10 border-sky-500 text-sky-400 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                720p HD (1280 × 720)
              </button>
            </div>
          </div>

          {/* Watermark and Subtitle toggles */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-slate-300 font-medium">Include MachinaMind Channel Watermark</span>
              <input
                type="checkbox"
                checked={includeWatermark}
                onChange={(e) => setIncludeWatermark(e.target.checked)}
                className="w-4 h-4 accent-sky-400 rounded"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-slate-900">
              <span className="text-slate-300 font-medium">Burn-in Subtitles onto Video</span>
              <input
                type="checkbox"
                checked={burnSubtitles}
                onChange={(e) => setBurnSubtitles(e.target.checked)}
                className="w-4 h-4 accent-sky-400 rounded"
              />
            </label>
          </div>

          {/* Render scene stats */}
          <div className="flex items-center justify-between text-slate-400 font-mono text-[11px] px-1">
            <span>Scenes: {Math.min(25, scenes.length)}</span>
            <span>Aspect Ratio: 16:9 Widescreen</span>
            <span>FPS: 30</span>
          </div>

          {/* Progress / Status feedback */}
          {isRendering && (
            <div className="p-3.5 bg-sky-950/40 border border-sky-800/60 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-sky-300">
                <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                <span className="font-medium text-xs">FFmpeg Server Pipeline Running...</span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">{progressStatus}</p>
            </div>
          )}

          {renderSuccess && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex items-center gap-2 text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{progressStatus}</span>
            </div>
          )}

          {renderError && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-start gap-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{renderError}</span>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            disabled={isRendering}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleStartFFmpegRender}
            disabled={isRendering || scenes.length === 0}
            className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-lg shadow-sky-500/20 flex items-center gap-2"
          >
            {isRendering ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Compiling MP4...</span>
              </>
            ) : (
              <>
                <Film className="w-3.5 h-3.5" />
                <span>Start FFmpeg MP4 Render</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
