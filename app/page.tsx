'use client';

import { useState } from 'react';
import Link from 'next/link';
import { EvaluationResult, ExerciseItem, ErrorCategory } from '@/lib/types';

const CATEGORY_STYLES: Record<ErrorCategory, { label: string; bg: string; text: string; border: string }> = {
  grammar: { label: 'Grammar', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  vocabulary: { label: 'Vocabulary', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  naturalness: { label: 'Naturalness', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  punctuation: { label: 'Punctuation', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
};

function scoreColor(score: number) {
  if (score >= 90) return 'text-green-600';
  if (score >= 70) return 'text-blue-600';
  if (score >= 50) return 'text-yellow-600';
  return 'text-red-600';
}

function scoreBarColor(score: number) {
  if (score >= 90) return 'bg-green-500';
  if (score >= 70) return 'bg-blue-500';
  if (score >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

function scoreLabel(score: number) {
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  if (score >= 30) return 'Needs Work';
  return 'Needs Much Work';
}

export default function HomePage() {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [error, setError] = useState('');

  async function handleEvaluate() {
    if (!inputText.trim()) return;
    setIsLoading(true);
    setError('');
    setEvaluation(null);
    setExercises([]);

    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Evaluation failed.');
      }

      const data = await res.json();
      setEvaluation(data.evaluation);
      setExercises(data.exercises || []);

      // Persist to localStorage for the practice page
      localStorage.setItem('ee_evaluation', JSON.stringify(data.evaluation));
      localStorage.setItem('ee_exercises', JSON.stringify(data.exercises || []));
      localStorage.setItem('ee_original_text', inputText);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  }

  // Group errors by category
  const errorsByCategory = evaluation?.errors.reduce(
    (acc, err) => {
      if (!acc[err.category]) acc[err.category] = [];
      acc[err.category].push(err);
      return acc;
    },
    {} as Record<ErrorCategory, typeof evaluation.errors>,
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      {/* Hero */}
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
          Evaluate Your English
        </h1>
        <p className="text-slate-500 text-lg">
          Paste or type your text below and get an instant AI-powered evaluation with a score,
          corrections, and targeted practice exercises.
        </p>
      </div>

      {/* Input */}
      <div className="card p-6 mb-6">
        <label htmlFor="input-text" className="block text-sm font-medium text-slate-700 mb-2">
          Your text
        </label>
        <textarea
          id="input-text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type or paste the English text you want to evaluate…"
          rows={6}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900
            placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400
            focus:border-transparent resize-y text-sm leading-relaxed"
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-slate-400">{inputText.length} / 5000 characters</span>
          <button
            onClick={handleEvaluate}
            disabled={isLoading || !inputText.trim() || inputText.length > 5000}
            className="btn-primary"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Evaluating…
              </>
            ) : (
              'Evaluate'
            )}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm mb-6">
          {error}
        </div>
      )}

      {/* Results */}
      {evaluation && (
        <div className="space-y-6">
          {/* Score card */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">Overall Score</h2>
              <span className={`text-4xl font-bold ${scoreColor(evaluation.score)}`}>
                {evaluation.score}
                <span className="text-xl text-slate-400">/100</span>
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 mb-2">
              <div
                className={`h-3 rounded-full transition-all duration-700 ${scoreBarColor(evaluation.score)}`}
                style={{ width: `${evaluation.score}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>{scoreLabel(evaluation.score)}</span>
              <span>{evaluation.errors.length} issue{evaluation.errors.length !== 1 ? 's' : ''} found</span>
            </div>
          </div>

          {/* Corrected text */}
          {evaluation.correctedText && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-3">Corrected Version</h2>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap bg-green-50 rounded-lg p-4 border border-green-100 text-sm">
                {evaluation.correctedText}
              </p>
            </div>
          )}

          {/* Errors by category */}
          {evaluation.errors.length > 0 && errorsByCategory && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800">Issues Found</h2>
                {exercises.length > 0 && (
                  <Link href="/practice" className="btn-primary text-sm">
                    Practice Exercises →
                  </Link>
                )}
              </div>
              <div className="space-y-5">
                {(Object.keys(CATEGORY_STYLES) as ErrorCategory[])
                  .filter((cat) => errorsByCategory[cat]?.length)
                  .map((cat) => {
                    const style = CATEGORY_STYLES[cat];
                    const catErrors = errorsByCategory[cat];
                    return (
                      <div key={cat}>
                        <span className={`badge ${style.bg} ${style.text} mb-3`}>
                          {style.label} ({catErrors.length})
                        </span>
                        <div className="space-y-3">
                          {catErrors.map((err) => (
                            <div
                              key={err.id}
                              className={`rounded-lg border ${style.border} ${style.bg} p-4`}
                            >
                              <div className="flex flex-wrap gap-4 mb-2 text-sm">
                                <div>
                                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Original</span>
                                  <p className="font-mono text-red-700 bg-red-50 rounded px-2 py-0.5 mt-0.5 inline-block ml-1">
                                    {err.original}
                                  </p>
                                </div>
                                <div className="text-slate-400 self-center">→</div>
                                <div>
                                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Corrected</span>
                                  <p className="font-mono text-green-700 bg-green-50 rounded px-2 py-0.5 mt-0.5 inline-block ml-1">
                                    {err.corrected}
                                  </p>
                                </div>
                              </div>
                              <p className="text-sm text-slate-600">{err.explanation}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* No errors */}
          {evaluation.errors.length === 0 && (
            <div className="card p-6 text-center">
              <div className="text-4xl mb-2">🎉</div>
              <h3 className="text-lg font-semibold text-green-700 mb-1">Perfect English!</h3>
              <p className="text-slate-500 text-sm">No issues detected. Your text is excellent.</p>
            </div>
          )}

          {/* Practice CTA at bottom */}
          {exercises.length > 0 && (
            <div className="text-center pt-2">
              <Link href="/practice" className="btn-primary px-8 py-3 text-base">
                Practice {exercises.length} Exercise{exercises.length !== 1 ? 's' : ''} →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
