import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: '请提供有效的文本内容' },
        { status: 400 }
      );
    }

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: '服务配置错误，请联系管理员' },
        { status: 500 }
      );
    }

    const prompt = `你是一个专业的英语教师，专门帮助中文母语者提升英文表达能力。

用户输入的英文如下：
"""
${text}
"""

请按以下格式评估并提供反馈（必须返回有效的JSON）：

{
  "original": "用户的原文",
  "corrected": "更自然的北美口语版本（如果原文已经足够自然，可以和原文相同）",
  "score": 85,
  "feedback": [
    {
      "type": "grammar | vocabulary | naturalness",
      "severity": "error | improvement | suggestion",
      "issue": "具体问题说明",
      "suggestion": "改进建议",
      "american": "北美地道的表达方式（如果是naturalness类型必填）"
    }
  ]
}

评分标准（满分100）：
- 语法正确：基础分60分
- 词汇选择：最高加20分
- 自然度/北美习惯：最高加15分
- 整体流畅：最高加5分

要求：
1. 识别所有语法错误（时态、主谓一致、冠词等），severity为"error"
2. 指出用词不当的地方，severity为"error"或"improvement"
3. 强调"自然度"——即使语法正确，也要建议更符合北美口语习惯的表达方式，severity为"suggestion"
4. 每条naturalness类型的反馈都要提供american字段，说明北美地道说法
5. 如果原文完全正确且自然，feedback数组可以为空，score为100

举例：
原文：For the payment of March, I will call the office today or tomorrow to pay it.
反馈应该包含：
- naturalness类型：suggestion级别
- issue: "表达略显生硬"
- suggestion: "更简洁的说法"
- american: "I'll also call the office today or tomorrow to take care of the March payment."

只返回JSON，不要其他内容。`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://english-eval.vercel.app',
        'X-Title': 'English Eval',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API请求失败: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('AI返回内容为空');
    }

    // 解析JSON响应
    const result = JSON.parse(content);

    return NextResponse.json(result);
  } catch (error) {
    console.error('评估错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '评估失败，请重试' },
      { status: 500 }
    );
  }
}
