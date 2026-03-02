export type ErrorCategory = 'grammar' | 'vocabulary' | 'naturalness' | 'punctuation';

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
