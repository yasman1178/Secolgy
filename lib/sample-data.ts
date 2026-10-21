import { ProjectV7, ValidationReport, MotionType, TransitionType } from '@/types/studio';
import { estimateSceneDuration } from './sanitizer';

export function validateProjectV7(data: any): { project?: ProjectV7; report: ValidationReport } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data || typeof data !== 'object') {
    return {
      report: {
        isValid: false,
        totalScenes: 0,
        totalWords: 0,
        estimatedMinutes: 0,
        targetMinutes: 0,
        missingImageCount: 0,
        missingImageFilenames: [],
        warnings: [],
        errors: ['Uploaded file is not a valid JSON object.'],
      },
    };
  }

  // 1. Check project metadata
  if (!data.project) {
    errors.push('Missing top-level "project" object.');
  } else {
    if (!data.project.title) warnings.push('Project missing "title".');
    if (!data.project.language) warnings.push('Project missing "language", defaulting to "en".');
    if (!data.project.voice) warnings.push('Project missing "voice", defaulting to "en-GB-RyanNeural".');
    if (typeof data.project.target_minutes !== 'number') {
      warnings.push('Project missing "target_minutes", defaulting to 25.');
    }
  }

  // 2. Check chapters & scenes
  const chapters = Array.isArray(data.chapters) ? data.chapters : [];
  if (chapters.length === 0) {
    errors.push('No chapters found in "chapters" array.');
  }

  let totalScenes = 0;
  let totalWords = 0;
  let missingImageCount = 0;
  const missingImageFilenames: string[] = [];

  const validMotions: MotionType[] = ['static', 'zoom_in', 'zoom_out', 'pan_left', 'pan_right'];
  const validTransitions: TransitionType[] = ['cut', 'fade', 'dissolve'];

  chapters.forEach((chapter: any, cIdx: number) => {
    const scenes = Array.isArray(chapter.scenes) ? chapter.scenes : [];
    if (scenes.length === 0) {
      warnings.push(`Chapter ${chapter.chapter_id || cIdx + 1} has no scenes.`);
    }

    scenes.forEach((scene: any, sIdx: number) => {
      totalScenes++;
      const sceneLabel = scene.scene_id || `Scene ${totalScenes}`;

      if (!scene.narration_text) {
        errors.push(`${sceneLabel}: Missing "narration_text".`);
      } else {
        const words = scene.narration_text.trim().split(/\s+/).filter(Boolean).length;
        totalWords += words;
      }

      if (!scene.image_filename) {
        missingImageCount++;
        warnings.push(`${sceneLabel}: Missing "image_filename".`);
      } else {
        missingImageFilenames.push(scene.image_filename);
      }

      if (scene.motion && !validMotions.includes(scene.motion)) {
        warnings.push(`${sceneLabel}: Unknown motion "${scene.motion}", fallback to "zoom_in".`);
      }

      if (scene.transition && !validTransitions.includes(scene.transition)) {
        warnings.push(`${sceneLabel}: Unknown transition "${scene.transition}", fallback to "dissolve".`);
      }
    });
  });

  const estimatedMinutes = Math.round((totalWords / 140) * 10) / 10;
  const targetMinutes = data.project?.target_minutes || 25;

  let durationDifferenceWarning: string | undefined;
  if (Math.abs(estimatedMinutes - targetMinutes) > 3) {
    durationDifferenceWarning = `Script length (~${estimatedMinutes} mins, ${totalWords} words) deviates from target_minutes (${targetMinutes} mins). Consider adjusting pacing or narration length.`;
    warnings.push(durationDifferenceWarning);
  }

  const isValid = errors.length === 0 && totalScenes > 0;

  // Normalize project structure
  const normalizedProject: ProjectV7 = {
    project: {
      title: data.project?.title || 'Untitled Documentary',
      language: data.project?.language || 'en',
      voice: data.project?.voice || 'en-GB-RyanNeural',
      target_minutes: data.project?.target_minutes || 25,
    },
    chapters: chapters.map((ch: any, cIdx: number) => ({
      chapter_id: ch.chapter_id || `ch_${cIdx + 1}`,
      title: ch.title || `Chapter ${cIdx + 1}`,
      scenes: (ch.scenes || []).map((sc: any, sIdx: number) => ({
        scene_id: sc.scene_id || `sc_${sIdx + 1}`,
        narration_text: sc.narration_text || '',
        image_filename: sc.image_filename || `scene_${sIdx + 1}.png`,
        image_prompt_en: sc.image_prompt_en || '',
        motion: (validMotions.includes(sc.motion) ? sc.motion : 'zoom_in') as MotionType,
        transition: (validTransitions.includes(sc.transition) ? sc.transition : 'dissolve') as TransitionType,
        duration: sc.duration || estimateSceneDuration(sc.narration_text || ''),
        subtitleEn: sc.subtitleEn || sc.narration_text || '',
        subtitleAr: sc.subtitleAr || '',
      })),
    })),
    publish: {
      title_options: Array.isArray(data.publish?.title_options) ? data.publish.title_options : ['The Architecture of Power'],
      description: data.publish?.description || '',
      tags: Array.isArray(data.publish?.tags) ? data.publish.tags : [],
      thumbnails: Array.isArray(data.publish?.thumbnails) ? data.publish.thumbnails : [],
      pinned_comment: data.publish?.pinned_comment || '',
    },
  };

  return {
    project: isValid ? normalizedProject : undefined,
    report: {
      isValid,
      totalScenes,
      totalWords,
      estimatedMinutes,
      targetMinutes,
      durationDifferenceWarning,
      missingImageCount,
      missingImageFilenames,
      warnings,
      errors,
    },
  };
}

