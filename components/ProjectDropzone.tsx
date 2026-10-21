'use client';

import React, { useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertTriangle, XCircle, Sparkles, RefreshCw } from 'lucide-react';
import { ProjectV7, ValidationReport } from '@/types/studio';
import { validateProjectV7, getMachiavelliSampleProject } from '@/lib/sample-data';

interface ProjectDropzoneProps {
  onProjectLoaded: (project: ProjectV7, report: ValidationReport) => void;
  currentReport?: ValidationReport;
  projectLoaded: boolean;
}

export function ProjectDropzone({
  onProjectLoaded,
  currentReport,
  projectLoaded,
}: ProjectDropzoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [pasteMode, setPasteMode] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

  const handleFile = (file: File) => {
    setParseError(null);
    if (!file.name.endsWith('.json')) {
      setParseError('Please upload a valid .json file (e.g. chapter_001_v7.json)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        const { project, report } = validateProjectV7(parsed);
        if (project) {
          onProjectLoaded(project, report);
        } else {
          setParseError(report.errors[0] || 'Invalid project schema.');
        }
      } catch (err: any) {
        setParseError(`JSON parsing error: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handlePasteSubmit = () => {
    setParseError(null);
    if (!jsonText.trim()) return;
    try {
      const parsed = JSON.parse(jsonText);
      const { project, report } = validateProjectV7(parsed);
      if (project) {
        onProjectLoaded(project, report);
      } else {
        setParseError(report.errors[0] || 'Invalid project schema.');
      }
    } catch (err: any) {
      setParseError(`JSON syntax error: ${err.message}`);
    }
  };

  const handleLoadSample = () => {
    setParseError(null);
    const demo = getMachiavelliSampleProject();
    const { project, report } = validateProjectV7(demo);
    if (project) {
      onProjectLoaded(project, report);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Upload card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-6">
          <div>
            <h2 className="text-lg font-bold font-outfit text-white tracking-tight">
              1. Import v7 Project Script (JSON)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Supports <code className="text-sky-400">chapter_XXX_v7.json</code> with scenes, narration, image prompts, and publishing data.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPasteMode(!pasteMode)}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-lg border border-slate-700/60 transition-colors"
            >
              {pasteMode ? 'Switch to File Drag & Drop' : 'Paste JSON Text'}
            </button>

            <button
              onClick={handleLoadSample}
              className="px-3 py-1.5 text-xs font-semibold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg border border-amber-500/30 transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load Machiavelli Demo</span>
            </button>
          </div>
        </div>

        {pasteMode ? (
          <div className="space-y-4">
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder="Paste raw v7 JSON here (e.g. { project: {...}, chapters: [...], publish: {...} })"
              rows={9}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-sky-500"
            />
            <button
              onClick={handlePasteSubmit}
              className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs rounded-xl shadow-md transition-colors"
            >
              Validate & Import JSON
            </button>
          </div>
        ) : (
          <div
            onDragEnter={() => setDragActive(true)}
            onDragLeave={() => setDragActive(false)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-all ${
              dragActive
                ? 'border-sky-400 bg-sky-950/20'
                : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
            }`}
          >
            <div className="w-14 h-14 rounded-full bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mx-auto text-sky-400 mb-4">
              <UploadCloud className="w-7 h-7" />
            </div>

            <h3 className="text-base font-semibold text-white font-outfit">
              Drag & Drop your chapter JSON here
            </h3>
            <p className="text-xs text-slate-400 mt-1.5 max-w-md mx-auto">
              Select or drop your structured <span className="text-sky-300">chapter_001_v7.json</span> file to sync scenes, voice cues, and publishing metadata.
            </p>

            <label className="mt-5 inline-block">
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <span className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors border border-slate-700 inline-flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-sky-400" />
                Browse JSON File
              </span>
            </label>
          </div>
        )}

        {parseError && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-start gap-2.5">
            <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{parseError}</span>
          </div>
        )}
      </div>

      {/* Validation Report strip */}
      {currentReport && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              {currentReport.isValid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              )}
              <span className="text-xs font-semibold text-white tracking-wide uppercase">
                {currentReport.isValid ? 'Schema v7 Validated' : 'Validation Issues Detected'}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
              <span>{currentReport.totalScenes} Scenes</span>
              <span aria-hidden="true">·</span>
              <span>{currentReport.totalWords} Words</span>
              <span aria-hidden="true">·</span>
              <span>~{currentReport.estimatedMinutes}m est. / {currentReport.targetMinutes}m target</span>
            </div>
          </div>

          {currentReport.durationDifferenceWarning && (
            <div className="mt-3 p-3 rounded-lg bg-amber-950/30 border border-amber-800/40 text-xs text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{currentReport.durationDifferenceWarning}</span>
            </div>
          )}

          {currentReport.warnings.length > 0 && !currentReport.durationDifferenceWarning && (
            <div className="mt-3 space-y-1">
              {currentReport.warnings.slice(0, 3).map((w, idx) => (
                <p key={idx} className="text-xs text-amber-400/90 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  {w}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
