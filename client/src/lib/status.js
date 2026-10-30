export const STATUSES = ['APPLIED', 'SHORTLISTED', 'INTERVIEW', 'OFFER', 'REJECTED'];

// Mirrors REV-2 on the server.
export const TRANSITIONS = {
  APPLIED: ['SHORTLISTED', 'REJECTED'],
  SHORTLISTED: ['INTERVIEW', 'REJECTED'],
  INTERVIEW: ['OFFER', 'REJECTED'],
  OFFER: [],
  REJECTED: [],
};

export const STATUS_LABELS = {
  APPLIED: 'Applied',
  SHORTLISTED: 'Shortlisted',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  REJECTED: 'Rejected',
};

export function nextStatuses(status) {
  return TRANSITIONS[status] || [];
}

export function isFinal(status) {
  return nextStatuses(status).length === 0;
}

export function statusLabel(status) {
  return STATUS_LABELS[status] || status;
}
