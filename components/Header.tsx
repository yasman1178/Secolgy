'use client';

import React from 'react';
import { Film, Sparkles, Download, Moon, Sun, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  activeTab: 'workspace' | 'player' | 'subtitles' | 'publish';
  setActiveTab: (tab: 'workspace' | 'player' | 'subtitles' | 'publish') => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  onOpenExport: () => void;
  hasProject: boolean;
  projectName?: string;
  sceneCount?: number;
}

export function Header({
  activeTab,
  setActiveTab,
  isDarkMode,
  setIsDarkMode,
  onOpenExport,
  hasProject,
  projectName,
  sceneCount,
}: HeaderProps) {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
      {/* Zone 1: Brand wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
          <Film className="w-5 h-5" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-outfit text-lg font-bold tracking-tight text-white whitespace-nowrap">
            MachinaMind
          </span>
          <span className="text-xs text-sky-400 font-mono tracking-wider px-1.5 py-0.5 rounded bg-sky-950/60 border border-sky-800/40">
            16:9 STUDIO
          </span>
        </div>
      </div>

      {/* Zone 2: Single-line navigation tabs */}
      <nav className="hidden md:flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
        <button
          onClick={() => setActiveTab('workspace')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'workspace'
              ? 'bg-slate-800 text-sky-400 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Project & Assets {sceneCount ? `(${sceneCount})` : ''}
        </button>

        <button
          onClick={() => setActiveTab('player')}
          disabled={!hasProject}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
            !hasProject
              ? 'opacity-40 cursor-not-allowed text-slate-500'
              : activeTab === 'player'
              ? 'bg-slate-800 text-sky-400 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          16:9 Video Canvas
        </button>

        <button
          onClick={() => setActiveTab('subtitles')}
          disabled={!hasProject}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
            !hasProject
              ? 'opacity-40 cursor-not-allowed text-slate-500'
              : activeTab === 'subtitles'
              ? 'bg-slate-800 text-sky-400 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Subtitles & Translation
        </button>

        <button
          onClick={() => setActiveTab('publish')}
          disabled={!hasProject}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
            !hasProject
              ? 'opacity-40 cursor-not-allowed text-slate-500'
              : activeTab === 'publish'
              ? 'bg-slate-800 text-sky-400 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Publishing Hub
        </button>
      </nav>

      {/* Zone 3: Primary CTA action and Dark/Light Mode */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          title="Toggle Dark / Light Theme"
          className="p-2 text-slate-400 hover:text-slate-200 rounded-lg bg-slate-900 border border-slate-800 transition-colors"
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-400" />}
        </button>

        <button
          onClick={onOpenExport}
          disabled={!hasProject}
          className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all whitespace-nowrap shrink-0 shadow-lg ${
            !hasProject
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-sky-500/20 hover:shadow-sky-500/30'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export 16:9 MP4</span>
        </button>
      </div>
    </header>
  );
}
