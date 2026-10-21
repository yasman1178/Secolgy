# Fix: Smart Auto-Match & Image Synchronization Engine

A comprehensive solution to resolve image mismatch issues when uploading custom-named or numbered files (e.g., `1.png`, `sc01.jpg`, `scene_01.webp`) into MachinaMind Studio.

## User Review & Critical Decisions

> [!IMPORTANT]
> Based on your answers, the matching engine will be upgraded from rigid filename equality to a **Multi-Strategy Smart Matcher**:
> 1. **Numerical Extraction Match**: Automatically extracts digits from filenames (`1.png`, `01.jpg`, `sc01`, `scene1`, `img_001`) and pairs them directly with the corresponding scene index or scene number.
> 2. **Sequential Order Fallback**: Sorts uploaded files using natural numerical sorting (`1, 2, ..., 10, 11`) and maps them sequentially (1st file -> 1st scene, 2nd file -> 2nd scene).
> 3. **Atomic State Dispatch**: Replaces parallel individual `FileReader` callbacks with a single batched atomic update to prevent React state race conditions.
> 4. **Visual Mapping Inspector**: Adds a review drawer showing exactly which file matched each scene, with instant reassignment dropdowns and a "Re-match by Order" button.

---

## 1. Problem Analysis & Root Cause

1. **Rigid String Matching**: The previous implementation checked `fileName.includes(scene_id)`. For example, a file named `1.png` or `01.jpg` did not match a scene with `scene_id: "sc001"` or `image_filename: "ch01_sc001_florence_dawn.png"`.
2. **Extension Discrepancies**: The JSON script might specify `.png`, but creators frequently download or export `.jpg`, `.jpeg`, or `.webp`.
3. **Asynchronous State Tearing**: Reading multiple files concurrently with `new FileReader()` triggered rapid asynchronous `setProject` calls, causing state collisions and lost updates in React.

---

## 2. Technical Architecture & Matching Pipeline

```
Uploaded Files: [1.png, 2.jpg, sc03.webp, ...]
                    │
                    ▼
┌────────────────────────────────────────────────────────┐
│             Smart Auto-Matching Pipeline               │
│                                                        │
│  Stage 1: Normalized Exact Name & Stem Match           │
│           (strips extensions, lowercase, trims)        │
│                                                        │
│  Stage 2: Number & Digit Extractor                     │
│           (e.g., "sc01.jpg" -> 1 -> Scene #1)          │
│                                                        │
│  Stage 3: Natural Numeric Sort & Sequential Mapping    │
│           ([1, 2, 3...] -> [Scene 1, Scene 2, ...])   │
│                                                        │
│  Stage 4: Fuzzy Token Similarity                       │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│           Atomic Batch State Dispatcher                │
│  • Reads all files in parallel via Promise.all         │
│  • Compiles Map<sceneIndex, dataUrl> in memory         │
│  • Commits single atomic project state update          │
└────────────────────────────────────────────────────────┘
```

---

## 3. Key Enhancements & User Experience

- **Multi-File & Folder Dropper**: Supports dropping individual files, folders (`webkitdirectory`), or multiple selections.
- **Smart Number Parser**: Extracts numbers irrespective of prefixes (`sc`, `scene_`, `img`, `frame_`, `ch01_sc`, etc.).
- **Atomic Loading State**: Displays a clean loading progress bar during batch processing (`Reading 33 files... 100%`) before committing.
- **Visual Match Review & Unmatched Tray**:
  - Highlights matched files in green with preview thumbnails.
  - If any file remains ambiguous, shows an unmatched tray where creators can click to assign it to any scene.
  - "Force Sequential Match (1 to N)" button for when files were exported in order from tools like Midjourney or Stable Diffusion.
- **Single-Scene Quick Upload**: Direct drop or click on any individual scene card to replace its image.

---

## 4. Implementation Steps (Post-Approval)

1. **`lib/image-matcher.ts`**: Implement numerical extraction, natural sorting algorithm, and multi-tier matching heuristics.
2. **Update `components/ImageSyncHub.tsx`**: Add `Promise.all` atomic file reader, visual matching feedback, sequential mapping button, and manual assignment dropdowns.
3. **Update `app/page.tsx`**: Implement `handleBatchUpdateScenes(updates: Map<number, Partial<SceneV7>>)` for unified atomic state commit.
4. **Verification & Testing**: Verify with edge-case filenames (`1.png`, `01.jpg`, `scene_1.webp`, `sc001.png`, `image (1).png`) and run `compile_applet` and `lint_applet`.
