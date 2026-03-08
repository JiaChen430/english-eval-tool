import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = 'google/gemini-2.5-flash-lite';

function extractJSON(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) return fenced[1];
  const raw = text.match(/(\{[\s\S]*\})/);
  if (raw) return raw[1];
  return text.trim();
}

// Step 1: Translate Chinese to English (standard North American expression)
const TRANSLATE_PROMPT = (chinese: string) => `You are a professional English translator specializing in North American expressions. Translate the following Chinese text into natural, idiomatic English that a native North American would use in everyday conversation.

Chinese text:
"""
${chinese}
"""

Return ONLY a JSON object with this structure:
{
  "translation": "<your natural North American English translation>"
}

Make it sound natural, casual when appropriate, and culturally appropriate for North America. Return ONLY valid JSON.`;

// Step 2: Evaluate user's attempt against the reference translation
const EVALUATE_PROMPT = (chinese: string, reference: string, userAttempt: string) => `You are an expert English language evaluator. Compare the user's English expression with the reference translation and evaluate it.

Chinese original:
"""
${chinese}
"""

Reference translation (natural North American English):
"""
${reference}
"""

User's attempt:
"""
${userAttempt}
"""

Return ONLY a JSON object with this structure:
{
  "score": <integer 0-100>,
  "feedback": "<detailed feedback explaining what's good and what needs improvement>",
  "issues": [
    {
      "type": "<accuracy|naturalness|grammar|vocabulary>",
      "description": "<specific issue and how to fix it>"
    }
  ],
  "suggestion": "<your improved version of the user's attempt, keeping their style but fixing issues>"
}

Scoring guide:
- 90-100: Excellent, native-level, captures meaning and tone perfectly
- 75-89: Good, minor issues with naturalness or accuracy
- 60-74: Fair, meaning mostly correct but awkward or unnatural
- 40-59: Poor, several accuracy or clarity issues
- 0-39: Very poor, meaning unclear or incorrect

Be encouraging but honest. Focus on practical improvements. Return ONLY valid JSON.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, chinese, userAttempt, reference } = body;

    if (action === 'translate') {
      // Step 1: Translate Chinese to English
      if (!chinese || typeof chinese !== 'string' || chinese.trim().length === 0) {
        return NextResponse.json({ error: 'Chinese text is required.' }, { status: 400 });
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: 'user', content: TRANSLATE_PROMPT(chinese.trim()) }],
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.statusText}`);
      }

      const data = await response.json();
      const raw = data.choices[0]?.message?.content || '';
      const result = JSON.parse(extractJSON(raw));

      return NextResponse.json({ translation: result.translation });
    }

    if (action === 'evaluate') {
      // Step 2: Evaluate user's attempt
      if (!chinese || !reference || !userAttempt) {
        return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: 'user', content: EVALUATE_PROMPT(chinese, reference, userAttempt) }],
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.statusText}`);
      }

      const data = await response.json();
      const raw = data.choices[0]?.message?.content || '';
      const evaluation = JSON.parse(extractJSON(raw));

      return NextResponse.json(evaluation);
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (err) {
    console.error('Rebuild API error:', err);
    return NextResponse.json(
      { error: 'Failed to process request. Please try again.' },
      { status: 500 },
    );
  }
}
