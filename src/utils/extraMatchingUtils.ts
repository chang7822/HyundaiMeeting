export function formatRemainingTime(expiresAt: string | null | undefined): string {
  if (!expiresAt) return '';
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return '만료됨';
  if (ms < 60000) return '곧 만료';
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}분`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h < 24) return m ? `${h}시간 ${m}분` : `${h}시간`;
  const d = Math.floor(h / 24);
  return `${d}일`;
}

/** "(N시간 N분 후 자동거절됨)" 또는 "(N분 후 자동거절됨)" 형식 */
export function formatAutoRejectRemaining(expiresAt: string | null | undefined): string {
  if (!expiresAt) return '(자동거절)';
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return '(자동거절됨)';
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return '(곧 자동거절됨)';
  if (mins < 60) return `(${mins}분 후 자동거절됨)`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `(${h}시간 ${m}분 후 자동거절됨)` : `(${h}시간 후 자동거절됨)`;
}

export function isExpired(expiresAt: string | null | undefined): boolean {
  return !!expiresAt && Date.now() >= new Date(expiresAt).getTime();
}
