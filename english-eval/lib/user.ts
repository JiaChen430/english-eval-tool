// Simple user management with localStorage

export function getNickname(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('ee_nickname');
}

export function setNickname(nickname: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('ee_nickname', nickname.trim());
}

export function clearNickname(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('ee_nickname');
}
