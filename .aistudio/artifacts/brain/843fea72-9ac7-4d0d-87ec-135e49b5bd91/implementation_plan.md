# MachinaMind 16:9 Long-Form Video Studio (v7 Engine)

A high-performance web studio for synchronizing long-form 16:9 horizontal videos from `chapter_XXX_v7.json` projects, matching scene images, rendering with local preview and server FFmpeg MP4 export, customizable multilingual subtitles, and publishing package management.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were aligned during the clarification interview:

- **Confirmed Decision 1 (Export Engine)**: Server-side FFmpeg MP4 rendering endpoint (`/api/render`) that compiles 1080p 16:9 MP4 files with audio mixing, transitions, and optional burned-in subtitles, paired with an instantaneous client-side Canvas 16:9 player for frame-accurate local preview and playback.
- **Confirmed Decision 2 (Startup State)**: The studio initializes with a clean, focused empty workspace ready for dropping or uploading a `chapter_XXX_v7.json` file and matching image files, accompanied by an optional "Load Machiavelli Sample Demo" button for testing without external files.
- **Confirmed Decision 3 (Subtitle Defaults & Customization)**: Subtitles default to English-only display with seamless switches to Arabic-only, Bilingual (Dual EN+AR), or Off. Custom typography controls (Cairo, Tajawal, Noto Sans Arabic, Outfit, JetBrains Mono), font size sliders, backdrop opacity, and native RTL alignment are included.
- **Confirmed Decision 4 (Channel Branding & Publishing Hub)**: Prominent "MachinaMind" channel branding with customizable on-video watermark (top-right, top-left, bottom-right, opacity control). The publishing tab provides one-click copy for clean descriptions (with automatically computed `00:00` YouTube chapter timestamps), tag cleaners (removing zero-width characters and repairing broken dividers), and Gemini-powered Arabic ⇄ English metadata translation.

---

## 1. Overview & Core Concept

- **What It Does**: Transforms documentary/essay script projects formatted in schema v7 into complete 16:9 widescreen videos (1920×1080). It synchronizes uploaded artwork with script scenes, generates/manages English narration voiceover and subtitles, translates subtitles into natural Arabic, provides Ken Burns camera dynamics (`zoom_in`, `zoom_out`, `pan_left`, `pan_right`, `static`), and outputs YouTube-ready publishing descriptions, titles, thumbnails prompts, and MP4 video.
- **Target Audience / Persona**: Documentary video creators, faceless YouTube channel producers (MachinaMind), historical essayists, and media creators who generate structured scripts and image assets and need an automated production pipeline.
- **Key Value**: Eliminates manual video editing in Premiere or DaVinci for automated documentaries: drag-and-drop JSON + images -> automated voiceover -> synchronized subtitles -> 1-click video render & YouTube publishing copy.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Import & Validation Flow**:
   - Creator opens MachinaMind Studio. Clean dropzone allows importing any `chapter_XXX_v7.json` file or clicking "Load Machiavelli Demo".
   - Validator audits project structure: total scenes, word counts, expected duration vs. `target_minutes`, and lists missing image files.
2. **Image Sync & Asset Matcher**:
   - Multi-file image uploader allows selecting or dragging a folder of scene images (e.g. `ch01_sc001_intro.png`, `ch01_sc002_prince.png`).
   - Matcher visually pairs each uploaded image filename with the corresponding scene. For missing images, prompts and generate/placeholder tools are provided.
3. **Audio & Subtitle Production**:
   - Voice selector (English natural voices e.g., `en-GB-RyanNeural`, `en-US-ChristopherNeural`, `en-US-GuyNeural`) with speed and pitch controls.
   - Narration generator splits scenes into timed audio cues, measures exact durations, and aligns word boundaries.
   - Multilingual subtitle editor displays English cues side-by-side with Arabic translations. Gemini API endpoint allows translating all or individual cues.
4. **16:9 Canvas Player & Subtitle Customizer**:
   - 16:9 widescreen stage with full playback controls (Play, Pause, Scrub, Scene Jump, Speed).
   - Ken Burns motion engine animates images smoothly with crossfades and dissolves between scenes.
   - MachinaMind watermark overlay with position/size controls.
   - Subtitle overlay toggle: `[Off | English | Arabic | Dual (Bilingual)]` with font selector (`Cairo`, `Tajawal`, `Noto Sans Arabic`, `Inter`), font size, and background bar opacity.
5. **Publishing Hub (YouTube Ready)**:
   - YouTube Title options (with copy button).
   - Sanitized Description box with auto-generated chapters from actual audio durations (00:00 Intro, 01:24 Chapter 1, etc.).
   - Cleaner tool removes zero-width characters (`\u200B`), fix broken `━━━` dividers, and collapses blank lines.
   - One-click Gemini translator converts Arabic description & titles to English or vice versa.
   - Thumbnail concepts & prompts viewer with copyable prompts.
6. **Video Export Center**:
   - Server-side FFmpeg MP4 generation with resolution presets (1080p 30fps), audio ducking, and subtitle burn-in option.
   - Direct download button for final MP4, plus export buttons for `.srt` (English), `.srt` (Arabic), and `publish.txt`.

### Visual Identity & Theme

