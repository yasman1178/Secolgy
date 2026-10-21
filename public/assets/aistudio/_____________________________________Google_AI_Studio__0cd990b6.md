# خطة عمل: تحويل الاستوديو لفيديو طويل (Google AI Studio)

من «استوديو حكايات الشورتس» إلى استوديو فيديوهات طويلة (16:9) بصوت إنجليزي وترجمة عربية ومعلومات نشر جاهزة

## 1. الفكرة في سطرين

البرنامج الحالي بيصنع شورتس عمودية بصوت مصري وطبقات VFX. المطلوب نسخة تانية بنفس الأساس (Next.js + Canvas + WebCodecs + Edge-TTS) لكن بتاخد ملف `chapter_XXX_v7.json` وتطلّع فيديو أفقي 16:9 مدته 20 إلى 30 دقيقة، بصوت إنجليزي، وترجمة عربية، وبيانات نشر عربية بنفس شكل وصف فيديو ميكيافيلي اللي بعتّه.

## 2. الفرق بين النظامين

| الجزء | الحالي (v19) | الجديد (v7) |
| --- | --- | --- |
| الشكل | 9:16، 30 مشهد قصير | 16:9، حوالي 33 مشهد طويل لكل فصل |
| الصوت | عامية مصرية، 6 بروفايلات | إنجليزي، صوت واحد (مثال: `en-GB-RyanNeural`) |
| الصور | `_bg` + `_fg` + VFX | صورة واحدة لكل مشهد + حركة كاميرا |
| الانتقال | beats وهزّات | `cut` أو `fade` أو `dissolve` |
| الترجمة | كلمات التعليق المصري فوق الفيديو | ترجمة إنجليزي + عربي، وملفات SRT/VTT |
| النشر | عناوين شورتس وهاشتاجات | وصف عربي منظم + فصول بالتوقيت + 3 ثمبنيل + تعليق مثبت |

الحقول اللي بيعتمد عليها v7: `project` (العنوان واللغة والصوت والمدة المستهدفة)، `chapters[].scenes[]` (النص `narration_text` واسم الصورة `image_filename` وبرومبت الصورة `image_prompt_en` والحركة `motion` والانتقال `transition`)، و`publish` (خيارات العناوين والوصف والوسوم والثمبنيلات والتعليق المثبت).

## 3. ملاحظات من الملف المرفوع

1. **المدة أقصر من الهدف:** الفصل فيه حوالي 2850 كلمة، وبسرعة تعليق عادية (حوالي 150 كلمة في الدقيقة، تقدير) هيطلع تقريباً 19 دقيقة، مش 28. المحرك لازم يحسب المدة الفعلية من الصوت ويحذّر لو بعدت عن `target_minutes`.
2. **المشاهد طويلة:** المشهد من 56 إلى 151 كلمة، يعني الصورة الواحدة بتفضل 22 إلى 60 ثانية. الحل: تقسيم المشهد تلقائياً لـ «لقطات» من 8 إلى 12 ثانية، وكل لقطة بحركة كاميرا مختلفة (تبديل zoom/pan) على نفس الصورة، أو صورة إضافية لو اتولّدت.
3. **حركة وانتقالات قليلة التنوع:** 30 من 33 انتقال `dissolve`، فالمحرك يقبلهم كما هم لكن يسمح بتغييرهم.
4. **أخطاء في الوصف العربي المرفق:** فيه كلمة «جديد» زايدة بعد علامة استفهام، وفواصل `━━━` مكسورة، وحروف غير مرئية (zero-width) جوه الهاشتاجات. لازم وحدة تنظيف تلقائية قبل النشر.
5. **اللغتين:** السرد إنجليزي (`language: en`) والنشر عربي، فالترجمة هنا للترجمة المصاحبة (Subtitles) والوصف، مش للصوت.

## 4. المعمارية المستهدفة

- **تطبيق Next.js** (ينفع في AI Studio Build): واجهة React + مسارات Node على السيرفر.
- **`/api/tts`** على السيرفر لـ Edge-TTS (المكتبة محتاجة سيرفر، مش بتشتغل مباشرة من المتصفح).
- **`/api/gemini`** على السيرفر للترجمة وتوليد بيانات النشر، والمفتاح `GEMINI_API_KEY` يتحط كـ Secret ومايظهرش للمتصفح أبداً.
- **المتصفح** يتولى الرندر (Canvas + WebCodecs + mp4-muxer) وتخزين الصوت والصور في IndexedDB زي الآن.
- تخزين اختياري للمشاريع في Firestore لو عايز نسخة سحابية.

