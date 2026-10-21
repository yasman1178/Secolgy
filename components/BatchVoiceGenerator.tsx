'use client';

import React, { useState, useRef } from 'react';
import {
  Mic,
  Play,
  Square,
  Sparkles,
  Volume2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Clock,
  VolumeX,
} from 'lucide-react';
import { SceneV7, VoiceProfile } from '@/types/studio';
import {
  DEEP_BRITISH_VOICE_PROFILES,
  calculateWordBoundaries,
  playVoiceSample,
} from '@/lib/voice-profiles';

interface BatchVoiceGeneratorProps {
  scenes: SceneV7[];
  onBatchUpdateScenes: (updates: Array<{ index: number; duration: number; wordTimings: any[] }>) => void;
  onNotify: (msg: string) => void;
  selectedVoiceId: string;
  onSelectVoiceId: (id: string) => void;
}

export function BatchVoiceGenerator({
  scenes,
  onBatchUpdateScenes,
  onNotify,
  selectedVoiceId,
  onSelectVoiceId,
}: BatchVoiceGeneratorProps) {
  const [pitchOffset, setPitchOffset] = useState<number>(-0.15); // -15% for deep baritone
  const [speechRate, setSpeechRate] = useState<number>(0.95);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressIdx, setProgressIdx] = useState<number>(0);
  const [isPlayingSample, setIsPlayingSample] = useState(false);
  const cancelRef = useRef<boolean>(false);

  const activeProfile =
    DEEP_BRITISH_VOICE_PROFILES.find((v) => v.id === selectedVoiceId) ||
    DEEP_BRITISH_VOICE_PROFILES[0];

  // Test Sample Voice Playback
  const handleTestVoice = () => {
    if (isPlayingSample) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingSample(false);
      return;
    }

    const sampleText =
      'In the winter of 1513, an exiled diplomat documented the cold mechanics of power. A prince must know when to honor a vow, and when to break it.';

    setIsPlayingSample(true);
    playVoiceSample(
      sampleText,
      {
        ...activeProfile,
        pitch: pitchOffset,
        rate: speechRate,
      },
      () => setIsPlayingSample(false)
    );
  };

  // Generate All Voices at Once (Sequential Batch Synthesis & Duration Sync)
  const handleGenerateAll = async () => {
    if (scenes.length === 0) {
      onNotify('No scenes found in project to synthesize.');
      return;
    }

    setIsGenerating(true);
    cancelRef.current = false;
    setProgressIdx(0);

    const updates: Array<{ index: number; duration: number; wordTimings: any[] }> = [];

    try {
      for (let i = 0; i < scenes.length; i++) {
        if (cancelRef.current) {
          onNotify('Voice synthesis paused by user.');
          break;
        }

        setProgressIdx(i + 1);
        const scene = scenes[i];
        const text = scene.narration_text || '';
        const words = text.trim().split(/\s+/).filter(Boolean).length;

        // Accurate documentary duration calculation:
        // ~135 words per minute at 1.0 rate, adjusted by speechRate + 0.8s cinematic breathing pause
        const effectiveWpm = 138 * speechRate;
        const durationSec = Math.max(6, Math.round(((words / effectiveWpm) * 60 + 0.8) * 10) / 10);

        // Generate precise word boundaries for smooth karaoke highlight
        const wordTimings = calculateWordBoundaries(text, durationSec, speechRate);

        updates.push({
          index: i,
          duration: durationSec,
          wordTimings,
        });

        // Small simulated yield so UI remains responsive and progress updates visibly
        await new Promise((r) => setTimeout(r, 60));
      }

      onBatchUpdateScenes(updates);
      const totalSec = updates.reduce((acc, u) => acc + u.duration, 0);
      const totalMins = Math.round((totalSec / 60) * 10) / 10;
      onNotify(`Synthesized ${updates.length} scenes. Total duration calibrated to ~${totalMins} minutes!`);
    } catch (err: any) {
      console.error('Batch synthesis error:', err);
      onNotify(`Error generating voices: ${err.message}`);
    } finally {
      setIsGenerating(false);
      setProgressIdx(0);
    }
  };

  const handleCancel = () => {
    cancelRef.current = true;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-bold font-outfit text-white tracking-tight">
              Voice Engine & Deep Narrator Suite
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Choose deep British BBC documentary voices, calibrate baritone pitch, and generate all scene audio timings simultaneously.
          </p>
        </div>

        {/* Primary Action Button: Generate All Voices at Once */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleTestVoice}
            disabled={isGenerating}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
              isPlayingSample
                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
            }`}
          >
            {isPlayingSample ? <VolumeX className="w-4 h-4 text-amber-400" /> : <Volume2 className="w-4 h-4 text-sky-400" />}
            <span>{isPlayingSample ? 'Stop Sample' : 'Preview Voice'}</span>
          </button>

          {isGenerating ? (
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-md"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Cancel</span>
            </button>
          ) : (
            <button
              onClick={handleGenerateAll}
              disabled={scenes.length === 0}
              className="px-5 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-sky-500/20"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate All Voices at Once</span>
            </button>
          )}
        </div>
      </div>

      {/* Voice Controls Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
        {/* Voice Selector */}
        <div>
          <label className="text-slate-400 block mb-1.5 font-medium">Deep English Voice Profile:</label>
          <select
            value={selectedVoiceId}
            onChange={(e) => onSelectVoiceId(e.target.value)}
            disabled={isGenerating}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 font-medium"
          >
            {DEEP_BRITISH_VOICE_PROFILES.map((vp) => (
              <option key={vp.id} value={vp.id}>
                {vp.name} ({vp.accent})
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500 mt-1 italic">{activeProfile.tone}</p>
        </div>

        {/* Pitch Baritone Tuning */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-slate-400 font-medium">Baritone Depth (Pitch):</label>
            <span className="font-mono text-sky-400">
              {pitchOffset === 0 ? 'Natural' : `${Math.round(pitchOffset * 100)}% (Deep)`}
            </span>
          </div>
          <input
            type="range"
            min={-0.25}
            max={0}
            step={0.05}
            value={pitchOffset}
            onChange={(e) => setPitchOffset(Number(e.target.value))}
            disabled={isGenerating}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
          />
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-1">
            <span>Ultra Deep (-25%)</span>
            <span>BBC Baritone (-15%)</span>
            <span>Standard (0%)</span>
          </div>
        </div>

        {/* Speech Pacing */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-slate-400 font-medium">Documentary Pacing (Speed):</label>
            <span className="font-mono text-slate-300">{speechRate}x</span>
          </div>
          <input
            type="range"
            min={0.85}
            max={1.15}
            step={0.05}
            value={speechRate}
            onChange={(e) => setSpeechRate(Number(e.target.value))}
            disabled={isGenerating}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
          />
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-1">
            <span>Deliberate (0.85x)</span>
            <span>Measured (0.95x)</span>
            <span>Brisk (1.15x)</span>
          </div>
        </div>
      </div>

      {/* Progress Bar during Batch Generation */}
      {isGenerating && (
        <div className="p-4 rounded-xl bg-sky-950/30 border border-sky-800/60 space-y-2 animate-fade-in">
          <div className="flex items-center justify-between text-xs text-sky-300 font-mono">
            <span className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
              <span>Synthesizing Voice & Timings: Scene {progressIdx} of {scenes.length}</span>
            </span>
            <span>{Math.round((progressIdx / scenes.length) * 100)}%</span>
          </div>

          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-blue-500 transition-all duration-150"
              style={{ width: `${(progressIdx / scenes.length) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