- **Aesthetic Direction**: Dark-mode cinematic workstation with studio-grade polish (deep slate `#090D16`, carbon surfaces `#111827`, subtle hairline borders `#1F2937`, electric cyan/amber accents for active actions).
- **Typography**: `Outfit` / `Plus Jakarta Sans` for display headers and UI labels; `Cairo` & `Tajawal` for Arabic typography; `JetBrains Mono` for timecodes (`00:14 / 22:30`), word counts, and tabular numerals (`tabular-nums`).
- **Top Bar Contract**:
  - Zone 1: MachinaMind Studio wordmark with subtle 16:9 indicator.
  - Zone 2: Navigation tabs (`[Workspace | Timeline & Audio | Subtitles | Publishing Hub | Export]`).
  - Zone 3: Dark/Light Mode toggle + Primary "Export MP4" CTA button.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dual-Engine Rendering (Server FFmpeg + Client Canvas)**
  - *Chosen Approach*: Provide a real-time browser HTML5 Canvas engine for zero-wait editing and preview, combined with a dedicated server-side FFmpeg MP4 endpoint (`/api/render`) for definitive, hardware-accelerated MP4 export.
  - *Why*: Large 20-30 minute videos strain browser memory if using client-only WebCodecs. Server FFmpeg provides rock-solid MP4 encoding without tab crashes, while Canvas provides instant interactive preview.
- **Decision 2: IndexedDB Local Project Persistence**
  - *Chosen Approach*: Store project state, audio blobs, and uploaded image bitmaps in browser IndexedDB via Dexie/idb-keyval.
  - *Why*: Allows large multi-megabyte image assets and audio buffers to persist across page reloads without requiring heavy database logins.
- **Decision 3: Gemini 2.5 Flash for Subtitle Translation & Publishing Content**
  - *Chosen Approach*: Use Gemini API (`gemini-2.5-flash`) on server route `/api/gemini/translate` and `/api/gemini/publish` with structured JSON output schemas.
  - *Why*: Fast, highly accurate Modern Standard Arabic (MSA) translations with preserved subtitle timecodes, and robust sanitization of YouTube descriptions and chapters.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MachinaMind Studio UI                           │
│ ┌────────────────────────┐ ┌─────────────────────────────────────────┐ │
│ │ Scene & Asset List     │ │ 16:9 Widescreen Canvas Preview Player   │ │
│ │ • JSON v7 Validator    │ │ • Ken Burns Pan & Zoom Motion Engine    │ │
│ │ • Image Filename Match │ │ • MachinaMind Channel Watermark Overlay │ │
│ │ • Word Count / Times   │ │ • Dynamic Subtitle Renderer (EN/AR/Dual)│ │
│ └────────────────────────┘ └─────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ Bottom Workstation Tabs: [Scenes] [Audio] [Subtitles] [Publish]    │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│ Browser Client Engines               │  │ Server API Proxy Endpoints   │
│ • IndexedDB Project & Asset Storage  │  │ • /api/tts (Audio Voice Gen) │
│ • Web Audio API (Ducking & Preview)  │  │ • /api/gemini/translate      │
│ • Canvas 2D Transform / Crossfader   │  │ • /api/gemini/publish        │
│ • SRT / VTT Subtitle File Exporter   │  │ • /api/render (FFmpeg MP4)   │
└──────────────────────────────────────┘  └──────────────────────────────┘
```

### Component & Handler Mapping

| Component | Responsibility | Primary Handlers |
| :--- | :--- | :--- |
| `ProjectDropzone` | File input for `chapter_v7.json` | `handleFileUpload()`, `loadSampleDemo()` |
| `ImageMatcher` | Batch match uploaded images to scenes | `handleImageFilesDrop()`, `matchByName()` |
| `VideoCanvasPlayer` | 16:9 canvas with Ken Burns and transitions | `play()`, `pause()`, `seek(time)`, `setSubtitles()` |
| `SubtitleControls` | Font customization & language switcher | `setMode()`, `setFont()`, `setSize()`, `setBackdrop()` |
| `PublishingHub` | Title, description, tags, clean chapters | `copyField()`, `cleanFormatting()`, `translateMetadata()` |
| `ExportModal` | MP4 rendering with progress and ETA | `startFFmpegRender()`, `downloadSRT()`, `downloadPublish()` |

---

## 5. Implementation Phases (Post-Approval)

1. **Setup & Dependencies**: Configure packages (`@google/genai`, audio utilities, lucide icons) and project types for schema v7.
2. **Core Studio State & IndexedDB Store**: Build Zustand/Context store handling project metadata, scenes, image assets (object URLs/blobs), audio timings, and subtitles.
3. **16:9 Canvas Video Player & Ken Burns Engine**: Build canvas renderer with aspect ratio locking (1920x1080), smooth panning/zooming, scene transitions (`cut`, `fade`, `dissolve`), and MachinaMind watermark.
4. **Subtitle System & Font Customizer**: Build dual-language subtitle renderer (English, Arabic, Bilingual), font selectors (Cairo, Tajawal, Amiri), styling controls, and SRT/VTT downloaders.
5. **TTS & Audio Sync Engine**: Build `/api/tts` route and client voiceover pipeline with audio duration computation.
6. **Publishing Hub & Gemini Translation**: Build the YouTube publishing page with chapter timestamp generation, zero-width character cleaning, and Gemini translation endpoints.
7. **FFmpeg Server Rendering Endpoint**: Build `/api/render` to generate the complete 16:9 MP4 file.
8. **Verification & Polish**: Test building, dark mode styling, and complete end-to-end workflow verification.
