export type Scenario = 'casual' | 'business' | 'meeting';

export type ErrorCategory = 'grammar' | 'vocabulary' | 'naturalness' | 'punctuation';

export const SCENARIO_LABELS: Record<Scenario, { label: string; description: string }> = {
  casual: { label: '口语闲聊', description: '日常聊天，更口语化' },
  business: { label: '商务邮件', description: '正式书面，表达专业' },
  meeting: { label: '会议表达', description: '清晰陈述，逻辑性强' },
};

export interface TextError {
  id: string;
  category: ErrorCategory;
  original: string;
  corrected: string;
  explanation: string;
}

export interface EvaluationResult {
  score: number;
  correctedText: string;
  errors: TextError[];
}

export interface EvaluateResponse {
  evaluation: EvaluationResult;
}
