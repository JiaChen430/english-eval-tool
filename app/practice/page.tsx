'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ExerciseItem, ErrorCategory, FillInBlankExercise, MultipleChoiceExercise } from '@/lib/types';
import { getNickname } from '@/lib/user';

const CATEGORY_STYLES: Record<ErrorCategory, { label: string; bg: string; text: string }> = {
  grammar: { label: 'Grammar', bg: 'bg-blue-50', text: 'text-blue-700' },
  vocabulary: { label: 'Vocabulary', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  naturalness: { label: 'Naturalness', bg: 'bg-purple-50', text: 'text-purple-700' },
  punctuation: { label: 'Punctuation', bg: 'bg-orange-50', text: 'text-orange-700' },
};

function checkAnswer(item: ExerciseItem, answer: string | number | undefined): boolean {
  if (answer === undefined || answer === '') return false;
  const { exercise } = item;
  if (exercise.type === 'fill-in-blank') {
    return (exercise as FillInBlankExercise).answer.trim().toLowerCase() ===
      String(answer).trim().toLowerCase();
  }
  if (exercise.type === 'multiple-choice') {
    return (exercise as MultipleChoiceExercise).correctIndex === Number(answer);
  }
  return false;
}

function FillInBlank({
  exercise,
  answer,
  onChange,
  submitted,
  isCorrect,
}: {
  exercise: FillInBlankExercise;
  answer: string;
  onChange: (v: string) => void;
  submitted: boolean;
  isCorrect: boolean;
}) {
  const parts = exercise.sentence.split('___');
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Fill in the blank</p>
      <div className="flex flex-wrap items-center gap-1 text-slate-800 text-sm leading-loose">
        <span>{parts[0]}</span>
        <input
          type="text"
          value={answer}
          onChange={(e) => onChange(e.target.value)}
          disabled={submitted}
          placeholder="your answer"
          className={`border rounded-md px-2 py-1 min-w-[120px] max-w-xs text-sm focus:outline-none focus:ring-2
            ${submitted
              ? isCorrect
                ? 'border-green-400 bg-green-50 text-green-800'
                : 'border-red-400 bg-red-50 text-red-800'
              : 'border-slate-300 focus:ring-indigo-400'
            }`}
        />
        {parts[1] && <span>{parts[1]}</span>}
      </div>
      {submitted && !isCorrect && (
        <p className="text-green-700 text-sm mt-2">
          Correct answer: <strong className="font-mono">{exercise.answer}</strong>
        </p>
      )}
    </div>
  );
}

