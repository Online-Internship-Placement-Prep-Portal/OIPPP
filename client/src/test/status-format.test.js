import { describe, expect, it } from 'vitest';
import { formatDate, formatINR, formatPercent } from '../lib/format';
import { isFinal, nextStatuses, statusLabel, STATUSES } from '../lib/status';

describe('status transitions (REV-2)', () => {
  it('allows only the forward moves or a rejection', () => {
    expect(nextStatuses('APPLIED')).toEqual(['SHORTLISTED', 'REJECTED']);
    expect(nextStatuses('SHORTLISTED')).toEqual(['INTERVIEW', 'REJECTED']);
    expect(nextStatuses('INTERVIEW')).toEqual(['OFFER', 'REJECTED']);
  });

  it('treats OFFER and REJECTED as final, and unknown statuses as having no moves', () => {
    expect(isFinal('OFFER')).toBe(true);
    expect(isFinal('REJECTED')).toBe(true);
    expect(isFinal('APPLIED')).toBe(false);
    expect(nextStatuses('BOGUS')).toEqual([]);
  });

  it('never allows moving back to APPLIED', () => {
    for (const s of STATUSES) expect(nextStatuses(s)).not.toContain('APPLIED');
  });

  it('labels every status in words', () => {
    expect(STATUSES.map(statusLabel)).toEqual(['Applied', 'Shortlisted', 'Interview', 'Offer', 'Rejected']);
  });
});

describe('formatting', () => {
  it('shows dates as DD-MM-YYYY', () => {
    expect(formatDate(new Date(2026, 10, 5))).toBe('05-11-2026');
    expect(formatDate(null)).toBe('—');
    expect(formatDate('not a date')).toBe('—');
  });

  it('shows money in INR with Indian grouping', () => {
    expect(formatINR(150000)).toBe('₹1,50,000');
    expect(formatINR(undefined)).toBe('—');
  });

  it('rounds percentages to one decimal', () => {
    expect(formatPercent(66.666)).toBe('66.7%');
    expect(formatPercent(null)).toBe('—');
  });
});