## 5. خطة التنفيذ على مراحل

كل مرحلة = رسالة واحدة في AI Studio، وبعدها تجرب وتتأكد من معيار القبول قبل اللي بعدها. لو بدأت من المستودع الحالي، استورده من GitHub الأول (المستودع خاص، فهتحتاج تدي AI Studio صلاحية).

### المرحلة 0: التجهيز

- افتح Build في AI Studio، واختار Next.js لو متاح.
- استورد `yasman1178/story-prompter-web` أو ابدأ مشروع جديد وانسخ له ملف `SYSTEM_ARCHITECTURE_ANALYSIS.md` كمرجع.
- ضيف `GEMINI_API_KEY` في Secrets (AI Studio بيضبطه لوحده في أغلب الأحوال، تأكد).
- ارفع `chapter_001_v7.json` كعيّنة اختبار ثابتة.

### المرحلة 1: استيراد v7 والتحقق منه

```text
Refactor this studio into a long-form (16:9, 1920x1080) video tool.
Step 1 only: replace the old story schema with the new "v7" schema.
- Types: project{title,language,voice,target_minutes}, chapters[{chapter_id,title,scenes[{scene_id,narration_text,image_filename,image_prompt_en,motion,transition}]}], publish{title_options[],description,tags[],thumbnails[{concept,prompt_en,overlay_text}],pinned_comment}.
- motion enum: static|zoom_in|zoom_out|pan_left|pan_right. transition enum: cut|fade|dissolve.
- Add a JSON import (file picker + paste) and a validator that reports: missing fields, unknown enums, scenes without images, word count per scene, total words, and estimated minutes vs target_minutes.
- Remove the foreground layer, VFX layers and vocal_cue profiles. Keep Zustand + IndexedDB.
Do not touch audio or export yet. Show a project page with a scene list and the validation report.
```

معيار القبول: رفع `chapter_001_v7.json` يظهر 33 مشهد و2850 كلمة تقريباً مع تحذير المدة.

### المرحلة 2: توليد الصوت (التعديل الأساسي الأول)

```text
Step 2: rebuild voice generation for English narration.
- Replace the Egyptian-Arabic text optimizer with an English normalizer: strip markdown, expand digits and common abbreviations, split sentences longer than ~35 words at commas.
- /api/tts (server route, edge-tts-universal): input {text, voice, rate, pitch}; return mp3 plus word boundary timings (word, startMs, endMs).
- Voice settings screen: voice dropdown (default from project.voice, e.g. en-GB-RyanNeural, plus 3-4 other English voices), rate and pitch sliders, a 10-second preview button.
- "Generate all" button: per scene, split narration into chunks of at most 300 characters, synthesize 3 requests in parallel with retry and backoff, then concatenate. Cache each result in IndexedDB keyed by hash(text+voice+rate+pitch) so unchanged scenes are never regenerated.
- Measure real duration with decodeAudioData; add 0.35s between sentences and 0.8s between scenes. Show per-scene status and total runtime.
- Allow per-scene regenerate and uploading my own recorded audio instead.
Keep the Audio Ducking engine for optional background music.
```

معيار القبول: توليد الفصل كله بدون أخطاء، وإعادة التوليد التانية فورية (من الكاش).

### المرحلة 3: الترجمة والـ Subtitles (التعديل الأساسي التاني)

```text
Step 3: subtitles and translation.
- Build English subtitle cues from the TTS word boundaries: max 2 lines, max ~42 chars per line, 1.5 to 6 seconds per cue. Store cues with ids and start/end times.
- /api/gemini translate endpoint: translate cues to Arabic (Modern Standard Arabic, natural and concise) in batches of ~40 cues, keeping ids and timing untouched. Use structured JSON output with a response schema, low temperature, and validate that every id comes back. Retry failed batches.
- Subtitle editor: side-by-side EN/AR, edit text inline, re-translate a single cue.
- Display modes: EN only, AR only, bilingual, off. Render Arabic correctly on canvas (direction rtl, font Cairo or Noto Naskh Arabic) with a semi-transparent bar.
- Export .srt and .vtt for each language, so they can be uploaded to YouTube as separate subtitle tracks.
```

