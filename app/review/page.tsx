'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  NotebookEntry,
  ErrorCategory,
  FillInBlankExercise,
  MultipleChoiceExercise,
} from '@/lib/types';
import { getNickname } from '@/lib/user';

const CATEGORY_STYLES: Record<ErrorCategory, { label: string; bg: string; text: string }> = {
  grammar: { label: 'Grammar', bg: 'bg-blue-50', text: 'text-blue-700' },
  vocabulary: { label: 'Vocabulary', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  naturalness: { label: 'Naturalness', bg: 'bg-purple-50', text: 'text-purple-700' },
  punctuation: { label: 'Punctuation', bg: 'bg-orange-50', text: 'text-orange-700' },
};

function checkAnswer(entry: NotebookEntry, answer: string | number | undefined): boolean {
  if (answer === undefined || answer === '') return false;
  const ex = entry.exercise_data;
  if (ex.type === 'fill-in-blank') {
    return (ex as FillInBlankExercise).answer.trim().toLowerCase() ===
      String(answer).trim().toLowerCase();
  }
  if (ex.type === 'multiple-choice') {
    return (ex as MultipleChoiceExercise).correctIndex === Number(answer);
  }
  return false;
}

export default function ReviewPage() {
  const [entries, setEntries] = useState<NotebookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [updating, setUpdating] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    try {
      const nickname = getNickname();
      if (!nickname) {
        setEntries([]);
        setLoading(false);
        return;
      }

      const notebookKey = `ee_notebook_${nickname}`;
      const raw = localStorage.getItem(notebookKey);
      const notebook: NotebookEntry[] = raw ? JSON.parse(raw) : [];
      const unmastered = notebook.filter((e) => !e.mastered);
      setEntries(unmastered);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function setAnswer(id: string, value: string | number) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function handleSubmit() {
    const newResults: Record<string, boolean> = {};
    for (const entry of entries) {
      newResults[entry.id] = checkAnswer(entry, answers[entry.id]);
    }
    setResults(newResults);
    setSubmitted(true);

    const correct = Object.values(newResults).filter(Boolean).length;
    const total = entries.length;
    const score = total > 0 ? correct / total : 0;

    // Update localStorage: mark mastered for correct entries if overall >= 70%
    setUpdating(true);
    try {
      const nickname = getNickname();
      if (!nickname) throw new Error('No nickname');

      const notebookKey = `ee_notebook_${nickname}`;
      const raw = localStorage.getItem(notebookKey);
      const notebook: NotebookEntry[] = raw ? JSON.parse(raw) : [];

      const updated = notebook.map((entry) => {
        const isCorrect = newResults[entry.id];
        if (isCorrect === undefined) return entry;

        return {
          ...entry,
          attempt_count: (entry.attempt_count || 0) + 1,
          last_attempted_at: new Date().toISOString(),
          mastered: isCorrect && score >= 0.7 ? true : entry.mastered,
        };
      });

      localStorage.setItem(notebookKey, JSON.stringify(updated));
    } catch {
      // Non-blocking
    } finally {
      setUpdating(false);
    }
  }

  const correctCount = Object.values(results).filter(Boolean).length;
  const total = entries.length;
  const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const passed = score >= 70;

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-500" />
        <p className="mt-3 text-sm text-slate-400">Loading review session…</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🏆</div>
        <h2 className="text-xl font-semibold text-slate-700 mb-2">Nothing to review!</h2>
        <p className="text-slate-500 mb-6">
          You have no pending errors in your notebook. Keep up the great work!
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/" className="btn-primary">
            Evaluate New Text
          </Link>
          <Link href="/notebook" className="btn-secondary">
            View Notebook
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <Link href="/notebook" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">
          ← Back to Notebook
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Review Session</h1>
        <p className="text-slate-500 text-sm mt-1">
          {entries.length} pending error{entries.length !== 1 ? 's' : ''} — get 70% to mark them mastered
        </p>
      </div>

      {/* Results banner */}
      {submitted && (
        <div
          className={`rounded-xl border p-5 mb-6 ${
            passed
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">{passed ? '🎉' : '💪'}</span>
            <div>
              <p className="font-semibold text-lg">
                {passed
                  ? `Excellent! ${correctCount} error${correctCount !== 1 ? 's' : ''} marked as mastered.`
                  : 'Keep going — you can do it!'}
              </p>
              <p className="text-sm mt-0.5">
                Score: <strong>{correctCount}/{total}</strong> ({score}%)
                {!passed && ' — 70% needed to mark items as mastered.'}
              </p>
              {updating && <p className="text-sm mt-1 opacity-70">Saving progress…</p>}
            </div>
          </div>
          <div className="flex gap-3 mt-4 flex-wrap">
            <Link href="/notebook" className="btn-secondary text-sm">
              View Notebook
            </Link>
            {!passed && (
              <button
                onClick={() => {
                  setSubmitted(false);
                  setAnswers({});
                  setResults({});
                }}
                className="btn-primary text-sm"
              >
                Try Again
              </button>
            )}
            {passed && (
              <Link href="/" className="btn-primary text-sm">
                Evaluate New Text →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Exercise list */}
      <div className="space-y-6">
        {entries.map((entry, idx) => {
          const style = CATEGORY_STYLES[entry.error_category];
          const ex = entry.exercise_data;
          const isCorrect = results[entry.id];

          return (
            <div
              key={entry.id}
              className={`card p-6 ${
                submitted
                  ? isCorrect
                    ? 'ring-1 ring-green-300'
                    : 'ring-1 ring-red-300'
                  : ''
              }`}
            >
              {/* Header */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-slate-400 text-sm font-medium">#{idx + 1}</span>
                <span className={`badge ${style.bg} ${style.text}`}>{style.label}</span>
                {entry.attempt_count > 0 && (
                  <span className="text-xs text-slate-400">
                    Attempted {entry.attempt_count}×
                  </span>
                )}
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
              <div className="flex flex-wrap gap-3 mb-2 text-sm p-3 bg-slate-50 rounded-lg">
                <span className="font-mono text-red-600">{entry.error_original}</span>
                <span className="text-slate-300 self-center">→</span>
                <span className="font-mono text-green-600">{entry.error_corrected}</span>
              </div>
              <p className="text-xs text-slate-500 mb-4 italic">{entry.error_description}</p>

              {/* Exercise */}
              {ex.type === 'fill-in-blank' ? (
                <FillInBlankReview
                  exercise={ex as FillInBlankExercise}
                  answer={String(answers[entry.id] ?? '')}
                  onChange={(v) => setAnswer(entry.id, v)}
                  submitted={submitted}
                  isCorrect={!!isCorrect}
                />
              ) : (
                <MultipleChoiceReview
                  exercise={ex as MultipleChoiceExercise}
                  answer={answers[entry.id] !== undefined ? Number(answers[entry.id]) : undefined}
                  onChange={(v) => setAnswer(entry.id, v)}
                  submitted={submitted}
                  isCorrect={!!isCorrect}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Submit */}
      {!submitted && (
        <div className="mt-8 text-center">
          <button
            onClick={handleSubmit}
            disabled={Object.keys(answers).length === 0}
            className="btn-primary px-10 py-3 text-base"
          >
            Submit Review
          </button>
          <p className="text-xs text-slate-400 mt-2">Answer at least one exercise before submitting.</p>
        </div>
      )}
    </div>
  );
}

// ── Inline sub-components ────────────────────────────────────────────────────

function FillInBlankReview({
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
            ${
              submitted
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

function MultipleChoiceReview({
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
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Multiple choice</p>
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
                name={`review-mc-${exercise.question.slice(0, 20)}-${idx}`}
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
              {submitted && isCorrectOption && <span className="ml-auto text-green-600 font-bold">✓</span>}
              {submitted && isSelected && !isCorrectOption && <span className="ml-auto text-red-600 font-bold">✗</span>}
            </label>
          );
        })}
      </div>
    </div>
  );
}
