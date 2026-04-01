import { NextRequest, NextResponse } from 'next/server';
import { EvaluationResult, ExerciseItem, TextError, Scenario } from '@/lib/types';

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

  'email-urgent': `## Scenario: Urgent Email (紧急邮件)
- 评估标准：简洁直接、有紧迫感、North American phrasing
- 鼓励使用：短句、直接的请求、明确的 deadline 或 action item
- 避免：冗长客套、模糊措辞、不必要的背景铺垫
- 示例："We need this resolved by EOD" ✓ "I was wondering if perhaps we could address this matter" ✗ (太啰嗦)

## 重点关注：
- 开头直接说明紧急事项
- 明确的行动要求和时间节点
- 简洁有力的 North American 表达
- 保持礼貌但不过度客气`,

  'email-formal': `## Scenario: Formal Email (正式邮件)
- 评估标准：专业、清晰、有礼貌、完整的句式结构
- 鼓励使用：完整词汇 (cannot instead of can't)、正式开场/结尾、清晰结构
- 避免：俚语、缩写、表情符号、过短的句子
- 示例："I am writing to inform you that..." ✓ "Just letting you know" ✗ (太随意)

## 重点关注：
- 正式词汇选择 (North American business English)
- 专业的开场和结尾 (Dear/Sincerely)
- 清晰的消息结构 (purpose → details → closing)
- 适当的礼貌用语`,

  'email-natural': `## Scenario: Natural/Everyday Email (日常邮件)
- 评估标准：自然简洁、友好但不随便、North American daily email style
- 鼓励使用：自然的缩写 (I'm, don't)、简洁直接的表达、适度的礼貌
- 避免：过度正式 ("I am writing as the tenant residing in...")、不必要的冗词、生硬的措辞
- 示例："I'm a tenant in Unit 2808" ✓ "I am writing as the tenant residing in Unit 2808" ✗ (太正式)
- 示例："Could you please send us a copy?" ✓ "Could you please provide us with one?" ✗ (太正式)

## 重点关注：
- 像 native speaker 写日常邮件一样自然
- 合并可以合并的短句，避免不必要的换行
- 用简洁直接的表达替代正式冗长的说法
- 保持友好、自然的语气`,

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

const isEmailScenario = (scenario: Scenario) => scenario.startsWith('email-');

const EVAL_PROMPT = (text: string, scenario: Scenario) => `You are an expert English language evaluator specializing in helping Chinese speakers improve their English to sound more NATURAL and like a native North American speaker. Evaluate the following English text and return ONLY a JSON object — no markdown, no commentary.

${SCENARIO_GUIDELINES[scenario]}

Text to evaluate:
"""
${text}
"""

IMPORTANT:
- Your PRIMARY focus should be on NATURALNESS - even if grammar is correct, suggest more natural expressions that Americans would actually use.
- ALL suggestions must use North American phrasing and conventions.
- Apply the scenario-specific guidelines above.
- For casual: accept and encourage colloquial expressions
- For email-urgent: prioritize brevity and directness
- For email-formal: ensure professional tone and complete sentences
- For email-natural: make it sound like a real North American person writing a normal email — not too formal, not too casual
- For meeting: ensure clarity and logical structure

Return this exact JSON structure:
{
  "score": <integer 0–100>,
  "correctedText": "<full corrected version - make it sound NATURAL and appropriate for the selected scenario>",${isEmailScenario(scenario) ? `
  "suggestedSubject": "<a concise, natural email subject line based on the content — use North American email conventions>",` : ''}
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

**Email - Urgent:**
- "I wanted to reach out regarding..." → "Quick question about..." or "Need your help with..."
- "At your earliest convenience" → "by EOD" or "ASAP"

**Email - Formal:**
- "Just letting you know" → "I am writing to inform you" (more professional)
- "gonna" → "going to" (formal)

**Email - Natural:**
- "I am writing as the tenant residing in Unit 2808" → "I'm a tenant in Unit 2808" (natural, not overly formal)
- "Could you please provide us with one?" → "Could you please send us a copy?" (simpler, more natural)
- "My family and I have not yet received the Vehicle Registration form." → combine into flowing sentence

**Meeting:**
- "pay it" → "take care of it" or "process the payment"
- "How about I call..." → "I'll call..." or "Let me call..." (more direct and clear)

RULE: Only include errors in the "errors" array if they ACTUALLY need to be changed for the scenario. If a phrase is already natural and appropriate for the selected scenario, DO NOT include it.
- Wrong: {"original": "I'll call you later", "explanation": "This is perfectly acceptable in casual"}
- Correct: Don't include it in the errors array at all
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
    const { text, scenario = 'casual' } = await req.json();

    // Validate scenario
    const validScenarios = ['casual', 'email-urgent', 'email-formal', 'email-natural', 'meeting'];
    if (!validScenarios.includes(scenario)) {
      return NextResponse.json({ error: `Invalid scenario. Use one of: ${validScenarios.join(', ')}` }, { status: 400 });
    }

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
        messages: [{ role: 'user', content: EVAL_PROMPT(text.trim(), scenario) }],
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