function MultipleChoice({
  exercise,
  answer,
  onChange,
  submitted,
  isCorrect,
}: {
  exercise: MultipleChoiceExercise;
  answer: number | undefined;
  onChange: (v: number) => void;
  submitted: boolean;
  isCorrect: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
        Multiple choice
      </p>
      <p className="text-slate-800 text-sm font-medium mb-3">{exercise.question}</p>
      <div className="space-y-2">
        {exercise.options.map((option, idx) => {
          const isSelected = answer === idx;
          const isCorrectOption = idx === exercise.correctIndex;

          let cls =
            'flex items-center gap-3 p-3 rounded-lg border cursor-pointer text-sm transition-colors select-none';
          if (submitted) {
            if (isCorrectOption) cls += ' border-green-400 bg-green-50 text-green-800';
            else if (isSelected) cls += ' border-red-400 bg-red-50 text-red-800';
            else cls += ' border-slate-200 text-slate-500 opacity-60';
          } else {
            cls += isSelected
              ? ' border-indigo-400 bg-indigo-50 text-indigo-800'
              : ' border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700';
          }

          const dotCls = submitted
            ? isCorrectOption
              ? 'bg-green-500 border-green-500 text-white'
              : isSelected
                ? 'bg-red-500 border-red-500 text-white'
                : 'border-slate-300 text-slate-400'
            : isSelected
              ? 'bg-indigo-500 border-indigo-500 text-white'
              : 'border-slate-300 text-slate-400';

          return (
            <label key={idx} className={cls}>
              <input
                type="radio"
                name={`mc-${exercise.question.slice(0, 20)}`}
                value={idx}
                checked={isSelected}
                onChange={() => !submitted && onChange(idx)}
                disabled={submitted}
                className="sr-only"
              />
              <span
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 ${dotCls}`}
              >
                {String.fromCharCode(65 + idx)}
              </span>
              <span>{option}</span>
              {submitted && isCorrectOption && (
                <span className="ml-auto text-green-600 font-bold">✓</span>
              )}
              {submitted && isSelected && !isCorrectOption && (
                <span className="ml-auto text-red-600 font-bold">✗</span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default function PracticePage() {
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [originalText, setOriginalText] = useState('');
  const [correctedText, setCorrectedText] = useState('');
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notLoaded, setNotLoaded] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem('ee_exercises');
    const evalRaw = localStorage.getItem('ee_evaluation');
    const origText = localStorage.getItem('ee_original_text') || '';

    if (!raw || !evalRaw) {
      setNotLoaded(true);
      return;
    }

    const ex: ExerciseItem[] = JSON.parse(raw);
    const ev = JSON.parse(evalRaw);

    if (!ex.length) {
      setNotLoaded(true);
      return;
    }

    setExercises(ex);
    setOriginalText(origText);
    setCorrectedText(ev.correctedText || '');
  }, []);

  function setAnswer(errorId: string, value: string | number) {
    setAnswers((prev) => ({ ...prev, [errorId]: value }));
  }

  function handleSubmit() {
    const newResults: Record<string, boolean> = {};
    for (const item of exercises) {
      newResults[item.errorId] = checkAnswer(item, answers[item.errorId]);
    }
    setResults(newResults);
    setSubmitted(true);

    // Save failed exercises to notebook (localStorage, per nickname)
    const failed = exercises.filter((item) => !newResults[item.errorId]);
    if (failed.length > 0) {
      setSaving(true);
      try {
        const nickname = getNickname();
        if (!nickname) throw new Error('No nickname found');

        const notebookKey = `ee_notebook_${nickname}`;
        const existing = localStorage.getItem(notebookKey);
        const notebook = existing ? JSON.parse(existing) : [];

        // Add new failed exercises
        const newEntries = failed.map((item) => ({
          id: `${Date.now()}_${Math.random()}`,
          originalText,
          correctedText,
          error: item.error,
          exercise: item.exercise,
          createdAt: new Date().toISOString(),
          mastered: false,
        }));

        notebook.push(...newEntries);
        localStorage.setItem(notebookKey, JSON.stringify(notebook));
        setSaved(true);
      } catch {
        // Non-blocking — still show results
      } finally {
        setSaving(false);
      }
    }
  }

  if (notLoaded) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">📋</div>
        <h2 className="text-xl font-semibold text-slate-700 mb-2">No exercises loaded</h2>
        <p className="text-slate-500 mb-6">
          Evaluate some text first to generate practice exercises.
        </p>
        <Link href="/" className="btn-primary">
          Go to Evaluate
        </Link>
      </div>
    );
  }

  const correctCount = Object.values(results).filter(Boolean).length;
  const total = exercises.length;
  const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const passed = score >= 70;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <Link href="/" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">
          ← Back to Evaluate
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Practice Exercises</h1>
        <p className="text-slate-500 text-sm mt-1">
          {exercises.length} exercise{exercises.length !== 1 ? 's' : ''} — 70% required to pass
        </p>
      </div>

      {/* Results banner */}
      {submitted && (
        <div
          className={`rounded-xl border p-5 mb-6 ${
            passed
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">{passed ? '🎉' : '📖'}</span>
            <div>
              <p className="font-semibold text-lg">
                {passed ? 'Great job! You passed!' : 'Not quite — keep practicing!'}
              </p>
              <p className="text-sm mt-0.5">
                Score: <strong>{correctCount}/{total}</strong> correct ({score}%)
                {!passed && ' — Minimum 70% required to pass.'}
              </p>
              {!passed && saved && (
                <p className="text-sm mt-1">
                  {exercises.filter((e) => !results[e.errorId]).length} failed exercise
                  {exercises.filter((e) => !results[e.errorId]).length !== 1 ? 's' : ''} saved to
                  your{' '}
                  <Link href="/notebook" className="underline font-medium">
                    Notebook
                  </Link>
                  .
                </p>
              )}
              {saving && <p className="text-sm mt-1 opacity-70">Saving to notebook…</p>}
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Link href="/" className="btn-secondary text-sm">
              Evaluate New Text
            </Link>
            {!passed && (
              <Link href="/notebook" className="btn-primary text-sm">
                View Notebook →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Exercise list */}
      <div className="space-y-6">
        {exercises.map((item, idx) => {
          const style = CATEGORY_STYLES[item.error.category];
          const isCorrect = results[item.errorId];

          return (
            <div
              key={item.errorId}
              className={`card p-6 ${
                submitted
                  ? isCorrect
                    ? 'ring-1 ring-green-300'
                    : 'ring-1 ring-red-300'
                  : ''
              }`}
            >
              {/* Exercise header */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-slate-400 text-sm font-medium">#{idx + 1}</span>
                <span className={`badge ${style.bg} ${style.text}`}>{style.label}</span>
                {submitted && (
                  <span
                    className={`ml-auto text-sm font-semibold ${
                      isCorrect ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                  </span>
                )}
              </div>

              {/* Error context */}
              <div className="flex flex-wrap gap-4 text-sm mb-4 p-3 bg-slate-50 rounded-lg">
                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wide">Original</span>
                  <p className="font-mono text-red-600 mt-0.5">{item.error.original}</p>
                </div>
                <div className="text-slate-300 self-center">→</div>
                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wide">Corrected</span>
                  <p className="font-mono text-green-600 mt-0.5">{item.error.corrected}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-4 italic">{item.error.explanation}</p>

              {/* Exercise */}
              {item.exercise.type === 'fill-in-blank' ? (
                <FillInBlank
                  exercise={item.exercise as FillInBlankExercise}
                  answer={String(answers[item.errorId] ?? '')}
                  onChange={(v) => setAnswer(item.errorId, v)}
                  submitted={submitted}
                  isCorrect={!!isCorrect}
                />
              ) : (
                <MultipleChoice
                  exercise={item.exercise as MultipleChoiceExercise}
                  answer={answers[item.errorId] !== undefined ? Number(answers[item.errorId]) : undefined}
                  onChange={(v) => setAnswer(item.errorId, v)}
                  submitted={submitted}
                  isCorrect={!!isCorrect}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Submit button */}
      {!submitted && (
        <div className="mt-8 text-center">
          <button
            onClick={handleSubmit}
            disabled={Object.keys(answers).length === 0}
            className="btn-primary px-10 py-3 text-base"
          >
            Submit Answers
          </button>
          <p className="text-xs text-slate-400 mt-2">Answer at least one exercise before submitting.</p>
        </div>
      )}
    </div>
  );
}