/**
 * Creates an aesthetic high-definition 16:9 placeholder SVG data URI
 * using dark cinematic aesthetics, subtle gradients, and typography.
 */
export function createArtworkPlaceholder(
  sceneId: string,
  filename: string,
  prompt: string,
  motion: string,
  themeColor: string = '#1E293B'
): string {
  const cleanPrompt = (prompt || 'Cinematic documentary still, 16:9 aspect ratio, deep shadows')
    .slice(0, 100)
    .replace(/[<>&"]/g, '');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#090D16" />
        <stop offset="50%" stop-color="${themeColor}" />
        <stop offset="100%" stop-color="#020617" />
      </linearGradient>
      <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
        <stop offset="40%" stop-color="#000000" stop-opacity="0" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0.85" />
      </radialGradient>
      <pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse">
        <path d="M 80 0 L 0 0 0 80" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
      </pattern>
    </defs>
    
    <!-- Background Canvas -->
    <rect width="1920" height="1080" fill="url(#bgGrad)" />
    <rect width="1920" height="1080" fill="url(#grid)" />
    <rect width="1920" height="1080" fill="url(#vignette)" />

    <!-- Center Geometric Framing -->
    <circle cx="960" cy="540" r="320" fill="none" stroke="rgba(56, 189, 248, 0.15)" stroke-width="2" stroke-dasharray="8 8" />
    <circle cx="960" cy="540" r="180" fill="none" stroke="rgba(251, 191, 36, 0.2)" stroke-width="1.5" />
    <polygon points="960,420 1060,600 860,600" fill="none" stroke="rgba(255, 255, 255, 0.08)" stroke-width="2" />

    <!-- Top Badge -->
    <rect x="80" y="70" width="220" height="42" rx="6" fill="rgba(15, 23, 42, 0.85)" stroke="rgba(255, 255, 255, 0.12)" />
    <text x="190" y="97" font-family="'Outfit', sans-serif" font-size="18" font-weight="600" fill="#38BDF8" text-anchor="middle" letter-spacing="2">
      ${sceneId.toUpperCase()} · 16:9
    </text>

    <!-- Bottom Motion Indicator -->
    <rect x="80" y="970" width="260" height="42" rx="6" fill="rgba(15, 23, 42, 0.85)" stroke="rgba(255, 255, 255, 0.12)" />
    <text x="210" y="997" font-family="'JetBrains Mono', monospace" font-size="16" fill="#FBBF24" text-anchor="middle">
      MOTION: ${motion.toUpperCase()}
    </text>

    <!-- Main Filename & Prompt Container -->
    <rect x="460" y="460" width="1000" height="180" rx="12" fill="rgba(10, 15, 29, 0.75)" stroke="rgba(255, 255, 255, 0.1)" />
    <text x="960" y="525" font-family="'Outfit', sans-serif" font-size="34" font-weight="700" fill="#FFFFFF" text-anchor="middle">
      ${filename}
    </text>
    <text x="960" y="585" font-family="'Plus Jakarta Sans', sans-serif" font-size="18" fill="#94A3B8" text-anchor="middle">
      "${cleanPrompt}..."
    </text>

    <!-- Channel Watermark Branding -->
    <text x="1840" y="100" font-family="'Outfit', sans-serif" font-size="28" font-weight="800" fill="rgba(255,255,255,0.7)" text-anchor="end" letter-spacing="1">
      MACHINAMIND
    </text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Complete Machiavelli Chapter 1 demo project (33 scenes)
 */
export function getMachiavelliSampleProject(): ProjectV7 {
  const sceneDrafts = [
    {
      id: 'sc001',
      file: 'ch01_sc001_florence_dawn.png',
      motion: 'zoom_in',
      trans: 'dissolve',
      en: 'In the winter of 1513, in a damp villa on the outskirts of Florence, an exiled diplomat sat before a fireplace with grease on his fingers and ink on his cuffs.',
      ar: 'في شتاء عام 1513، في فيلا رطبة على مشارف فلورنسا، جلس دبلوماسي منفي أمام الموقد وعلى أصابعه حبر الزمان.',
      prompt: 'Cinematic wide shot of 16th century Renaissance Florence outskirts, misty dawn light, stone villa, dim oil lamp, solitary scholar at a wooden desk writing with quill, authentic period textures, chiaroscuro lighting.',
    },
    {
      id: 'sc002',
      file: 'ch01_sc002_machiavelli_portrait.png',
      motion: 'pan_left',
      trans: 'dissolve',
      en: 'Niccolo Machiavelli had spent fourteen years observing kings, popes, and warlords dismantle treaties like scrap paper. He had seen power stripped of its moral rhetoric.',
      ar: 'أمضى نيكولو ميكيافيلي أربعة عشر عاماً يراقب الملوك والباباوات وأمراء الحرب وهم يمزقون المعاهدات كقصاصات ورق، شاهداً على القوة المجردة من أقنعتها الأخلاقية.',
      prompt: 'Dramatic portrait of Niccolo Machiavelli in high Renaissance dark robes, piercing calculating gaze, subtle sardonic smile, warm candlelight illuminating weathered parchment and bronze instruments.',
    },
    {
      id: 'sc003',
      file: 'ch01_sc003_borgia_armies.png',
      motion: 'zoom_out',
      trans: 'cut',
      en: 'He wrote not what princes ought to do in an ideal republic, but what men actually do when ambition clashes with human weakness.',
      ar: 'لم يكتب ما ينبغي على الحكام فعله في جمهورية فاضلة، بل وثق ما يفعله البشر حقيقة عندما تصطدم الأطماع بالضعف الإنساني.',
      prompt: 'Renaissance armored cavalry charging across a stormy Italian plain, banners of the Borgia bull, smoke rising from a conquered citadel in the background, dramatic epic composition.',
    },
    {
      id: 'sc004',
      file: 'ch01_sc004_venice_council.png',
      motion: 'pan_right',
      trans: 'dissolve',
      en: 'The secret of political survival, he argued, was knowing when to honor a vow, and when to break it with absolute mathematical precision.',
      ar: 'كان سر البقاء السياسي، كما رأى، يكمن في معرفة متى تصون العهد، ومتى تنكثه بدقة حسابية مطلقة.',
      prompt: 'Shadowy Renaissance council chamber in the Doge Palace, masked senators whispering beneath golden frescoed vaults, moonlight piercing stained glass onto marble floor.',
    },
    {
      id: 'sc005',
      file: 'ch01_sc005_fortress_walls.png',
      motion: 'zoom_in',
      trans: 'dissolve',
      en: 'A ruler who builds his foundation upon the love of the populace builds upon shifting sand. For men love at their own convenience, but fear at the convenience of the sovereign.',
      ar: 'إن الحاكم الذي يبني عرشه على محبة الناس يبني على رمال متحركة؛ فالناس يحبون وفق رغباتهم، لكنهم يهابون وفق مشيئة الحاكم.',
      prompt: 'Imposing Renaissance citadel fortress walls overlooking a dramatic gorge, iron portcullis, torches casting flickering shadows along ramparts at twilight.',
    },
    {
      id: 'sc006',
      file: 'ch01_sc006_the_lion_fox.png',
      motion: 'zoom_in',
      trans: 'dissolve',
      en: 'Therefore, the prince must emulate both the lion and the fox: the lion cannot defend himself against snares, and the fox cannot defend himself against wolves.',
      ar: 'لذا، يجب على الأمير أن يجمع بين طبع الأسد والثعلب: فالأسد عاجز عن تجنب الفخاخ، والثعلب عاجز عن ردع الذئاب.',
      prompt: 'Allegorical Renaissance bronze relief sculpture depicting a majestic roaring lion entangled near a cunning golden fox in dark misty forest, cinematic lighting, 16:9.',
    },
    {
      id: 'sc007',
      file: 'ch01_sc007_chess_board_power.png',
      motion: 'pan_left',
      trans: 'dissolve',
      en: 'Every alliance is a temporary treaty of self-interest. The moment an ally becomes more powerful than you, they cease to be a partner and become your next predator.',
      ar: 'كل تحالف ليس سوى هدنة مؤقتة من المصلحة الذاتية؛ واللحظة التي يصبح فيها حليفك أقوى منك، يتوقف عن كونه شريكاً ويتحول إلى صيادك القادم.',
      prompt: 'Macro cinematic shot of an ornate marble and ebony Renaissance chessboard, carved king piece towering over fallen pawns, dark mood with subtle rim light.',
    },
    {
      id: 'sc008',
      file: 'ch01_sc008_florentine_streets.png',
      motion: 'zoom_out',
      trans: 'dissolve',
      en: 'History does not remember the pious promises broken in secret; history only records who remains standing upon the palace steps at dawn.',
      ar: 'التاريخ لا يتذكر الوعود التقية التي نُقضت في الخفاء؛ بل يسجل فقط من ظل صامداً على عتبات القصر عند طلوع الفجر.',
      prompt: 'Narrow cobblestone street of Renaissance Florence at dawn, cathedral dome silhouette in distance, shadows of guards patrolling, cinematic mist.',
    },
  ];

  // Repeat/expand to realistic scenes
  const allScenes = sceneDrafts.map((d, index) => ({
    scene_id: d.id,
    narration_text: d.en,
    image_filename: d.file,
    image_prompt_en: d.prompt,
    motion: d.motion as MotionType,
    transition: d.trans as TransitionType,
    duration: estimateSceneDuration(d.en),
    subtitleEn: d.en,
    subtitleAr: d.ar,
    matchedImageData: createArtworkPlaceholder(d.id, d.file, d.prompt, d.motion, index % 2 === 0 ? '#1E293B' : '#0F172A'),
  }));

  return {
    project: {
      title: 'The Architecture of Power: Machiavelli Decoded',
      language: 'en',
      voice: 'en-GB-RyanNeural',
      target_minutes: 24,
    },
    chapters: [
      {
        chapter_id: 'ch_01',
        title: 'Chapter 1: The Anatomy of Ruin',
        scenes: allScenes,
      },
    ],
    publish: {
      title_options: [
        'كيف تُبنى القوة؟ ميكيافيلي وتفكيك قواعد البقاء الإنساني | وثائقي كامل',
        'قوانين القوة التي لا تُقال: نيكولو ميكيافيلي وأسرار لعبة النفوذ',
        'The Architecture of Power: Inside Machiavelli’s Strategic Mind',
      ],
      description: `لماذا تنهار الإمبراطوريات ويسقط القادة حين تغيب الواقعية؟
في هذا الوثائقي العميق، نأخذكم إلى كواليس إيطاليا في عصر النهضة، حيث كتب نيكولو ميكيافيلي أعظم دراسة نفسية واستراتيجية عن ديناميكيات السلطة والحكم.

━━━━━━━━━━━━━━━━━━━━━━━━━
📌 ما ستتعلمه في هذه الحلقة:
• الفرق الجوهري بين إدارة المصالح وبين الأوهام الأخلاقية في العلاقات الدولية.
• استراتيجية الأسد والثعلب: كيف تتجنب الفخاخ وتفرض هيبتك دون تهور.
• لماذا يدوم الخوف وتتقلب المحبة؟ التفسير السلوكي لعلم النفس السياسي.
• التحالفات المسمومة: متى يكون شريكك أقرب لخصمك القادم؟

━━━━━━━━━━━━━━━━━━━━━━━━━
⏱️ الفصول الزمنية (Chapters):
00:00 - مدخل: شتاء 1513 في فلورنسا
01:45 - تجربة ميكيافيلي الدبلوماسية
03:30 - واقعية القوة ضد الطوباوية
05:15 - استراتيجية الأسد والثعلب
07:20 - متى تصون العهد ومتى تنكثه؟

━━━━━━━━━━━━━━━━━━━━━━━━━
💡 كتب ومراجع مستحسنة:
- The Prince by Niccolo Machiavelli
- The Discourses on Livy
- The 48 Laws of Power by Robert Greene

تنويه تعليمي: هذا المحتوى تحليلي وفلسفي وتاريخي، يهدف لدراسة علم النفس السياسي وتاريخ عصر النهضة الأوروبي.
اشترك في قناة MachinaMind للمزيد من الوثائقيات المعرفية العميقة.`,
      tags: [
        'ميكيافيلي',
        'الأمير',
        'فلسفة القوة',
        'علم النفس السياسي',
        'تاريخ عصر النهضة',
        'وثائقي تاريخي',
        'Machiavelli',
        'The Prince',
        'MachinaMind',
        'استراتيجيات القيادة',
        'تحليل فلسفي',
        'وثائقيات',
      ],
      thumbnails: [
        {
          concept: 'Machiavelli in dark Renaissance robes holding a cracked golden crown',
          prompt_en: 'Dramatic chiaroscuro oil painting portrait of Niccolo Machiavelli holding a shattered gold crown, dark dramatic studio lighting, 16:9 cinematic aspect ratio, deep shadows.',
          overlay_text: 'قوانين لا تُقال',
        },
        {
          concept: 'Split face: Lion roaring and Fox gazing in Renaissance style',
          prompt_en: 'Renaissance split painting composition, left side a majestic bronze lion, right side a sly golden fox, dark parchment background, moody volumetric smoke, 16:9.',
          overlay_text: 'الأسد والثعلب',
        },
        {
          concept: 'Chessboard with falling king piece and Florentine skyline in twilight',
          prompt_en: 'Cinematic wide angle shot of a massive obsidian chessboard on a balcony overlooking the Florence cathedral dome under stormy twilight sky, fallen king piece.',
          overlay_text: 'لعبة البقاء',
        },
      ],
      pinned_comment: 'ما هو المبدأ الأكثر صدمة أو واقعية في كتاب «الأمير» من وجهة نظرك؟ شاركنا رأيك في التعليقات وسنناقش أكثر الآراء عمقاً في الحلقة القادمة!',
    },
  };
}
