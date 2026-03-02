'use client';

import { useState } from 'react';

interface EvaluationResult {
  original: string;
  corrected: string;
  score: number;
  feedback: Array<{
    type: 'grammar' | 'vocabulary' | 'naturalness';
    severity: 'error' | 'improvement' | 'suggestion';
    issue: string;
    suggestion: string;
    american?: string;
  }>;
}

export default function Home() {
  const [input, setInput] = useState('');
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
        body: JSON.stringify({ text: input }),
      });

      if (!response.ok) {
        throw new Error('评估失败，请重试');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发生错误');
    } finally {
      setLoading(false);
    }
  };

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
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  评估结果
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {result.score}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">/ 100</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                修正版本（更自然的北美口语）
              </h2>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-gray-900 dark:text-gray-100 leading-relaxed">
                  {result.corrected}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                详细反馈
              </h2>
              <div className="space-y-4">
                {result.feedback.length === 0 ? (
                  <p className="text-green-600 dark:text-green-400 text-center py-4">
                    🎉 你的表达已经非常自然了！继续保持！
                  </p>
                ) : (
                  result.feedback.map((item, index) => (
                    <div 
                      key={index} 
                      className={`border-l-4 pl-4 py-2 ${
                        item.severity === 'error' ? 'border-red-500' :
                        item.severity === 'improvement' ? 'border-yellow-500' :
                        'border-blue-500'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          item.type === 'grammar' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' :
                          item.type === 'vocabulary' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' :
                          'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                        }`}>
                          {item.type === 'grammar' ? '语法错误' : item.type === 'vocabulary' ? '用词改进' : '更自然'}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          item.severity === 'error' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' :
                          item.severity === 'improvement' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' :
                          'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}>
                          {item.severity === 'error' ? '错误' : item.severity === 'improvement' ? '改进' : '建议'}
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 mb-1">
                        <strong>问题：</strong>{item.issue}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400 mb-1">
                        <strong>建议：</strong>{item.suggestion}
                      </p>
                      {item.american && (
                        <div className="mt-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                          <p className="text-purple-800 dark:text-purple-200">
                            <strong>🇺🇸 北美地道说法：</strong>{item.american}
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
