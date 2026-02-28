'use client';

import { useState } from 'react';

interface Evaluation {
  score: number;
  feedback: string;
  issues: Array<{ type: string; description: string }>;
  suggestion: string;
}

interface Attempt {
  text: string;
  evaluation: Evaluation | null;
}

function scoreColor(score: number) {
  if (score >= 90) return 'text-green-600';
  if (score >= 75) return 'text-blue-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

function scoreBarColor(score: number) {
  if (score >= 90) return 'bg-green-500';
  if (score >= 75) return 'bg-blue-500';
  if (score >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
}

export default function RebuildPage() {
  const [chinese, setChinese] = useState('');
  const [reference, setReference] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [showAttemptInput, setShowAttemptInput] = useState(false);

  const [currentAttempt, setCurrentAttempt] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  const [error, setError] = useState('');

  async function handleTranslate() {
    if (!chinese.trim()) return;
    setIsTranslating(true);
    setError('');

    try {
      const res = await fetch('/api/rebuild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'translate', chinese: chinese.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Translation failed.');
      }

      const data = await res.json();
      setReference(data.translation);
      setShowAttemptInput(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsTranslating(false);
    }
  }

  async function handleSubmitAttempt() {
    if (!currentAttempt.trim()) return;
    setIsEvaluating(true);
    setError('');

    try {
      const res = await fetch('/api/rebuild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'evaluate',
          chinese,
          reference,
          userAttempt: currentAttempt.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Evaluation failed.');
      }

      const evaluation: Evaluation = await res.json();
      setAttempts((prev) => [...prev, { text: currentAttempt.trim(), evaluation }]);
      setCurrentAttempt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsEvaluating(false);
    }
  }

  function handleReset() {
    setChinese('');
    setReference('');
    setShowAttemptInput(false);
    setCurrentAttempt('');
    setAttempts([]);
    setError('');
  }

  const latestScore = attempts.length > 0 ? attempts[attempts.length - 1].evaluation?.score : null;
  const hasReached90 = latestScore !== null && latestScore !== undefined && latestScore >= 90;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      {/* Hero */}
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
          Expression Rebuild
        </h1>
        <p className="text-slate-500 text-lg">
          输入中文，先尝试自己表达，再对比AI标准翻译。持续练习直到90分+！
        </p>
      </div>

      {/* Step 1: Input Chinese */}
      {!showAttemptInput && (
        <div className="card p-6 mb-6">
          <label htmlFor="chinese-input" className="block text-sm font-medium text-slate-700 mb-2">
            输入中文
          </label>
          <textarea
            id="chinese-input"
            value={chinese}
            onChange={(e) => setChinese(e.target.value)}
            placeholder="输入你想表达的中文内容…"
            rows={4}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900
              placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400
              focus:border-transparent resize-y text-sm leading-relaxed"
          />
          <div className="flex items-center justify-end mt-3">
            <button
              onClick={handleTranslate}
              disabled={isTranslating || !chinese.trim()}
              className="btn-primary"
            >
              {isTranslating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  准备中…
                </>
              ) : (
                '开始练习 →'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm mb-6">
          {error}
        </div>
      )}

      {/* Step 2: Attempt input */}
      {showAttemptInput && !hasReached90 && (
        <div className="space-y-6">
          <div className="card p-6 bg-blue-50 border-blue-200">
            <h2 className="text-lg font-semibold text-slate-800 mb-2">中文原文</h2>
            <p className="text-slate-700 leading-relaxed">{chinese}</p>
          </div>

          <div className="card p-6">
            <label htmlFor="attempt-input" className="block text-sm font-medium text-slate-700 mb-2">
              你的英文表达
            </label>
            <textarea
              id="attempt-input"
              value={currentAttempt}
              onChange={(e) => setCurrentAttempt(e.target.value)}
              placeholder="Try to express the Chinese text in English…"
              rows={4}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900
                placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400
                focus:border-transparent resize-y text-sm leading-relaxed"
            />
            <div className="flex items-center justify-between mt-3">
              <button onClick={handleReset} className="btn-secondary text-sm">
                重新开始
              </button>
              <button
                onClick={handleSubmitAttempt}
                disabled={isEvaluating || !currentAttempt.trim()}
                className="btn-primary"
              >
                {isEvaluating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    评估中…
                  </>
                ) : (
                  '提交评估'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {attempts.length > 0 && (
        <div className="space-y-6 mt-6">
          {/* Reference translation (only shown after first attempt) */}
          <div className="card p-6 bg-green-50 border-green-200">
            <h2 className="text-lg font-semibold text-slate-800 mb-2">
              ✅ 标准翻译（北美地道表达）
            </h2>
            <p className="text-slate-700 leading-relaxed font-medium">{reference}</p>
          </div>

          {/* Attempts history */}
          {attempts.map((attempt, idx) => {
            const evaluation = attempt.evaluation;
            if (!evaluation) return null;

            return (
              <div key={idx} className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-600">
                    尝试 #{idx + 1}
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className={`text-3xl font-bold ${scoreColor(evaluation.score)}`}>
                      {evaluation.score}
                      <span className="text-lg text-slate-400">/100</span>
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-2 mb-4">
                  <div
                    className={`h-2 rounded-full transition-all duration-700 ${scoreBarColor(evaluation.score)}`}
                    style={{ width: `${evaluation.score}%` }}
                  />
                </div>

                <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Your attempt</p>
                  <p className="text-slate-700 leading-relaxed">{attempt.text}</p>
                </div>

                <div className="mb-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Feedback</p>
                  <p className="text-slate-700 text-sm leading-relaxed">{evaluation.feedback}</p>
                </div>

                {evaluation.issues && evaluation.issues.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Issues</p>
                    <div className="space-y-2">
                      {evaluation.issues.map((issue, i) => (
                        <div key={i} className="flex gap-2 text-sm">
                          <span className="badge bg-red-50 text-red-700 shrink-0">
                            {issue.type}
                          </span>
                          <p className="text-slate-600">{issue.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {evaluation.suggestion && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-600 uppercase tracking-wide mb-1 font-medium">
                      💡 Suggested improvement
                    </p>
                    <p className="text-slate-700 leading-relaxed">{evaluation.suggestion}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Success banner */}
      {hasReached90 && (
        <div className="card p-6 bg-green-50 border-green-200 text-center mt-6">
          <div className="text-5xl mb-3">🎉</div>
          <h2 className="text-2xl font-bold text-green-700 mb-2">恭喜！你达到了90分+</h2>
          <p className="text-slate-600 mb-4">
            你的表达已经达到优秀水平，可以进行下一个练习了！
          </p>
          <button onClick={handleReset} className="btn-primary">
            开始新的练习
          </button>
        </div>
      )}
    </div>
  );
}
