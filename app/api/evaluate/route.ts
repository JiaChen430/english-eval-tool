import { NextRequest, NextResponse } from 'next/server';
import { EvaluationResult, ExerciseItem, TextError } from '@/lib/types';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = 'google/gemini-2.5-flash-lite';

function extractJSON(text: string): string {
  // Strip markdown code fences if present
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) return fenced[1];
  // Fall back to first JSON object/array found
  const raw = text.match(/(\{[\s\S]*\})/);
  if (raw) return raw[1];
  return text.trim();
}

const EVAL_PROMPT = (text: string) => `You are an expert English language evaluator. Evaluate the following English text and return ONLY a JSON object — no markdown, no commentary.

Text to evaluate:
"""
${text}
"""

Return this exact JSON structure:
{
  "score": <integer 0–100>,
  "correctedText": "<full corrected version of the text>",
  "errors": [
    {
      "id": "err1",
      "category": "<grammar|vocabulary|naturalness|punctuation>",
      "original": "<exact problematic word or phrase from the input>",
      "corrected": "<corrected replacement>",
      "explanation": "<clear, friendly explanation of the error in one or two sentences>"
    }
  ]
}

Scoring guide:
- 90–100: Near-perfect, native-level
- 70–89: Good, minor issues
- 50–69: Fair, several noticeable issues
- 30–49: Poor, many errors
- 0–29: Very poor, hard to understand

If the text has no errors, return an empty "errors" array and a score of 95–100.
Return ONLY valid JSON.`;

const EXERCISE_PROMPT = (errors: TextError[]) => `You are an English language teaching assistant. For each error below, create ONE practice exercise. Alternate between "fill-in-blank" and "multiple-choice" types.

Errors (JSON):
${JSON.stringify(errors, null, 2)}

Return ONLY a JSON array — no markdown, no extra text:
[
  {
    "errorId": "<matches error id>",
    "exercise": {
      "type": "fill-in-blank",
      "sentence": "<full sentence using ___ where the correct answer belongs>",
      "answer": "<the word or phrase that fills the blank>"
    }
  },
  {
    "errorId": "<matches error id>",
    "exercise": {
      "type": "multiple-choice",
      "question": "<question about the correct usage>",
      "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
      "correctIndex": <0–3>
    }
  }
]

Rules:
- Make each exercise directly target the specific error.
- For fill-in-blank, the sentence should provide good context clues.
- For multiple-choice, all four options should be plausible.
- Alternate types across exercises.
Return ONLY valid JSON.`;

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text is required.' }, { status: 400 });
    }

    if (text.length > 5000) {
      return NextResponse.json({ error: 'Text must be under 5000 characters.' }, { status: 400 });
    }

    // Step 1: Evaluate the text
    const evalResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: EVAL_PROMPT(text.trim()) }],
        max_tokens: 2048,
      }),
    });

    if (!evalResponse.ok) {
      throw new Error(`OpenRouter API error: ${evalResponse.statusText}`);
    }

    const evalData = await evalResponse.json();
    const evalRaw = evalData.choices[0]?.message?.content || '';
    const evaluation: EvaluationResult = JSON.parse(extractJSON(evalRaw));

    // Ensure score is clamped
    evaluation.score = Math.max(0, Math.min(100, Math.round(evaluation.score)));

    let exercises: ExerciseItem[] = [];

    // Step 2: Generate exercises if there are errors
    if (evaluation.errors && evaluation.errors.length > 0) {
      const exResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: 'user', content: EXERCISE_PROMPT(evaluation.errors) }],
          max_tokens: 2048,
        }),
      });

      if (!exResponse.ok) {
        throw new Error(`OpenRouter API error: ${exResponse.statusText}`);
      }

      const exData = await exResponse.json();
      const exRaw = exData.choices[0]?.message?.content || '[]';
      const rawExercises: Array<{ errorId: string; exercise: ExerciseItem['exercise'] }> =
        JSON.parse(extractJSON(exRaw).replace(/^\[/, '['));

      // Map each exercise to its corresponding error
      exercises = rawExercises
        .map((item) => {
          const error = evaluation.errors.find((e) => e.id === item.errorId);
          if (!error) return null;
          return { errorId: item.errorId, error, exercise: item.exercise };
        })
        .filter(Boolean) as ExerciseItem[];
    }

    return NextResponse.json({ evaluation, exercises });
  } catch (err) {
    console.error('Evaluate error:', err);
    return NextResponse.json(
      { error: 'Failed to evaluate text. Please try again.' },
      { status: 500 },
    );
  }
}
