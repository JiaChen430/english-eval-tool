import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = 'google/gemini-2.5-flash-lite';

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

    // Ask AI for good search queries
    const prompt = `Based on this English learning error, suggest 4 different YouTube search queries that would help learn the correct expression.

Error: "${error}"
Corrected: "${corrected}"
Explanation: "${explanation}"

Return ONLY a JSON array (no markdown):
[
  {
    "query": "search query here",
    "reason": "why this helps"
  }
]

Make queries specific and useful for learning. Examples:
- "how to say ${corrected} in American English"
- "${corrected} business English"
- "American English natural expressions ${error}"
- "common English mistakes ${explanation.split(' ').slice(0,3).join(' ')}"

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
        max_tokens: 512,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '[]';

    // Extract JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const searchQueries: Array<{ query: string; reason: string }> = jsonMatch 
      ? JSON.parse(jsonMatch[0]) 
      : [];

    // Convert to YouTube search URLs
    const recommendations: VideoRecommendation[] = searchQueries.map((sq, idx) => ({
      title: `🔍 ${sq.query}`,
      channel: 'YouTube Search',
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(sq.query)}`,
      reason: sq.reason,
    }));

    // Ensure at least one search option
    if (recommendations.length === 0) {
      recommendations.push({
        title: `🔍 Search: "${corrected}"`,
        channel: 'YouTube Search',
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(corrected)}`,
        reason: `Search for videos about: "${corrected}"`,
      });
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
