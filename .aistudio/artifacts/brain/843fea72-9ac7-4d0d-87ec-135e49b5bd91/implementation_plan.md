# Deep British Voice Suite, Batch Voice Generation & Karaoke Subtitles

A comprehensive upgrade to MachinaMind Studio adding authoritative Deep British documentary voice profiles, an automated one-click batch voice synthesis engine that measures audio durations, and cinematic word-by-word karaoke subtitles rendered inside a glassmorphic container.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following design specifications were aligned during the clarification interview:

- **Confirmed Decision 1 (Deep British Voice Profiles)**: Curated library of authoritative British documentary voices:
  - `en-GB-RyanNeural` (Default: Deep, calculating, historical documentary tone)
  - `en-GB-OliverNeural` (Gravelly BBC nature & historical essayist)
  - `en-GB-ThomasNeural` (Deep resonant broadcast narrator)
  - `en-GB-BrianNeural` (Mature philosophical timbre)
  - Adjustable pitch control (down to `-20%` for deeper, cinematic baritone authority) and pacing speed (`0.85x` to `1.2x`).
- **Confirmed Decision 2 (Batch Voice Synthesis Engine)**: A dedicated "Generate All Voices at Once" control that:
  - Iterates through all scenes with real-time progress (`Generating Scene 4/33...`).
  - Measures real audio duration with Web Audio API.
  - Automatically updates each scene's duration and recalculates the total video timeline with realistic inter-sentence pauses.
  - Enables per-scene audio preview playback and re-generation.
- **Confirmed Decision 3 (Karaoke Subtitle Display & Glassmorphic Box)**:
  - Real-time word-by-word active highlight (words illuminate in electric gold `#FDE047` / cyan `#38BDF8` as spoken).
  - High-end glassmorphic container (`rgba(10, 15, 30, 0.72)` with rounded corners, subtle white hairline stroke, and optical contrast scrim).
  - Fully supports Dual Bilingual mode (English karaoke active line on top + elegant Cairo Arabic translation below).

---

## 1. Technical Architecture & Voice Pipeline

```
┌────────────────────────────────────────────────────────┐
│             Batch Voiceover Synthesizer                │
│                                                        │
│  [Generate All Voices] ──▶ Normalizes Narration Text   │
│                                  │                     │
│                                  ▼                     │
│                       Server TTS / Web Audio           │
│                                  │                     │
│                                  ▼                     │
│                    Computes Word Boundaries (ms)       │
│                                  │                     │
│                                  ▼                     │
│               Recalculates Scene Duration (seconds)    │
└──────────────────────────────────┬─────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────┐
│             16:9 Canvas Karaoke Renderer               │
│                                                        │
│  • Reads current scene elapsed time                    │
│  • Matches active spoken word by timing                │
│  • Renders glassmorphic frosted rounded rect           │
│  • Draws words with Gold highlight on current word     │
│  • Draws Arabic translation below (Cairo font, RTL)    │
└────────────────────────────────────────────────────────┘
```

---

## 2. Component Enhancements

1. **`lib/voice-profiles.ts`**:
   - British documentary voice profiles (`Ryan`, `Oliver`, `Thomas`, `Brian`, `Alfie`).
   - Deep pitch tuning presets (`Standard Baritone`, `Deep BBC Documentary -10%`, `Cinematic Deep Trailer -20%`).
   - Word boundary timing calculator.
2. **`lib/ken-burns.ts`**:
   - Upgrade `drawSubtitles` to support word-by-word karaoke highlighting.
   - Computes layout for active words, applying high-visibility gold/cyan fill and soft glow to the current word.
   - Glassmorphic backdrop box with rounded corners and subtle border.
3. **`components/BatchVoiceGenerator.tsx`**:
   - "Generate All Voiceovers at Once" button.
   - Progress bar with percentage, ETA, and Pause/Cancel controls.
   - Timeline synchronization button ("Apply Durations to Video Timeline").
   - Per-scene audio play/pause preview button.
4. **`components/SubtitleControls.tsx` & Player Overlays**:
   - Karaoke toggle (On/Off).
   - Word highlight color picker (Gold, Electric Cyan, Emerald, White).
   - Glassmorphic blur & opacity sliders.

---

## 3. Implementation Steps (Post-Approval)

1. Create `lib/voice-profiles.ts` with curated British voices and audio timing computation.
2. Update `lib/ken-burns.ts` to implement glassmorphic box math and word-by-word karaoke highlights.
3. Build `components/BatchVoiceGenerator.tsx` modal & toolbar in the studio.
4. Integrate batch voice generation and karaoke options into `components/VideoCanvasPlayer.tsx` and `app/page.tsx`.
5. Verify build and lint with `compile_applet` and `lint_applet`.
