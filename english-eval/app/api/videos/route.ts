import { NextRequest, NextResponse } from 'next/server';

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

    // Generate multiple search queries for better results
    const queries = [
      corrected,
      corrected + ' American English',
      corrected + ' English lesson',
      explanation.split(' ').slice(0, 5).join(' '), // First few words of explanation
    ];

    const recommendations: VideoRecommendation[] = queries.map((query, idx) => ({
      title: `🔍 Search: "${query}"`,
      channel: idx === 0 ? 'YouTube' : 'YouTube',
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      reason: idx === 0 
        ? `Search for videos about: "${corrected}"`
        : `Related search: "${query}"`,
    }));

    return NextResponse.json({ recommendations });
  } catch (err) {
    console.error('Video recommendation error:', err);
    return NextResponse.json(
      { error: 'Failed to get recommendations.' },
      { status: 500 },
    );
  }
}
