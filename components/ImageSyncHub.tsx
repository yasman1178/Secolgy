'use client';

import React, { useState } from 'react';
import {
  Images,
  Check,
  AlertCircle,
  Upload,
  Eye,
  Clock,
  Sparkles,
  ArrowDownUp,
  RefreshCw,
  FolderOpen,
  FileQuestion,
  HelpCircle,
} from 'lucide-react';
import { SceneV7, MotionType, TransitionType } from '@/types/studio';
import {
  smartMatchFilesToScenes,
  sequentialMatchFiles,
  readFileAsDataUrl,
  SmartMatchReport,
} from '@/lib/image-matcher';

interface ImageSyncHubProps {
  scenes: SceneV7[];
  onUpdateScene: (index: number, updated: Partial<SceneV7>) => void;
  onBatchUpdateScenes: (updates: Array<{ index: number; dataUrl: string; matchedFilename?: string }>) => void;
  onNotify: (msg: string) => void;
}

export function ImageSyncHub({
  scenes,
  onUpdateScene,
  onBatchUpdateScenes,
  onNotify,
}: ImageSyncHubProps) {
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'missing' | 'matched'>('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastReport, setLastReport] = useState<SmartMatchReport | null>(null);
  const [cachedUploadedFiles, setCachedUploadedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // Process files and update scenes atomically
  const processFilesWithReport = async (report: SmartMatchReport) => {
    setIsProcessing(true);
    try {
      const matchEntries = Array.from(report.matches.entries());
      const updates: Array<{ index: number; dataUrl: string; matchedFilename: string }> = [];

      // Read files in parallel
      await Promise.all(
        matchEntries.map(async ([sceneIdx, match]) => {
          const dataUrl = await readFileAsDataUrl(match.file);
          updates.push({
            index: sceneIdx,
            dataUrl,
            matchedFilename: match.file.name,
          });
        })
      );

      onBatchUpdateScenes(updates);
      setLastReport(report);
      onNotify(`Matched and synchronized ${updates.length} artwork images successfully!`);
    } catch (err: any) {
      console.error('File reading error:', err);
      onNotify(`Error processing images: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle batch file drop or input
  const handleIncomingFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) {
      onNotify('No valid image files detected.');
      return;
    }

    setCachedUploadedFiles(files);
    // Run smart matcher
    const report = smartMatchFilesToScenes(files, scenes);
    await processFilesWithReport(report);
  };

  // Re-run matching sequentially
  const handleSequentialMatch = async () => {
    if (cachedUploadedFiles.length === 0) {
      onNotify('Upload or select your image files first.');
      return;
    }
    const report = sequentialMatchFiles(cachedUploadedFiles, scenes);
    await processFilesWithReport(report);
  };

  // Manual assign an unmatched file to a specific scene
  const handleManualAssign = async (file: File, sceneIndex: number) => {
    setIsProcessing(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      onUpdateScene(sceneIndex, { matchedImageData: dataUrl });
      onNotify(`Assigned "${file.name}" to Scene ${sceneIndex + 1}.`);

      if (lastReport) {
        const nextUnmatched = lastReport.unmatchedFiles.filter((f) => f.name !== file.name);
        setLastReport({
          ...lastReport,
          unmatchedFiles: nextUnmatched,
        });
      }
    } catch (err: any) {
      onNotify(`Error assigning file: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Single scene image replacement
  const handleSingleImageUpload = async (index: number, file: File) => {
    try {
      const dataUrl = await readFileAsDataUrl(file);
      onUpdateScene(index, { matchedImageData: dataUrl });
      onNotify(`Updated image for Scene ${index + 1}.`);
    } catch (err: any) {
      onNotify(`Error reading image: ${err.message}`);
    }
  };

  const matchedCount = scenes.filter(
    (s) => s.matchedImageData && !s.matchedImageData.startsWith('data:image/svg+xml')
  ).length;

  const filteredScenes = scenes
    .map((sc, i) => ({ scene: sc, originalIndex: i }))
    .filter(({ scene }) => {
      const hasCustom = Boolean(
        scene.matchedImageData && !scene.matchedImageData.startsWith('data:image/svg+xml')
      );
      if (filterMode === 'matched') return hasCustom;
      if (filterMode === 'missing') return !hasCustom;
      return true;
    });

  return (
    <div className="w-full space-y-6">
      {/* Batch Sync Drop Banner */}
      <div
        onDragEnter={() => setDragActive(true)}
        onDragLeave={() => setDragActive(false)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (e.dataTransfer.files) {
            handleIncomingFiles(e.dataTransfer.files);
          }
        }}
        className={`bg-slate-900 border rounded-2xl p-6 shadow-xl transition-all ${
          dragActive
            ? 'border-sky-400 bg-sky-950/20'
            : 'border-slate-800'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Images className="w-5 h-5 text-sky-400" />
              <h3 className="text-base font-bold font-outfit text-white tracking-tight">
                2. Smart Artwork Matching Engine
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Supports any naming convention: numbered files (<code className="text-sky-300">1.png</code>, <code className="text-sky-300">02.jpg</code>), scene IDs (<code className="text-sky-300">sc01.webp</code>), or full names. The engine extracts numbers and aligns them automatically.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {cachedUploadedFiles.length > 0 && (
              <button
                onClick={handleSequentialMatch}
                disabled={isProcessing}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-medium text-xs rounded-xl border border-slate-700/80 transition-colors flex items-center gap-1.5"
                title="Force mapping files in ascending order (1st file to 1st scene)"
              >
                <ArrowDownUp className="w-3.5 h-3.5" />
                <span>Match by Sequential Order (1 to N)</span>
              </button>
            )}

            <label className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs rounded-xl cursor-pointer transition-colors flex items-center gap-2 shadow-md shrink-0">
              {isProcessing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span>{isProcessing ? 'Processing Images...' : 'Select or Drop Image Files'}</span>
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                disabled={isProcessing}
                onChange={(e) => e.target.files && handleIncomingFiles(e.target.files)}
              />
            </label>
          </div>
        </div>

        {/* Sync Summary & Filter Controls */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4 text-slate-400 font-mono">
            <span>
              <strong className="text-white">{matchedCount}</strong> of <strong className="text-white">{scenes.length}</strong> Scenes Matched
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {scenes.length - matchedCount === 0 ? (
                <span className="text-emerald-400 font-medium">All Scenes Matched with Artwork</span>
              ) : (
                <span className="text-amber-400 font-medium">{scenes.length - matchedCount} using 16:9 placeholder previews</span>
              )}
            </span>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                filterMode === 'all' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({scenes.length})
            </button>
            <button
              onClick={() => setFilterMode('matched')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                filterMode === 'matched' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Matched ({matchedCount})
            </button>
            <button
              onClick={() => setFilterMode('missing')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                filterMode === 'missing' ? 'bg-slate-800 text-amber-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Placeholders ({scenes.length - matchedCount})
            </button>
          </div>
        </div>

        {/* Unmatched Files Tray (if any file couldn't be auto-matched) */}
        {lastReport && lastReport.unmatchedFiles.length > 0 && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-medium">
              <FileQuestion className="w-4 h-4 text-amber-400" />
              <span>Unmatched Uploaded Files ({lastReport.unmatchedFiles.length}):</span>
            </div>
            <p className="text-[11px] text-slate-400">
              These files could not be safely matched by number or name. Click to manually assign any file:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {lastReport.unmatchedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300"
                >
                  <span className="font-mono text-[11px] text-white truncate max-w-[140px]">{file.name}</span>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value !== '') {
                        handleManualAssign(file, Number(e.target.value));
                      }
                    }}
                    className="bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-sky-400"
                  >
                    <option value="" disabled>Assign to Scene...</option>
                    {scenes.map((s, sIdx) => (
                      <option key={s.scene_id} value={sIdx}>
                        Scene {sIdx + 1} ({s.scene_id})
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Grid of Scenes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredScenes.map(({ scene, originalIndex }) => {
          const isCustomImage = Boolean(
            scene.matchedImageData && !scene.matchedImageData.startsWith('data:image/svg+xml')
          );

          return (
            <div
              key={scene.scene_id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-xl overflow-hidden transition-all flex flex-col group"
            >
              {/* 16:9 Preview Thumbnail */}
              <div className="relative aspect-video bg-slate-950 overflow-hidden border-b border-slate-800/80">
                {scene.matchedImageData ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={scene.matchedImageData}
                    alt={scene.scene_id}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-700 text-xs font-mono">
                    Scene {originalIndex + 1} Placeholder
                  </div>
                )}

                {/* Top status bar overlay */}
                <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-slate-950/80 text-white backdrop-blur-sm border border-slate-800">
                    #{originalIndex + 1} · {scene.scene_id}
                  </span>

                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-medium backdrop-blur-sm flex items-center gap-1 border ${
                      isCustomImage
                        ? 'bg-emerald-950/80 border-emerald-700/60 text-emerald-300'
                        : 'bg-amber-950/80 border-amber-700/60 text-amber-300'
                    }`}
                  >
                    {isCustomImage ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    <span>{isCustomImage ? 'Matched' : 'Placeholder'}</span>
                  </span>
                </div>

                {/* Bottom single upload trigger */}
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <label className="p-1.5 bg-slate-900/90 hover:bg-slate-800 text-white rounded-lg cursor-pointer border border-slate-700/80 text-xs inline-flex items-center gap-1 shadow-lg">
                    <Upload className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Replace</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleSingleImageUpload(originalIndex, e.target.files[0])}
                    />
                  </label>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1.5">
                    <span className="truncate max-w-[200px]" title={scene.image_filename}>
                      Target: {scene.image_filename}
                    </span>
                    <span className="flex items-center gap-1 shrink-0 text-slate-500">
                      <Clock className="w-3 h-3" />
                      {scene.duration || 10}s
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {scene.narration_text}
                  </p>
                </div>

                {/* Motion and Transition Controls */}
                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500">Motion:</span>
                    <select
                      value={scene.motion}
                      onChange={(e) => onUpdateScene(originalIndex, { motion: e.target.value as MotionType })}
                      className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-sky-400 focus:outline-none focus:border-sky-500"
                    >
                      <option value="zoom_in">Zoom In</option>
                      <option value="zoom_out">Zoom Out</option>
                      <option value="pan_left">Pan Left</option>
                      <option value="pan_right">Pan Right</option>
                      <option value="static">Static</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500">Transition:</span>
                    <select
                      value={scene.transition}
                      onChange={(e) => onUpdateScene(originalIndex, { transition: e.target.value as TransitionType })}
                      className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-amber-400 focus:outline-none focus:border-amber-500"
                    >
                      <option value="dissolve">Dissolve</option>
                      <option value="fade">Fade</option>
                      <option value="cut">Cut</option>
                    </select>
                  </div>
                </div>

                {/* Image prompt collapsible/viewer */}
                <button
                  onClick={() => setSelectedSceneIndex(selectedSceneIndex === originalIndex ? null : originalIndex)}
                  className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors pt-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>{selectedSceneIndex === originalIndex ? 'Hide Prompt' : 'View Image Prompt'}</span>
                </button>

                {selectedSceneIndex === originalIndex && (
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80 text-[11px] text-slate-400 font-mono leading-normal">
                    {scene.image_prompt_en || 'No prompt specified.'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
