export const COMMON_TIME_SIGNATURES = [
  '2/4',
  '3/4',
  '4/4',
  '6/8',
  '9/8',
  '12/8',
] as const;

export function formatTimeSignatureDisplay(ts: string): string {
  if (!ts) return '—';
  return ts;
}
