'use client';

import { useState } from 'react';
import { Scenario, SCENARIO_LABELS } from '@/lib/types';

interface TextError {
  id: string;
  category: 'grammar' | 'vocabulary' | 'naturalness' | 'punctuation';
  original: string;
  corrected: string;
  explanation: string;
}

interface EvaluationResult {
  score: number;
  correctedText: string;
  errors: TextError[];
}

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

const CATEGORY_STYLES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  grammar: { label: 'Grammar', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  vocabulary: { label: 'Vocabulary', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  naturalness: { label: 'Naturalness', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  punctuation: { label: 'Punctuation', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
};

export default function Home() {
  const [input, setInput] = useState('');
  const [scenario, setScenario] = useState<Scenario>('casual');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input, scenario }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '评估失败，请重试');
      }

      const data = await response.json();
      setResult(data.evaluation);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发生错误');
    } finally {
      setLoading(false);
    }
  };

  // Group errors by category
  const errorsByCategory = result?.errors.reduce(
    (acc, err) => {
      if (!acc[err.category]) acc[err.category] = [];
      acc[err.category].push(err);
      return acc;
    },
    {} as Record<string, TextError[]>,
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            English Eval
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            英文表达智能评估与训练
          </p>
        </header>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <form onSubmit={handleSubmit}>
            <label htmlFor="input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              输入你的英文表达：
            </label>
            <textarea
              id="input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="例如：I go to store yesterday and buy some apple..."
              className="w-full h-40 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
              disabled={loading}
            />
            
            {/* Scenario selector */}
            <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-100">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">场景:</span>
              <div className="flex gap-2">
                {(Object.keys(SCENARIO_LABELS) as Scenario[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setScenario(s)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      scenario === s
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {SCENARIO_LABELS[s].label}
                  </button>
                ))}
              </div>
              <span className="text-xs text-gray-400 ml-auto">{SCENARIO_LABELS[scenario].description}</span>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? '评估中...' : '提交评估'}
              </button>
            </div>
          </form>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            {/* Score Display */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Overall Score
                </h2>
                <span className={`text-4xl font-bold ${scoreColor(result.score)}`}>
                  {result.score}
                  <span className="text-xl text-gray-400">/100</span>
                </span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 mb-2">
                <div
                  className={`h-3 rounded-full transition-all duration-700 ${scoreBarColor(result.score)}`}
                  style={{ width: `${result.score}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{scoreLabel(result.score)}</span>
                <span>{result.errors.length} issue{result.errors.length !== 1 ? 's' : ''} found</span>
              </div>
            </div>

            {/* Corrected text */}
            {result.correctedText && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Corrected Version
                </h2>
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <p className="text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap">
                    {result.correctedText}
                  </p>
                </div>
              </div>
            )}

            {/* Errors by category */}
            {result.errors.length > 0 && errorsByCategory && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Issues Found
                </h2>
                <div className="space-y-5">
                  {(Object.keys(CATEGORY_STYLES) as string[])
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
                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Original</span>
                                    <p className="font-mono text-red-700 bg-red-50 dark:bg-red-900/30 rounded px-2 py-0.5 mt-0.5 inline-block ml-1">
                                      {err.original}
                                    </p>
                                  </div>
                                  <div className="text-gray-400 self-center">→</div>
                                  <div>
                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Corrected</span>
                                    <p className="font-mono text-green-700 bg-green-50 dark:bg-green-900/30 rounded px-2 py-0.5 mt-0.5 inline-block ml-1">
                                      {err.corrected}
                                    </p>
                                  </div>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300">{err.explanation}</p>
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
            {result.errors.length === 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
                <div className="text-4xl mb-2">🎉</div>
                <h3 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-1">
                  Perfect English!
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No issues detected for {SCENARIO_LABELS[scenario].label} scenario.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
