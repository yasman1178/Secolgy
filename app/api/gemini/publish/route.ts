import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { sanitizeText, sanitizeTags } from '@/lib/sanitizer';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { action, publishData, targetLanguage = 'en' } = await req.json();

    if (!publishData) {
      return NextResponse.json({ error: 'Missing publishData' }, { status: 400 });
    }

    if (action === 'translate') {
      const prompt = `Translate and adapt the following YouTube publishing package ${
        targetLanguage === 'en' ? 'from Arabic to compelling, professional English' : 'from English to compelling, professional Arabic'
      } for the channel MachinaMind.
Keep chapter timestamps intact.
Keep all divider lines clean (━━━━━━━━━━━━━━━━━━━━━━━━━).
Remove any invisible zero-width characters.

Data to translate:
${JSON.stringify(publishData, null, 2)}

Return a JSON object with:
{
  "title_options": string[],
  "description": string,
  "tags": string[],
  "pinned_comment": string
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      if (parsed.description) {
        parsed.description = sanitizeText(parsed.description);
      }
      if (Array.isArray(parsed.tags)) {
        parsed.tags = sanitizeTags(parsed.tags);
      }
      return NextResponse.json(parsed);
    }

    // Default action: Optimize & improve
    const prompt = `You are a high-performing YouTube strategist for the documentary channel "MachinaMind".
Analyze and enhance this publishing package to maximize click-through rate, search ranking, and viewer retention.
Format requirements:
1. 3 irresistible, click-worthy titles (not clickbait, authoritative).
2. Clean description starting with a 2-line hook, what you will learn bullets, chapter list, and clean divider lines.
3. 15-20 relevant tags.
4. Engaging pinned question comment.

Original package:
${JSON.stringify(publishData, null, 2)}

Return a JSON object matching:
{
  "title_options": string[],
  "description": string,
  "tags": string[],
  "pinned_comment": string
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.4,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    if (parsed.description) {
      parsed.description = sanitizeText(parsed.description);
    }
    if (Array.isArray(parsed.tags)) {
      parsed.tags = sanitizeTags(parsed.tags);
    }

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('Gemini publish route error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process publishing data' },
      { status: 500 }
    );
  }
}
