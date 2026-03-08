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
}

export async function POST(req: NextRequest) {
  try {
    const { error, corrected, explanation } = await req.json();

    if (!error || !corrected) {
      return NextResponse.json({ error: 'Error details required.' }, { status: 400 });
    }

    const prompt = `Based on the following English learning error, recommend 2-3 specific YouTube videos that would help learn the correct usage.

Error: "${error}"
Corrected: "${corrected}"
Explanation: "${explanation}"

Search for videos teaching:
- The correct expression: "${corrected}"
- Related natural American English phrases
- Common mistakes Chinese speakers make with this topic

Return ONLY a JSON array (no markdown) with up to 3 recommendations:
[
  {
    "title": "Exact video title",
    "channel": "Channel name",
    "url": "https://youtube.com/watch?v=...",
    "reason": "Why this video helps"
  }
]

Choose from these trusted channels:
${CHANNELS.map(c => `- ${c.name}: ${c.url}`).join('\n')}

If you can't find specific videos, suggest general topics like "American English expressions for [topic]" and provide search URLs like:
- https://www.youtube.com/results?search_query=learn+American+English+${encodeURIComponent(corrected)}
- https://www.youtube.com/shorts/${encodeURIComponent(corrected.slice(0, 30))}

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
    const recommendations: VideoRecommendation[] = jsonMatch 
      ? JSON.parse(jsonMatch[0]) 
      : [];

    return NextResponse.json({ recommendations });
  } catch (err) {
    console.error('Video recommendation error:', err);
    return NextResponse.json(
      { error: 'Failed to get recommendations.' },
      { status: 500 },
    );
  }
}
