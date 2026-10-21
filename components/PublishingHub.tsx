'use client';

import React, { useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  Sparkles,
  Download,
  Languages,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Wand2,
} from 'lucide-react';
import { PublishInfoV7, SceneV7 } from '@/types/studio';
import { sanitizeText, sanitizeTags, generateYouTubeChapters } from '@/lib/sanitizer';
import { downloadFile } from '@/lib/srt-exporter';

interface PublishingHubProps {
  publishData: PublishInfoV7;
  scenes: SceneV7[];
  onUpdatePublish: (updated: Partial<PublishInfoV7>) => void;
}

export function PublishingHub({
  publishData,
  scenes,
  onUpdatePublish,
}: PublishingHubProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeLang, setActiveLang] = useState<'ar' | 'en'>('ar');

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  };

  // Run sanitizer
  const handleSanitize = () => {
    const cleanDesc = sanitizeText(publishData.description);
    const cleanTagsList = sanitizeTags(publishData.tags);
    onUpdatePublish({
      description: cleanDesc,
      tags: cleanTagsList,
    });
    setStatusMessage('Cleaned invisible characters and normalized divider lines!');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Auto-generate chapters from real scene timings
  const handleInsertChapters = () => {
    const chaptersText = generateYouTubeChapters(scenes, 'المقدمة: هندسة القوة');
    const updatedDesc = `${publishData.description}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━\n⏱️ الفصول الزمنية (Chapters):\n${chaptersText}`;
    onUpdatePublish({
      description: sanitizeText(updatedDesc),
    });
    setStatusMessage('Generated and inserted accurate 00:00 YouTube chapter timestamps!');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Gemini Translate or Optimize
  const handleAiAction = async (action: 'translate' | 'optimize') => {
    setIsProcessing(true);
    setStatusMessage(null);

    try {
      const targetLang = activeLang === 'ar' ? 'en' : 'ar';
      const res = await fetch('/api/gemini/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          publishData,
          targetLanguage: targetLang,
        }),
      });

      if (!res.ok) throw new Error('Failed to process publishing package');
      const data = await res.json();

      onUpdatePublish({
        title_options: data.title_options || publishData.title_options,
        description: data.description || publishData.description,
        tags: data.tags || publishData.tags,
        pinned_comment: data.pinned_comment || publishData.pinned_comment,
      });

      if (action === 'translate') {
        setActiveLang(targetLang);
        setStatusMessage(`Translated publishing package to ${targetLang === 'en' ? 'English' : 'Arabic'}!`);
      } else {
        setStatusMessage('Enhanced YouTube titles, description & tags with Gemini!');
      }
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleDownloadPublishPackage = () => {
    const content = `TITLE OPTIONS:\n${publishData.title_options.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\n` +
      `TAGS:\n${publishData.tags.join(', ')}\n\n` +
      `PINNED COMMENT:\n${publishData.pinned_comment}\n\n` +
      `DESCRIPTION:\n${publishData.description}\n\n` +
      `THUMBNAILS:\n${publishData.thumbnails.map((th, i) => `Concept ${i + 1}: ${th.concept}\nPrompt: ${th.prompt_en}\nOverlay: ${th.overlay_text}\n`).join('\n')}`;

    downloadFile(content, 'publish_package.txt', 'text/plain');
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Top Banner Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-sky-400" />
              <h2 className="text-base font-bold font-outfit text-white tracking-tight">
                4. YouTube Publishing Hub (MachinaMind)
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              One-click copy, automated zero-width character sanitizer, timeline chapter generator, and bilingual translation.
            </p>
          </div>

          {/* AI and Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleAiAction('translate')}
              disabled={isProcessing}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 font-medium text-xs rounded-xl border border-slate-700/80 transition-colors flex items-center gap-1.5"
            >
              <Languages className="w-4 h-4" />
              <span>{activeLang === 'ar' ? 'Translate to English' : 'Translate to Arabic'}</span>
            </button>

            <button
              onClick={() => handleAiAction('optimize')}
              disabled={isProcessing}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-medium text-xs rounded-xl border border-slate-700/80 transition-colors flex items-center gap-1.5"
            >
              <Wand2 className="w-4 h-4" />
              <span>Optimize with Gemini</span>
            </button>

            <button
              onClick={handleSanitize}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-xl border border-slate-700/80 transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Sanitize Text</span>
            </button>

            <button
              onClick={handleDownloadPublishPackage}
              className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>Download publish.txt</span>
            </button>
          </div>
        </div>

        {statusMessage && (
          <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-800/60 text-xs text-sky-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* Title Options */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
          <span className="text-xs font-semibold text-white tracking-wider uppercase font-mono">
            YouTube Title Options ({publishData.title_options.length})
          </span>
          <span className="text-xs text-slate-500 font-mono">Pick & Copy</span>
        </div>

        <div className="space-y-2">
          {publishData.title_options.map((title, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors"
            >
              <span className="text-xs text-slate-200 font-medium leading-relaxed font-cairo">
                {title}
              </span>
              <button
                onClick={() => copyToClipboard(title, `title_${i}`)}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 shrink-0 transition-colors"
                title="Copy Title"
              >
                {copiedKey === `title_${i}` ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Description Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
          <span className="text-xs font-semibold text-white tracking-wider uppercase font-mono">
            YouTube Description
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleInsertChapters}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-mono transition-colors flex items-center gap-1"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Insert Scene Chapters</span>
            </button>

            <button
              onClick={() => copyToClipboard(publishData.description, 'description')}
              className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              {copiedKey === 'description' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Description</span>
                </>
              )}
            </button>
          </div>
        </div>

        <textarea
          value={publishData.description}
          onChange={(e) => onUpdatePublish({ description: e.target.value })}
          rows={12}
          dir={activeLang === 'ar' ? 'rtl' : 'ltr'}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-200 focus:outline-none focus:border-sky-500 leading-relaxed font-cairo"
        />
      </div>

      {/* Tags and Pinned Comment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tags */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <span className="text-xs font-semibold text-white tracking-wider uppercase font-mono">
              YouTube Tags ({publishData.tags.length})
            </span>
            <button
              onClick={() => copyToClipboard(publishData.tags.join(', '), 'tags')}
              className="text-xs text-sky-400 hover:text-sky-300 font-mono flex items-center gap-1"
            >
              {copiedKey === 'tags' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy All Tags</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {publishData.tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 font-cairo"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Pinned Comment */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <span className="text-xs font-semibold text-white tracking-wider uppercase font-mono">
              Pinned Comment
            </span>
            <button
              onClick={() => copyToClipboard(publishData.pinned_comment, 'pinned')}
              className="text-xs text-sky-400 hover:text-sky-300 font-mono flex items-center gap-1"
            >
              {copiedKey === 'pinned' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy</span>
            </button>
          </div>

          <textarea
            value={publishData.pinned_comment}
            onChange={(e) => onUpdatePublish({ pinned_comment: e.target.value })}
            rows={4}
            dir={activeLang === 'ar' ? 'rtl' : 'ltr'}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-sky-500 leading-relaxed font-cairo"
          />
        </div>
      </div>

      {/* Thumbnails Concepts */}
      {publishData.thumbnails && publishData.thumbnails.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
          <span className="text-xs font-semibold text-white tracking-wider uppercase font-mono">
            Thumbnail Concepts & English Prompts ({publishData.thumbnails.length})
          </span>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {publishData.thumbnails.map((thumb, i) => (
              <div key={i} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-sky-400 font-semibold">Concept {i + 1}</span>
                  <span className="px-2 py-0.5 rounded text-[11px] bg-amber-500/10 text-amber-300 font-cairo border border-amber-500/30">
                    {thumb.overlay_text}
                  </span>
                </div>
                <p className="text-xs text-slate-200 font-medium font-outfit">{thumb.concept}</p>
                <div className="pt-2 border-t border-slate-850">
                  <span className="text-[10px] text-slate-500 font-mono block mb-1">Image Prompt (EN):</span>
                  <p className="text-[11px] text-slate-400 font-mono line-clamp-3">{thumb.prompt_en}</p>
                  <button
                    onClick={() => copyToClipboard(thumb.prompt_en, `thumb_${i}`)}
                    className="mt-2 text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 font-mono"
                  >
                    {copiedKey === `thumb_${i}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copy Prompt</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
