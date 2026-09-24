import { describe, it, expect } from 'vitest';
import { computeHealth } from '../src/services/feedHealth.js';

describe('feed health', () => {
  it('computes documented states', () => {
    const now = Date.now();
    expect(computeHealth({ last_success: now - 1000, last_attempt: now - 1000, consecutive_failures: 0, expected_interval_s: 60, latency_ms: 100, rejection_ratio: 0, now })).toBe('healthy');
    expect(computeHealth({ last_success: now - 180000, last_attempt: now - 2000, consecutive_failures: 0, expected_interval_s: 60, latency_ms: 100, rejection_ratio: 0, now })).toBe('delayed');
    expect(computeHealth({ last_success: now - 1000, last_attempt: now - 1000, consecutive_failures: 3, expected_interval_s: 60, latency_ms: 100, rejection_ratio: 0, now })).toBe('down');
    expect(computeHealth({ last_success: now - 1000, last_attempt: now - 1000, consecutive_failures: 1, expected_interval_s: 60, latency_ms: 100, rejection_ratio: 0.1, now })).toBe('degraded');
  });
});
