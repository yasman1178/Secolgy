import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { text, voice = 'en-GB-RyanNeural', rate = 1.0, pitch = 0 } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required for TTS synthesis' }, { status: 400 });
    }

    // Clean markdown and symbols from narration text
    const cleanText = text
      .replace(/[*_#`~]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Compute word boundary timestamps
    const words = cleanText.split(/\s+/).filter(Boolean);
    const wordsPerMinute = 140 * rate;
    const secondsPerWord = 60 / wordsPerMinute;

    let currentMs = 0;
    const wordTimings = words.map((word) => {
      const startMs = Math.round(currentMs);
      const durationMs = Math.round(secondsPerWord * 1000);
      currentMs += durationMs;
      return {
        word,
        startMs,
        endMs: Math.round(currentMs),
      };
    });

    const totalDurationSeconds = Math.round((currentMs / 1000) * 10) / 10;

    return NextResponse.json({
      text: cleanText,
      voice,
      rate,
      pitch,
      duration: totalDurationSeconds,
      wordTimings,
      // Client can use Web Speech API or HTML5 Audio for immediate zero-latency natural speech playback
      audioSynthesisReady: true,
    });
  } catch (error: any) {
    console.error('TTS endpoint error:', error);
    return NextResponse.json(
      { error: error.message || 'TTS synthesis failed' },
      { status: 500 }
    );
  }
}
