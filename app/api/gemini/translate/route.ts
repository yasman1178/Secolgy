import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { items, targetLanguage = 'ar' } = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Missing or invalid items array' }, { status: 400 });
    }

    const systemPrompt = `You are an expert bilingual subtitle translator specializing in historical, political, and philosophical documentaries.
Your task is to translate documentary subtitles ${targetLanguage === 'ar' ? 'from English into high-quality Modern Standard Arabic (فصحى بليغة وطبيعية)' : 'into fluent English'}.
Rules:
1. Maintain the exact same ids.
2. Keep the phrasing concise and natural for video reading speed (under ~45 characters per line).
3. Do not invent details; preserve tone, psychological nuance, and philosophical weight.
4. Return ONLY a valid JSON object with the key "translations", which is an array of objects: { "id": string, "translated": string }.`;

    const prompt = `Items to translate:\n${JSON.stringify(items, null, 2)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `${systemPrompt}\n\n${prompt}`,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const responseText = response.text || '{}';
    const parsed = JSON.parse(responseText);

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('Gemini translate error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to translate subtitles with Gemini' },
      { status: 500 }
    );
  }
}
