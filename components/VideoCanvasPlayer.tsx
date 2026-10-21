'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Maximize,
  Volume2,
  VolumeX,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { SceneV7, SubtitleStyleSettings, ChannelWatermarkSettings } from '@/types/studio';
import { draw16x9Frame } from '@/lib/ken-burns';

interface VideoCanvasPlayerProps {
  scenes: SceneV7[];
  subtitleSettings: SubtitleStyleSettings;
  watermarkSettings: ChannelWatermarkSettings;
  onUpdateSubtitleSettings: (updated: Partial<SubtitleStyleSettings>) => void;
  onUpdateWatermarkSettings: (updated: Partial<ChannelWatermarkSettings>) => void;
  selectedVoiceId?: string;
}

export function VideoCanvasPlayer({
  scenes,
  subtitleSettings,
  watermarkSettings,
  onUpdateSubtitleSettings,
  onUpdateWatermarkSettings,
  selectedVoiceId = 'en-GB-RyanNeural',
}: VideoCanvasPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSceneIdx, setCurrentSceneIdx] = useState(0);
  const [currentTime, setCurrentTime] = useState(0); // overall seconds
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);

  // Loaded images cache: Map<sceneIndex, HTMLImageElement>
  const imageCacheRef = useRef<Map<number, HTMLImageElement>>(new Map());

  // Calculate cumulative scene start and end times
  const sceneTimings = React.useMemo(() => {
    const list: Array<{ start: number; end: number; duration: number }> = [];
    let currentAcc = 0;
    for (const s of scenes) {
      const start = currentAcc;
      const duration = s.duration || 10;
      currentAcc += duration;
      list.push({ start, end: currentAcc, duration });
    }
    return list;
  }, [scenes]);

  const totalDuration = sceneTimings.length > 0 ? sceneTimings[sceneTimings.length - 1].end : 0;

  // Preload images into HTMLImageElement cache
  useEffect(() => {
    scenes.forEach((scene, index) => {
      if (scene.matchedImageData) {
        const img = new Image();
        img.src = scene.matchedImageData;
        img.onload = () => {
          imageCacheRef.current.set(index, img);
        };
      }
    });
  }, [scenes]);

  // Audio synthesis sync using Web Speech API (English voice narration preview)
  const currentSpeechUtterance = useRef<SpeechSynthesisUtterance | null>(null);

  const speakCurrentScene = useCallback((idx: number) => {
    if (!isAudioEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const scene = scenes[idx];
    if (!scene || !scene.narration_text) return;

    const utterance = new SpeechSynthesisUtterance(scene.narration_text);
    utterance.lang = selectedVoiceId.startsWith('en-GB') ? 'en-GB' : 'en-US';
    utterance.rate = playbackSpeed * 0.95;
    utterance.pitch = 0.85; // Deep documentary baritone

    const voices = window.speechSynthesis.getVoices();
    const isBritish = selectedVoiceId.startsWith('en-GB');

    const voice =
      voices.find((v) => v.lang.startsWith(isBritish ? 'en-GB' : 'en-US') && (v.name.includes('Ryan') || v.name.includes('Oliver') || v.name.includes('George') || v.name.includes('Male') || v.name.includes('Natural') || v.name.includes('Google'))) ||
      voices.find((v) => v.lang.startsWith(isBritish ? 'en-GB' : 'en-US')) ||
      voices.find((v) => v.lang.startsWith('en'));

    if (voice) {
      utterance.voice = voice;
    }

    currentSpeechUtterance.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [scenes, isAudioEnabled, playbackSpeed, selectedVoiceId]);

  // Request Animation Frame Render Loop
  const lastTimestampRef = useRef<number | null>(null);

  useEffect(() => {
    let animId: number;

    const render = (now: number) => {
      if (lastTimestampRef.current !== null && isPlaying) {
        const deltaSeconds = ((now - lastTimestampRef.current) / 1000) * playbackSpeed;
        setCurrentTime((prevTime) => {
          const nextTime = prevTime + deltaSeconds;
          if (nextTime >= totalDuration) {
            setIsPlaying(false);
            if (typeof window !== 'undefined' && window.speechSynthesis) {
              window.speechSynthesis.cancel();
            }
            return totalDuration;
          }
          return nextTime;
        });
      }
      lastTimestampRef.current = now;

      // Draw current frame on canvas
      const canvas = canvasRef.current;
      if (canvas && scenes.length > 0) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Find current scene index from currentTime
          let activeIdx = 0;
          for (let i = 0; i < sceneTimings.length; i++) {
            if (currentTime >= sceneTimings[i].start && currentTime < sceneTimings[i].end) {
              activeIdx = i;
              break;
            }
          }

          if (activeIdx !== currentSceneIdx) {
            setCurrentSceneIdx(activeIdx);
            if (isPlaying) {
              speakCurrentScene(activeIdx);
            }
          }

          const currentTiming = sceneTimings[activeIdx] || { start: 0, duration: 10 };
          const sceneElapsed = currentTime - currentTiming.start;
          const sceneProgress = Math.max(0, Math.min(1, sceneElapsed / (currentTiming.duration || 1)));

          const activeScene = scenes[activeIdx];
          const prevSceneIdx = activeIdx > 0 ? activeIdx - 1 : null;

          const currentImg = imageCacheRef.current.get(activeIdx) || null;
          const prevImg = prevSceneIdx !== null ? imageCacheRef.current.get(prevSceneIdx) || null : null;

          const transitionDuration = 0.6; // 0.6s transition
          const transitionProgress = Math.min(1, sceneElapsed / transitionDuration);

          draw16x9Frame({
            ctx,
            canvasWidth: 1920,
            canvasHeight: 1080,
            currentImage: currentImg,
            previousImage: prevImg,
            progress: sceneProgress,
            sceneElapsed,
            sceneDuration: currentTiming.duration || 10,
            motion: activeScene?.motion || 'zoom_in',
            transitionProgress,
            transitionType: activeScene?.transition || 'dissolve',
            subtitleEn: activeScene?.subtitleEn || activeScene?.narration_text,
            subtitleAr: activeScene?.subtitleAr,
            wordTimings: activeScene?.wordTimings,
            subtitleSettings,
            watermarkSettings,
          });
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [
    isPlaying,
    currentTime,
    totalDuration,
    playbackSpeed,
    scenes,
    sceneTimings,
    currentSceneIdx,
    subtitleSettings,
    watermarkSettings,
    speakCurrentScene,
  ]);

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } else {
      if (currentTime >= totalDuration) {
        setCurrentTime(0);
      }
      setIsPlaying(true);
      speakCurrentScene(currentSceneIdx);
    }
  };

  const handleSeek = (newTime: number) => {
    setCurrentTime(newTime);
    // Find matching scene
    for (let i = 0; i < sceneTimings.length; i++) {
      if (newTime >= sceneTimings[i].start && newTime <= sceneTimings[i].end) {
        setCurrentSceneIdx(i);
        if (isPlaying) {
          speakCurrentScene(i);
        }
        break;
      }
    }
  };

  const jumpToScene = (idx: number) => {
    const timing = sceneTimings[idx];
    if (timing) {
      setCurrentSceneIdx(idx);
      setCurrentTime(timing.start);
      if (isPlaying) {
        speakCurrentScene(idx);
      }
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      {/* 16:9 Canvas Viewport */}
      <div
        ref={containerRef}
        className="relative bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-2xl aspect-[16/9] flex items-center justify-center group select-none"
      >
        <canvas
          ref={canvasRef}
          width={1920}
          height={1080}
          className="w-full h-full object-contain"
        />

        {/* Center Play Overlay on Pause */}
        {!isPlaying && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-slate-950/70 border border-slate-700/80 text-white flex items-center justify-center backdrop-blur-md hover:scale-110 transition-transform shadow-2xl"
          >
            <Play className="w-8 h-8 fill-current ml-1 text-sky-400" />
          </button>
        )}

        {/* Top-Right Settings trigger */}
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
            className="p-2 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white backdrop-blur-sm transition-colors text-xs flex items-center gap-1.5"
          >
            <Sliders className="w-4 h-4 text-sky-400" />
            <span className="hidden sm:inline">Overlay Settings</span>
          </button>
        </div>

        {/* Floating Quick Settings Modal/Drawer */}
        {showSettingsDrawer && (
          <div className="absolute top-14 right-4 z-30 w-80 bg-slate-950/95 border border-slate-800 rounded-xl p-4 shadow-2xl backdrop-blur-md space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-semibold text-white">Player & Overlay Controls</span>
              <button
                onClick={() => setShowSettingsDrawer(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Subtitle Mode */}
            <div>
              <label className="text-slate-400 block mb-1.5 font-medium">Subtitle Mode:</label>
              <div className="grid grid-cols-4 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                {(['off', 'en', 'ar', 'dual'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => onUpdateSubtitleSettings({ displayMode: mode })}
                    className={`py-1 rounded text-center font-medium capitalize transition-colors ${
                      subtitleSettings.displayMode === mode
                        ? 'bg-sky-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {mode === 'dual' ? 'Dual' : mode.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Selector */}
            <div>
              <label className="text-slate-400 block mb-1.5 font-medium">Subtitle Font:</label>
              <select
                value={subtitleSettings.fontFamily}
                onChange={(e) => onUpdateSubtitleSettings({ fontFamily: e.target.value as any })}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none"
              >
                <option value="Cairo">Cairo (Arabic / Latin)</option>
                <option value="Tajawal">Tajawal</option>
                <option value="Outfit">Outfit</option>
                <option value="JetBrains Mono">JetBrains Mono</option>
              </select>
            </div>

            {/* Karaoke Word-by-Word Highlight */}
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-300 font-medium">Karaoke Word Highlight:</span>
                <input
                  type="checkbox"
                  checked={subtitleSettings.karaokeEnabled}
                  onChange={(e) => onUpdateSubtitleSettings({ karaokeEnabled: e.target.checked })}
                  className="accent-sky-400 rounded"
                />
              </label>

              {subtitleSettings.karaokeEnabled && (
                <div className="flex items-center justify-between pt-1 border-t border-slate-850">
                  <span className="text-slate-400">Word Glow Color:</span>
                  <div className="flex items-center gap-1.5">
                    {[
                      { name: 'Gold', color: '#FDE047' },
                      { name: 'Cyan', color: '#38BDF8' },
                      { name: 'Emerald', color: '#34D399' },
                    ].map((col) => (
                      <button
                        key={col.color}
                        onClick={() => onUpdateSubtitleSettings({ karaokeHighlightColor: col.color })}
                        style={{ backgroundColor: col.color }}
                        className={`w-5 h-5 rounded-full border transition-all ${
                          subtitleSettings.karaokeHighlightColor === col.color
                            ? 'ring-2 ring-white scale-110'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        title={col.name}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Font Size & Bar Opacity */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Font Size ({subtitleSettings.fontSize}px):</span>
                <input
                  type="range"
                  min={28}
                  max={58}
                  value={subtitleSettings.fontSize}
                  onChange={(e) => onUpdateSubtitleSettings({ fontSize: Number(e.target.value) })}
                  className="w-32 accent-sky-400"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Box Style:</span>
                <select
                  value={subtitleSettings.backdropStyle}
                  onChange={(e) => onUpdateSubtitleSettings({ backdropStyle: e.target.value as any })}
                  className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs"
                >
                  <option value="glassmorphic">Glassmorphic (Frosted)</option>
                  <option value="solid">Documentary Solid</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">MachinaMind Watermark:</span>
                <input
                  type="checkbox"
                  checked={watermarkSettings.enabled}
                  onChange={(e) => onUpdateWatermarkSettings({ enabled: e.target.checked })}
                  className="accent-sky-400 rounded"
                />
              </div>

              {watermarkSettings.enabled && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Watermark Position:</span>
                  <select
                    value={watermarkSettings.position}
                    onChange={(e) => onUpdateWatermarkSettings({ position: e.target.value as any })}
                    className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs"
                  >
                    <option value="top-right">Top Right</option>
                    <option value="top-left">Top Left</option>
                    <option value="bottom-right">Bottom Right</option>
                    <option value="bottom-left">Bottom Left</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Transport & Timeline Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        {/* Scrubber Range Bar */}
        <div className="relative group">
          <input
            type="range"
            min={0}
            max={totalDuration || 1}
            step={0.1}
            value={currentTime}
            onChange={(e) => handleSeek(Number(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400 focus:outline-none"
          />
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => jumpToScene(Math.max(0, currentSceneIdx - 1))}
              disabled={currentSceneIdx === 0}
              className="p-2 text-slate-400 hover:text-white disabled:opacity-30 rounded-lg hover:bg-slate-800 transition-colors"
              title="Previous Scene"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={togglePlay}
              className="p-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl transition-transform active:scale-95 shadow-md shadow-sky-500/20"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            <button
              onClick={() => jumpToScene(Math.min(scenes.length - 1, currentSceneIdx + 1))}
              disabled={currentSceneIdx >= scenes.length - 1}
              className="p-2 text-slate-400 hover:text-white disabled:opacity-30 rounded-lg hover:bg-slate-800 transition-colors"
              title="Next Scene"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleSeek(0)}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Restart from Beginning"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Timestamps */}
            <div className="ml-2 font-mono text-xs text-slate-400 flex items-center gap-1.5">
              <span className="text-white font-medium">{formatTime(currentTime)}</span>
              <span>/</span>
              <span>{formatTime(totalDuration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Audio Voiceover Sync toggle */}
            <button
              onClick={() => {
                const next = !isAudioEnabled;
                setIsAudioEnabled(next);
                if (!next && typeof window !== 'undefined' && window.speechSynthesis) {
                  window.speechSynthesis.cancel();
                } else if (next && isPlaying) {
                  speakCurrentScene(currentSceneIdx);
                }
              }}
              title="Toggle Live Speech Voiceover Sync"
              className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition-colors ${
                isAudioEnabled
                  ? 'bg-sky-950/60 border-sky-800/80 text-sky-400'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-500'
              }`}
            >
              {isAudioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline font-mono text-[11px]">TTS Voice</span>
            </button>

            {/* Playback Speed selector */}
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300 font-mono focus:outline-none"
            >
              <option value={1.0}>1.0x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
              <option value={2.0}>2.0x</option>
            </select>

            <button
              onClick={handleFullscreen}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Fullscreen"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scene Thumbnails Strip */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {scenes.map((scene, idx) => {
            const isActive = idx === currentSceneIdx;
            return (
              <button
                key={scene.scene_id}
                onClick={() => jumpToScene(idx)}
                className={`flex-shrink-0 w-24 h-14 rounded-lg overflow-hidden border relative transition-all group ${
                  isActive
                    ? 'border-sky-400 ring-2 ring-sky-400/30'
                    : 'border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-700'
                }`}
              >
                {scene.matchedImageData ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={scene.matchedImageData}
                    alt={scene.scene_id}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-950 flex items-center justify-center text-[10px] text-slate-600 font-mono">
                    {scene.scene_id}
                  </div>
                )}
                <span className="absolute bottom-1 left-1 px-1 py-0.2 rounded bg-black/80 font-mono text-[9px] text-white">
                  {scene.scene_id}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
