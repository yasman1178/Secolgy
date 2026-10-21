'use client';

import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { ProjectDropzone } from '@/components/ProjectDropzone';
import { ImageSyncHub } from '@/components/ImageSyncHub';
import { VideoCanvasPlayer } from '@/components/VideoCanvasPlayer';
import { SubtitleEditor } from '@/components/SubtitleEditor';
import { PublishingHub } from '@/components/PublishingHub';
import { ExportModal } from '@/components/ExportModal';
import { BatchVoiceGenerator } from '@/components/BatchVoiceGenerator';
import {
  ProjectV7,
  ValidationReport,
  SceneV7,
  SubtitleStyleSettings,
  ChannelWatermarkSettings,
  PublishInfoV7,
} from '@/types/studio';
import { Sparkles, Film, ArrowRight, Layers, FileJson, CheckCircle } from 'lucide-react';
import { getMachiavelliSampleProject, validateProjectV7 } from '@/lib/sample-data';

export default function StudioPage() {
  const [project, setProject] = useState<ProjectV7 | null>(null);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [activeTab, setActiveTab] = useState<'workspace' | 'player' | 'subtitles' | 'publish'>('workspace');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('en-GB-RyanNeural');

  // Subtitle settings (User selected: Default to English only with Karaoke & Glassmorphic Box)
  const [subtitleSettings, setSubtitleSettings] = useState<SubtitleStyleSettings>({
    displayMode: 'en',
    fontFamily: 'Cairo',
    fontSize: 42,
    textColor: '#FFFFFF',
    textSecondaryColor: '#38BDF8',
    backgroundColor: 'rgba(10, 15, 30, 0.72)',
    backgroundPadding: 16,
    positionY: 8,
    showTextShadow: true,
    karaokeEnabled: true,
    karaokeHighlightColor: '#FDE047',
    backdropStyle: 'glassmorphic',
    boxBorder: true,
  });

  // Channel Watermark settings (MachinaMind)
  const [watermarkSettings, setWatermarkSettings] = useState<ChannelWatermarkSettings>({
    enabled: true,
    channelName: 'MachinaMind',
    tagline: 'Documentary Intelligence',
    position: 'top-right',
    opacity: 0.85,
    scale: 1.0,
  });

  // Flattened scenes from all chapters for easy studio sequencing
  const scenes: SceneV7[] = project
    ? project.chapters.flatMap((ch) => ch.scenes)
    : [];

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleProjectLoaded = (newProject: ProjectV7, report: ValidationReport) => {
    setProject(newProject);
    setValidationReport(report);
    showNotification(`Project "${newProject.project.title}" loaded with ${report.totalScenes} scenes.`);
  };

  const handleUpdateScene = (index: number, updated: Partial<SceneV7>) => {
    if (!project) return;
    setProject((prev) => {
      if (!prev) return prev;
      let globalIdx = 0;
      const updatedChapters = prev.chapters.map((ch) => {
        const updatedScenes = ch.scenes.map((sc) => {
          if (globalIdx === index) {
            globalIdx++;
            return { ...sc, ...updated };
          }
          globalIdx++;
          return sc;
        });
        return { ...ch, scenes: updatedScenes };
      });
      return { ...prev, chapters: updatedChapters };
    });
  };

  const handleUpdatePublish = (updated: Partial<PublishInfoV7>) => {
    if (!project) return;
    setProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        publish: { ...prev.publish, ...updated },
      };
    });
  };

  const handleBatchUpdateScenes = (
    updates: Array<{ index: number; dataUrl: string; matchedFilename?: string }>
  ) => {
    if (!project) return;
    const updatesMap = new Map<number, { dataUrl: string; matchedFilename?: string }>();
    updates.forEach((u) => updatesMap.set(u.index, { dataUrl: u.dataUrl, matchedFilename: u.matchedFilename }));

    setProject((prev) => {
      if (!prev) return prev;
      let globalIdx = 0;
      const updatedChapters = prev.chapters.map((ch) => {
        const updatedScenes = ch.scenes.map((sc) => {
          const currentIdx = globalIdx++;
          const match = updatesMap.get(currentIdx);
          if (match) {
            return {
              ...sc,
              matchedImageData: match.dataUrl,
            };
          }
          return sc;
        });
        return { ...ch, scenes: updatedScenes };
      });
      return { ...prev, chapters: updatedChapters };
    });
  };

  const handleBatchVoiceSync = (
    updates: Array<{ index: number; duration: number; wordTimings: any[] }>
  ) => {
    if (!project) return;
    const updatesMap = new Map<number, { duration: number; wordTimings: any[] }>();
    updates.forEach((u) => updatesMap.set(u.index, { duration: u.duration, wordTimings: u.wordTimings }));

    setProject((prev) => {
      if (!prev) return prev;
      let globalIdx = 0;
      const updatedChapters = prev.chapters.map((ch) => {
        const updatedScenes = ch.scenes.map((sc) => {
          const currentIdx = globalIdx++;
          const match = updatesMap.get(currentIdx);
          if (match) {
            return {
              ...sc,
              duration: match.duration,
              wordTimings: match.wordTimings,
            };
          }
          return sc;
        });
        return { ...ch, scenes: updatedScenes };
      });
      return { ...prev, chapters: updatedChapters };
    });
  };

  const handleLoadDemo = () => {
    const demo = getMachiavelliSampleProject();
    const { project: validatedDemo, report } = validateProjectV7(demo);
    if (validatedDemo) {
      handleProjectLoaded(validatedDemo, report);
    }
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${
        isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Studio Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        onOpenExport={() => setIsExportOpen(true)}
        hasProject={Boolean(project)}
        projectName={project?.project.title}
        sceneCount={scenes.length}
      />

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900 border border-sky-500/50 text-sky-300 text-xs shadow-2xl flex items-center gap-2 animate-bounce-subtle">
          <CheckCircle className="w-4 h-4 text-sky-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Main Studio Viewport */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {!project ? (
          /* Empty Initial State - Ready for JSON Upload */
          <div className="space-y-8 animate-fade-in">
            {/* Hero Banner */}
            <div className="text-center max-w-2xl mx-auto space-y-3 pt-6">
              <span className="text-xs font-mono tracking-widest text-sky-400 uppercase">
                Long-Form Video Studio (16:9)
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-outfit text-white">
                MachinaMind Production Studio
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                Transform <code className="text-sky-300">chapter_XXX_v7.json</code> into documentary-grade 16:9 widescreen videos with synchronized artwork, customizable multilingual subtitles, and server FFmpeg MP4 export.
              </p>
            </div>

            {/* Dropzone Component */}
            <ProjectDropzone
              onProjectLoaded={handleProjectLoaded}
              currentReport={validationReport || undefined}
              projectLoaded={false}
            />

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto pt-4">
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-3">
                  <Film className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-white font-outfit">16:9 Horizontal & Ken Burns</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Smooth camera pans, zoom-in, zoom-out, and crossfade dissolves designed specifically for long-form desktop and YouTube viewing.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-white font-outfit">Multilingual Subtitles</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  English narration paired with Gemini-powered Modern Standard Arabic subtitles, with custom typography and dual-display modes.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-white font-outfit">YouTube Publishing Hub</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  One-click sanitized descriptions, real audio chapter timestamps, tag cleaner, and English translation with no invisible artifacts.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Active Project Studio Workspace */
          <div className="space-y-6">
            {/* Project Context Kicker Strip */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/70 border border-slate-800 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-white text-sm font-outfit">
                  {project.project.title}
                </span>
                <span className="text-slate-500">·</span>
                <span className="font-mono text-slate-400">
                  {scenes.length} Scenes
                </span>
                <span className="text-slate-500">·</span>
                <span className="font-mono text-slate-400">
                  Voice: {project.project.voice}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('player')}
                  className="px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 font-medium text-xs border border-sky-500/30 transition-colors flex items-center gap-1.5"
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Preview 16:9 Canvas</span>
                </button>
              </div>
            </div>

            {/* Tab 1: Workspace & Image Sync */}
            {activeTab === 'workspace' && (
              <div className="space-y-8 animate-fade-in">
                {/* Batch Voice Synthesis & Deep British Voice Suite */}
                <BatchVoiceGenerator
                  scenes={scenes}
                  onBatchUpdateScenes={handleBatchVoiceSync}
                  onNotify={showNotification}
                  selectedVoiceId={selectedVoiceId}
                  onSelectVoiceId={setSelectedVoiceId}
                />

                <ImageSyncHub
                  scenes={scenes}
                  onUpdateScene={handleUpdateScene}
                  onBatchUpdateScenes={handleBatchUpdateScenes}
                  onNotify={showNotification}
                />

                <div className="pt-6 border-t border-slate-800/80">
                  <ProjectDropzone
                    onProjectLoaded={handleProjectLoaded}
                    currentReport={validationReport || undefined}
                    projectLoaded={true}
                  />
                </div>
              </div>
            )}

            {/* Tab 2: 16:9 Canvas Player */}
            {activeTab === 'player' && (
              <div className="animate-fade-in space-y-6">
                <VideoCanvasPlayer
                  scenes={scenes}
                  subtitleSettings={subtitleSettings}
                  watermarkSettings={watermarkSettings}
                  selectedVoiceId={selectedVoiceId}
                  onUpdateSubtitleSettings={(up) => setSubtitleSettings((prev) => ({ ...prev, ...up }))}
                  onUpdateWatermarkSettings={(up) => setWatermarkSettings((prev) => ({ ...prev, ...up }))}
                />

                <BatchVoiceGenerator
                  scenes={scenes}
                  onBatchUpdateScenes={handleBatchVoiceSync}
                  onNotify={showNotification}
                  selectedVoiceId={selectedVoiceId}
                  onSelectVoiceId={setSelectedVoiceId}
                />
              </div>
            )}

            {/* Tab 3: Subtitles & Translation */}
            {activeTab === 'subtitles' && (
              <div className="animate-fade-in">
                <SubtitleEditor
                  scenes={scenes}
                  subtitleSettings={subtitleSettings}
                  onUpdateSubtitleSettings={(up) => setSubtitleSettings((prev) => ({ ...prev, ...up }))}
                  onUpdateScene={handleUpdateScene}
                />
              </div>
            )}

            {/* Tab 4: Publishing Hub */}
            {activeTab === 'publish' && (
              <div className="animate-fade-in">
                <PublishingHub
                  publishData={project.publish}
                  scenes={scenes}
                  onUpdatePublish={handleUpdatePublish}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Server FFmpeg MP4 Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        scenes={scenes}
        subtitleSettings={subtitleSettings}
        watermarkSettings={watermarkSettings}
      />
    </div>
  );
}
