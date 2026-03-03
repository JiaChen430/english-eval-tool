import { NextRequest, NextResponse } from 'next/server';
import { Scenario } from '@/lib/types';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = 'google/gemini-2.5-flash-lite';

// Scenario-specific evaluation guidelines
const SCENARIO_GUIDELINES: Record<Scenario, string> = {
  casual: `## Scenario: Casual Conversation (口语闲聊)
- 评估标准：更口语化、更自然的表达
- 鼓励使用：缩写 (I'm, don't, can't)、日常短语、轻松语气
- 避免：过度正式的表达、复杂的从句
- 示例："Just letting you know" ✓ "Just a quick note to let you know" ✗ (太正式)

## 重点关注：
- 口语化表达 (gonna, wanna, kinda)
- 简洁直接的表达
- 自然的对话语气`,

  business: `## Scenario: Business Email (商务邮件)
- 评估标准：专业、清晰、有礼貌
- 鼓励使用：完整词汇 (cannot instead of can't)、正式开场/结尾、清晰结构
- 避免：俚语、表情符号、过短的句子
- 示例："Just a quick note to let you know" ✓ "Just letting you know" ✗ (太随意)

## 重点关注：
- 正式词汇选择
- 专业的开场和结尾
- 清晰的消息结构
- 适当的礼貌用语`,

  meeting: `## Scenario: Meeting Expression (会议表达)
- 评估标准：清晰、逻辑性强、专业
- 鼓励使用：完整句子、明确的观点、逻辑连接词
- 避免：模糊的表达、不完整的句子、太口语化
- 示例："I'd like to discuss the project timeline" ✓

## 重点关注：
- 清晰的结构化表达
- 明确的观点陈述
- 适当的过渡和连接
- 专业但不过于生硬`
};

function extractJSON(text: string): string {
  // Strip markdown code fences if present
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) return fenced[1];
  // Fall back to first JSON object/array found
  const raw = text.match(/(\{[\s\S]*\})/);
  if (raw) return raw[1];
  return text.trim();
}

const EVAL_PROMPT = (text: string, scenario: Scenario) => `You are an expert English language evaluator specializing in helping Chinese speakers improve their English to sound more NATURAL and like a native North American speaker. Evaluate the following English text and return ONLY a JSON object — no markdown, no commentary.

${SCENARIO_GUIDELINES[scenario]}

Text to evaluate:
"""
${text}
"""

IMPORTANT: 
- Your PRIMARY focus should be on NATURALNESS - even if grammar is correct, suggest more natural expressions that Americans would actually use.
- Apply the scenario-specific guidelines above.
- For casual: accept and encourage colloquial expressions
- For business: ensure professional tone and complete sentences
- For meeting: ensure clarity and logical structure

Return this exact JSON structure:
{
  "score": <integer 0–100>,
  "correctedText": "<full corrected version - make it sound NATURAL and appropriate for the selected scenario>",
  "errors": [
    {
      "id": "err1",
      "category": "<grammar|vocabulary|naturalness|punctuation>",
      "original": "<exact problematic word or phrase from the input>",
      "corrected": "<corrected replacement - use appropriate expression for the scenario>",
      "explanation": "<explain why original is unnatural or inappropriate, suggest better way of saying it>"
    }
  ]
}

Scoring guide (based on scenario):
- 90–100: Excellent for the scenario (natural and appropriate)
- 70–89: Good but could be more natural/appropriate
- 50–69: Correct but not suitable for the scenario
- Below 50: Hard to understand or inappropriate

Scenario-specific examples:
**Casual:**
- "For the payment of March" → "the March payment" or "take care of the March payment"
- "I am going to" → "I'm gonna" (natural in casual)

**Business:**
- "Just letting you know" → "Just a quick note to let you know" (more professional)
- "gonna" → "going to" (more formal)

**Meeting:**
- "pay it" → "take care of it" or "process the payment"
- "How about I call..." → "I'll call..." or "Let me call..." (more direct and clear)

RULE: Only include errors in the "errors" array if they ACTUALLY need to be changed for the scenario. If a phrase is already natural and appropriate for the selected scenario, DO NOT include it.
- Wrong: {"original": "I'll call you later", "explanation": "This is perfectly acceptable in casual"}
- Correct: Don't include it in the errors array at all
Return ONLY valid JSON.`;

export async function POST(req: NextRequest) {
  try {
    const { text, scenario = 'casual' } = await req.json();

    // Validate scenario
    if (!['casual', 'business', 'meeting'].includes(scenario)) {
      return NextResponse.json({ error: 'Invalid scenario. Use casual, business, or meeting.' }, { status: 400 });
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text is required.' }, { status: 400 });
    }

    if (text.length > 5000) {
      return NextResponse.json({ error: 'Text must be under 5000 characters.' }, { status: 400 });
    }

    // Evaluate the text
    const evalResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://english-eval.vercel.app',
        'X-Title': 'English Eval',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: EVAL_PROMPT(text.trim(), scenario) }],
        max_tokens: 2048,
        temperature: 0.3,
      }),
    });

    if (!evalResponse.ok) {
      throw new Error(`OpenRouter API error: ${evalResponse.statusText}`);
    }

    const evalData = await evalResponse.json();
    const evalRaw = evalData.choices[0]?.message?.content || '';
    const evaluation = JSON.parse(extractJSON(evalRaw));

    // Ensure score is clamped
    evaluation.score = Math.max(0, Math.min(100, Math.round(evaluation.score)));

    return NextResponse.json({ evaluation });
  } catch (err) {
    console.error('Evaluate error:', err);
    return NextResponse.json(
      { error: 'Failed to evaluate text. Please try again.' },
      { status: 500 },
    );
  }
}