معيار القبول: ملف SRT عربي يفتح في مشغّل فيديو والتوقيت مطابق للإنجليزي، والنص العربي مش مقطوع ولا معكوس.

### المرحلة 4: معلومات النشر (التعديل الأساسي التالت)

```text
Step 4: publish page (Arabic).
- Use publish{} from the JSON as the default values; allow editing.
- Button "Generate / improve with Gemini": from the full narration, produce 3 title options, an Arabic description, 15-20 tags, 3 thumbnail concepts with English prompts and short Arabic overlay text, and a pinned comment. Structured JSON output.
- Description template (Arabic): 2-line hook first; "what you will learn" bullet list; a short key-truth paragraph; community commitment lines; subscribe call to action once (no duplication); recommended reading list; hashtags (max 20); educational disclaimer line. Use simple section dividers.
- Auto-generate YouTube chapters from the real scene timings (first at 0:00, at least 3, each at least 10 seconds) and insert them into the description.
- Sanitizer before copy/export: remove zero-width characters, repair broken divider lines, remove stray words after punctuation, collapse repeated blank lines, flag duplicate paragraphs.
- Copy buttons for each field and a "Download publish.txt" button.
```

معيار القبول: الوصف ينسخ نضيف بدون حروف مخفية، والفصول بتوقيتات صحيحة.

### المرحلة 5: الرندر الأفقي

```text
Step 5: export engine for 16:9.
- Canvas 1920x1080, 30 fps, WebCodecs H.264 + mp4-muxer, with MediaRecorder WebM fallback.
- Each scene is split into shots of 8-12 seconds; apply scene.motion (Ken Burns 1.0 to 1.12 scale, slow pans) and alternate motion between shots of the same image. Apply transitions (cut / fade / dissolve 0.6s).
- Mix narration + optional music with ducking into one audio track.
- Optional burned-in subtitles using the selected display mode.
- Render by range (from scene A to scene B) and stream chunks to avoid running out of memory on long videos. Show progress, ETA, and a cancel button.
- Presets: High (8-12 Mbps), Compact (4-6 Mbps).
```

معيار القبول: رندر أول 3 مشاهد بدون مشاكل، ثم الفصل كله على جهازك الفعلي.

### المرحلة 6: لمسات أخيرة (اختياري)

- شاشة «مولّد سيناريو» بـ Gemini تنتج JSON بصيغة v7 من موضوع واحد، مع نفس المدقق.
- حفظ المشاريع في Firestore.
- نشر التطبيق على Cloud Run أو Vercel، وتصدير الكود إلى GitHub.

## 6. مخاطر وحلول

- **Edge-TTS غير رسمي:** ممكن يتوقف أو يتغير. اعمل واجهة `TtsProvider` عشان تبدّل لمزوّد تاني (مثل Gemini TTS أو مزوّد مدفوع) من غير ما تعيد كتابة التطبيق.
- **الرندر الطويل:** 20 إلى 30 دقيقة على المتصفح ثقيل. اعتمد الرندر بالنطاق وجرّب على جهازك قبل ما تعتمد على سير العمل.
- **جودة الترجمة:** راجع الترجمة العربية بنفسك في أول فيديو، وسجّل أي مصطلحات متكررة (ميكيافيلي، Gaslighting) في قاموس يُحقن في برومبت الترجمة.
- **تغيّر AI Studio:** الواجهة والميزات (اختيار Next.js، استيراد GitHub) بتتحدث، فاتأكد منها وقت التنفيذ.
- **الحقوق:** برومبتات الصور والموسيقى لازم تكون أصلية، ومش تقليد لأعمال محمية.

## 7. ترتيب العمل المقترح

المراحل 0 و1 في يوم، والمرحلة 2 والمرحلة 3 في يوم، والمرحلة 4 والمرحلة 5 في يوم أو اتنين، مع اختبار الفصل الأول كامل قبل أي إضافات. لو حصل خطأ في مرحلة، ارجع بالرسالة نفسها للتعديل بدل ما تبدأ مرحلة جديدة فوقه.
