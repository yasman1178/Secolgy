'use client';

import React, { useState } from 'react';
import { Languages, Sparkles, Download, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { SceneV7, SubtitleStyleSettings } from '@/types/studio';
import { generateSrt, generateVtt, downloadFile } from '@/lib/srt-exporter';

interface SubtitleEditorProps {
  scenes: SceneV7[];
  subtitleSettings: SubtitleStyleSettings;
  onUpdateSubtitleSettings: (updated: Partial<SubtitleStyleSettings>) => void;
  onUpdateScene: (index: number, updated: Partial<SceneV7>) => void;
}

export function SubtitleEditor({
  scenes,
  subtitleSettings,
  onUpdateSubtitleSettings,
  onUpdateScene,
}: SubtitleEditorProps) {
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatingIndex, setTranslatingIndex] = useState<number | null>(null);
  const [translateSuccess, setTranslateSuccess] = useState<string | null>(null);
  const [translateError, setTranslateError] = useState<string | null>(null);

  // Batch translate all scenes using Gemini API
  const handleBatchTranslate = async () => {
    setIsTranslating(true);
    setTranslateError(null);
    setTranslateSuccess(null);

    try {
      const items = scenes.map((s) => ({
        id: s.scene_id,
        text: s.narration_text,
      }));

      const res = await fetch('/api/gemini/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, targetLanguage: 'ar' }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Translation request failed');
      }

      const data = await res.json();
      if (Array.isArray(data.translations)) {
        data.translations.forEach((item: { id: string; translated: string }) => {
          const index = scenes.findIndex((s) => s.scene_id === item.id);
          if (index !== -1) {
            onUpdateScene(index, { subtitleAr: item.translated });
          }
        });
        setTranslateSuccess(`Successfully translated ${data.translations.length} scenes to Arabic!`);
      }
    } catch (err: any) {
      setTranslateError(err.message || 'Failed to translate with Gemini');
    } finally {
      setIsTranslating(false);
    }
  };

  // Re-translate a single scene
  const handleSingleTranslate = async (index: number) => {
    setTranslatingIndex(index);
    const scene = scenes[index];

    try {
      const res = await fetch('/api/gemini/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ id: scene.scene_id, text: scene.narration_text }],
          targetLanguage: 'ar',
        }),
      });

      if (!res.ok) throw new Error('Single translation failed');
      const data = await res.json();
      if (data.translations && data.translations[0]) {
        onUpdateScene(index, { subtitleAr: data.translations[0].translated });
      }
    } catch (err: any) {
      setTranslateError(`Failed translating scene ${scene.scene_id}: ${err.message}`);
    } finally {
      setTranslatingIndex(null);
    }
  };

  const handleExportSrt = (lang: 'en' | 'ar' | 'dual') => {
    const srtContent = generateSrt(scenes, lang);
    downloadFile(srtContent, `subtitles_${lang}.srt`, 'text/plain');
  };

  const handleExportVtt = (lang: 'en' | 'ar' | 'dual') => {
    const vttContent = generateVtt(scenes, lang);
    downloadFile(vttContent, `subtitles_${lang}.vtt`, 'text/vtt');
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Controls & Formatting Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Languages className="w-5 h-5 text-sky-400" />
              <h2 className="text-base font-bold font-outfit text-white tracking-tight">
                3. Subtitle Engine & Multilingual Translation
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Customize fonts, live display modes (EN / AR / Dual), and generate Modern Standard Arabic subtitles with Gemini.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchTranslate}
              disabled={isTranslating}
              className="px-4 py-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-semibold text-xs rounded-xl transition-colors flex items-center gap-2 shadow-md shrink-0"
            >
              {isTranslating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>{isTranslating ? 'Translating with Gemini...' : 'Translate All (MSA Arabic)'}</span>
            </button>
          </div>
        </div>

        {/* Subtitle Appearance Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Display Mode */}
          <div>
            <label className="text-slate-400 block mb-1.5 font-medium">Player Display Mode:</label>
            <div className="grid grid-cols-4 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
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

          {/* Font Family */}
          <div>
            <label className="text-slate-400 block mb-1.5 font-medium">Font Family:</label>
            <select
              value={subtitleSettings.fontFamily}
              onChange={(e) => onUpdateSubtitleSettings({ fontFamily: e.target.value as any })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="Cairo">Cairo (Arabic / Latin)</option>
              <option value="Tajawal">Tajawal</option>
              <option value="Outfit">Outfit</option>
              <option value="JetBrains Mono">JetBrains Mono</option>
            </select>
          </div>

          {/* Font Size & Karaoke */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-400 font-medium">Font Size ({subtitleSettings.fontSize}px):</label>
              <input
                type="range"
                min={28}
                max={60}
                value={subtitleSettings.fontSize}
                onChange={(e) => onUpdateSubtitleSettings({ fontSize: Number(e.target.value) })}
                className="w-24 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-800">
              <span className="text-slate-400 font-medium">Karaoke Word Highlight:</span>
              <input
                type="checkbox"
                checked={subtitleSettings.karaokeEnabled}
                onChange={(e) => onUpdateSubtitleSettings({ karaokeEnabled: e.target.checked })}
                className="accent-sky-400 rounded"
              />
            </div>

            {subtitleSettings.karaokeEnabled && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-500">Glow Color:</span>
                <div className="flex items-center gap-1.5">
                  {[
                    { name: 'Gold', color: '#FDE047' },
                    { name: 'Cyan', color: '#38BDF8' },
                    { name: 'Emerald', color: '#34D399' },
                  ].map((c) => (
                    <button
                      key={c.color}
                      onClick={() => onUpdateSubtitleSettings({ karaokeHighlightColor: c.color })}
                      style={{ backgroundColor: c.color }}
                      className={`w-4 h-4 rounded-full border transition-all ${
                        subtitleSettings.karaokeHighlightColor === c.color ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'
                      }`}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Subtitle Downloads */}
          <div>
            <label className="text-slate-400 block mb-1.5 font-medium">Download Subtitles:</label>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleExportSrt('en')}
                className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 font-mono text-[11px] transition-colors"
                title="Download English SRT"
              >
                EN.srt
              </button>
              <button
                onClick={() => handleExportSrt('ar')}
                className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded border border-slate-700 font-mono text-[11px] transition-colors"
                title="Download Arabic SRT"
              >
                AR.srt
              </button>
              <button
                onClick={() => handleExportSrt('dual')}
                className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded border border-slate-700 font-mono text-[11px] transition-colors"
                title="Download Dual Bilingual SRT"
              >
                Dual.srt
              </button>
            </div>
          </div>
        </div>

        {/* Status alerts */}
        {translateSuccess && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{translateSuccess}</span>
          </div>
        )}

        {translateError && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{translateError}</span>
          </div>
        )}
      </div>

      {/* Side-by-Side Subtitle Cue Editor */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 px-2 font-mono">
          <span>SCENE CUES ({scenes.length})</span>
          <span>ENGLISH / ARABIC SIDE-BY-SIDE</span>
        </div>

        <div className="space-y-3">
          {scenes.map((scene, idx) => (
            <div
              key={scene.scene_id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800/80 text-xs font-mono">
                <div className="flex items-center gap-3">
                  <span className="text-white font-bold">{scene.scene_id}</span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-400">{scene.duration || 10} seconds</span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-400 truncate max-w-xs">{scene.image_filename}</span>
                </div>

                <button
                  onClick={() => handleSingleTranslate(idx)}
                  disabled={translatingIndex === idx}
                  className="text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors text-[11px]"
                >
                  {translatingIndex === idx ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  <span>Re-translate</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* English Narration */}
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">
                    English Narration:
                  </label>
                  <textarea
                    value={scene.subtitleEn || scene.narration_text}
                    onChange={(e) => onUpdateScene(idx, { subtitleEn: e.target.value })}
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 leading-relaxed"
                  />
                </div>

                {/* Arabic Translation */}
                <div dir="rtl">
                  <label className="text-[11px] font-mono text-slate-400 block mb-1 text-right">
                    الترجمة العربية:
                  </label>
                  <textarea
                    value={scene.subtitleAr || ''}
                    placeholder="أدخل الترجمة العربية أو اضغط زر الترجمة الذكية..."
                    onChange={(e) => onUpdateScene(idx, { subtitleAr: e.target.value })}
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-sky-200 focus:outline-none focus:border-sky-500 leading-relaxed font-cairo text-right"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
