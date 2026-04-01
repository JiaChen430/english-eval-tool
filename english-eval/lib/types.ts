export type Scenario = 'casual' | 'email-urgent' | 'email-formal' | 'email-natural' | 'meeting';

export type ErrorCategory = 'grammar' | 'vocabulary' | 'naturalness' | 'punctuation';

export const SCENARIO_LABELS: Record<Scenario, { label: string; description: string; group?: string }> = {
  casual: { label: '口语闲聊', description: '日常聊天，更口语化' },
  'email-urgent': { label: 'Urgent', description: '紧急邮件，简洁直接，有紧迫感', group: 'email' },
  'email-formal': { label: 'Formal', description: '正式邮件，专业措辞，完整句式', group: 'email' },
  'email-natural': { label: 'Natural', description: '日常邮件，自然简洁，不过度正式', group: 'email' },
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
  suggestedSubject?: string;
}

export type ExerciseType = 'fill-in-blank' | 'multiple-choice';

export interface FillInBlankExercise {
  type: 'fill-in-blank';
  /** The sentence with ___ where the answer goes */
  sentence: string;
  answer: string;
}

export interface MultipleChoiceExercise {
  type: 'multiple-choice';
  question: string;
  options: string[];
  correctIndex: number;
}

export type Exercise = FillInBlankExercise | MultipleChoiceExercise;

export interface ExerciseItem {
  errorId: string;
  error: TextError;
  exercise: Exercise;
}

export interface EvaluateResponse {
  evaluation: EvaluationResult;
  exercises: ExerciseItem[];
}

export interface NotebookEntry {
  id: string;
  created_at: string;
  updated_at?: string;
  original_text: string;
  corrected_text: string;
  error_category: ErrorCategory;
  error_description: string;
  error_original: string;
  error_corrected: string;
  exercise_type: ExerciseType;
  exercise_data: Exercise;
  attempt_count?: number;
  last_attempted_at?: string | null;
  mastered: boolean;
}
