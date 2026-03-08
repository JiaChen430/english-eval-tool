import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const MODEL = 'google/gemini-2.5-flash-lite';

interface VideoRecommendation {
  title: string;
  channel: string;
  url: string;
  reason: string;
}

// Validate a YouTube video ID using the API
async function validateVideoId(videoId: string): Promise<boolean> {
  if (!YOUTUBE_API_KEY) return false;
  
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet&key=${YOUTUBE_API_KEY}`
    );
    const data = await res.json();
    return data.items && data.items.length > 0;
  } catch {
    return false;
  }
}

// Extract video ID from various YouTube URL formats
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { error, corrected, explanation } = await req.json();

    if (!error || !corrected) {
      return NextResponse.json({ error: 'Error details required.' }, { status: 400 });
    }

    const prompt = `Based on the following English learning error, recommend 3 popular YouTube video IDs (NOT URLs) that would help learn the correct usage.

Error: "${error}"
Corrected: "${corrected}"
Explanation: "${explanation}"

Return ONLY a JSON array (no markdown):
[
  {
    "videoId": "EXACT_11_CHAR_VIDEO_ID",
    "reason": "Why this video helps"
  }
]

IMPORTANT:
- Return ONLY the 11-character video ID (e.g., "dQw4w9WgXcQ")
- DO NOT return full URLs, only the ID
- Choose popular, well-known English learning videos
- Videos should be from trusted channels: Rachel's English, Go Natural English, Speak English With Vanessa, EnglishClass101, VOA Learning English

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
    const aiRecommendations: Array<{ videoId: string; reason: string }> = jsonMatch 
      ? JSON.parse(jsonMatch[0]) 
      : [];

    // Validate and filter video IDs using YouTube API
    const validVideos: VideoRecommendation[] = [];
    
    for (const rec of aiRecommendations) {
      const videoId = rec.videoId?.trim();
      if (!videoId || videoId.length !== 11) continue;
      
      const isValid = await validateVideoId(videoId);
      if (isValid) {
        validVideos.push({
          title: '', // Will be filled by API
          channel: 'YouTube',
          url: `https://www.youtube.com/watch?v=${videoId}`,
          reason: rec.reason,
        });
      }
      
      // Limit to 3 valid videos
      if (validVideos.length >= 3) break;
    }

    // If we have valid videos, fetch their titles from YouTube API
    if (validVideos.length > 0 && YOUTUBE_API_KEY) {
      const videoIds = validVideos.map(v => extractVideoId(v.url)).filter(Boolean).join(',');
      try {
        const ytRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?id=${videoIds}&part=snippet&key=${YOUTUBE_API_KEY}`
        );
        const ytData = await ytRes.json();
        
        if (ytData.items) {
          for (const item of ytData.items) {
            const video = validVideos.find(v => v.url.includes(item.id));
            if (video) {
              video.title = item.snippet.title;
              video.channel = item.snippet.channelTitle;
            }
          }
        }
      } catch {
        // Use placeholder titles if API fails
        for (const video of validVideos) {
          if (!video.title) {
            video.title = 'English Learning Video';
          }
        }
      }
    }

    // Always add search options as reliable fallback
    const searchQueries = [
      corrected,
      corrected + ' American English',
      corrected + ' English lesson',
    ];

    const searchRecommendations: VideoRecommendation[] = searchQueries.map((query, idx) => ({
      title: `🔍 Search: "${query}"`,
      channel: idx === 0 ? 'YouTube' : 'YouTube',
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      reason: idx === 0 
        ? `Search for videos about: "${corrected}"` 
        : `Related search: "${query}"`,
    }));

    // Combine: validated videos first, then searches
    const recommendations = [...validVideos, ...searchRecommendations];

    return NextResponse.json({ recommendations });
  } catch (err) {
    console.error('Video recommendation error:', err);
    return NextResponse.json(
      { error: 'Failed to get recommendations.' },
      { status: 500 },
    );
  }
}
