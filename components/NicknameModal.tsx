'use client';

import { useState, useEffect } from 'react';
import { getNickname, setNickname } from '@/lib/user';

export default function NicknameModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [nickname, setNicknameInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const existing = getNickname();
    if (!existing) {
      setIsOpen(true);
    }
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = nickname.trim();
    
    if (!trimmed) {
      setError('请输入昵称');
      return;
    }
    
    if (trimmed.length < 2 || trimmed.length > 20) {
      setError('昵称长度应为2-20个字符');
      return;
    }

    setNickname(trimmed);
    setIsOpen(false);
    window.location.reload(); // Refresh to load user data
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">👋</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">欢迎使用 English Eval</h2>
          <p className="text-slate-600 text-sm">
            请输入你的昵称，用于区分不同用户的学习记录
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="nickname" className="block text-sm font-medium text-slate-700 mb-2">
            你的昵称
          </label>
          <input
            id="nickname"
            type="text"
            value={nickname}
            onChange={(e) => {
              setNicknameInput(e.target.value);
              setError('');
            }}
            placeholder="例如：Claire"
            maxLength={20}
            autoFocus
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900
              placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400
              focus:border-transparent text-base"
          />
          {error && (
            <p className="text-red-600 text-sm mt-2">{error}</p>
          )}

          <button
            type="submit"
            className="w-full mt-4 btn-primary py-3 text-base"
          >
            开始使用
          </button>

          <p className="text-xs text-slate-400 mt-3 text-center">
            昵称会保存在浏览器中，下次访问自动登录
          </p>
        </form>
      </div>
    </div>
  );
}
