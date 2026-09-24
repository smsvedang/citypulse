export function computeHealth({ last_success, last_attempt, consecutive_failures, expected_interval_s, latency_ms, rejection_ratio, now }) {
  const safeNow = new Date(now).getTime();
  const safeLastSuccess = last_success != null && last_success !== '' ? Number(last_success) : null;
  const safeLastAttempt = last_attempt != null && last_attempt !== '' ? Number(last_attempt) : null;
  const interval = Number(expected_interval_s) || 60;
  const fails = Number(consecutive_failures) || 0;
  const ratio = Number(rejection_ratio) || 0;

  if (fails >= 3) return 'down';
  if (safeLastSuccess != null && safeNow - safeLastSuccess > 5 * interval * 1000) return 'down';
  if (safeLastSuccess == null && safeLastAttempt != null && safeLastAttempt > 0 && safeLastAttempt <= safeNow) return 'down';

  if (safeLastSuccess != null && safeNow - safeLastSuccess > 2 * interval * 1000) return 'delayed';
  if (Number(latency_ms) > 5000) return 'delayed';

  if (fails >= 1) return 'degraded';
  if (ratio > 0.3) return 'degraded';

  return 'healthy';
}
