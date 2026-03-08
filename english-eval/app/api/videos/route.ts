import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = 'google/gemini-2.5-flash-lite';

// Recommended YouTube channels for learning American English
const CHANNELS = [
  { name: 'Rachel\'s English', url: 'https://www.youtube.com/@rachelsenglish' },
  { name: 'Go Natural English', url: 'https://www.youtube.com/@gonaturalenglish' },
  { name: 'EnglishClass101', url: 'https://www.youtube.com/@EnglishClass101' },
  { name: 'Speak English With Vanessa', url: 'https://www.youtube.com/@SpeakEnglishWithVanessa' },
  { name: 'Interactive English', url: 'https://www.youtube.com/@InteractiveEnglish' },
];

interface VideoRecommendation {
  title: string;
  channel: string;
  url: string;
  reason: string;
  searchUrl?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { error, corrected, explanation } = await req.json();

    if (!error || !corrected) {
      return NextResponse.json({ error: 'Error details required.' }, { status: 400 });
    }

    // Always include a YouTube search URL for the corrected expression
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(corrected + ' American English')}`;

    const prompt = `Based on the following English learning error, recommend 3 specific YouTube video titles and channels that would help learn the correct usage.

Error: "${error}"
Corrected: "${corrected}"
Explanation: "${explanation}"

Return ONLY a JSON array (no markdown) with 3 recommendations:
[
  {
    "title": "Specific video title about this topic",
    "channel": "Channel name",
    "url": "https://www.youtube.com/watch?v=EXACT_VIDEO_ID",
    "reason": "Why this video helps"
  }
]

IMPORTANT: Only provide URLs with EXACT real YouTube video IDs that you are CONFIDENT exist and are available. 
- If unsure about a specific video ID, use the search URL instead: ${searchUrl}
- Prefer videos from these trusted channels: Rachel's English, Go Natural English, Speak English With Vanessa, Interactive English, EnglishClass101
- You can search on YouTube to find real video IDs

If you cannot find reliable specific videos, return an empty array and the searchUrl will be used instead.

Return ONLY valid JSON.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '[]';

    // Extract JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    let recommendations: VideoRecommendation[] = jsonMatch 
      ? JSON.parse(jsonMatch[0]) 
      : [];

    // Add search URL as fallback option
    const searchRecommendation: VideoRecommendation = {
      title: `Search: "${corrected}"`,
      channel: 'YouTube Search',
      url: searchUrl,
      reason: `Search for videos teaching: "${corrected}"`,
    };

    // If no valid recommendations, at least show search
    if (recommendations.length === 0) {
      recommendations = [searchRecommendation];
    } else {
      // Add search as last option
      recommendations.push(searchRecommendation);
    }

    return NextResponse.json({ recommendations });
  } catch (err) {
    console.error('Video recommendation error:', err);
    return NextResponse.json(
      { error: 'Failed to get recommendations.' },
      { status: 500 },
    );
  }
}
