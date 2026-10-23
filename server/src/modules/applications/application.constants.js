const STATUSES = Object.freeze(['APPLIED', 'SHORTLISTED', 'INTERVIEW', 'OFFER', 'REJECTED']);

// REV-2: the only moves a recruiter may make
const TRANSITIONS = Object.freeze({
  APPLIED: ['SHORTLISTED', 'REJECTED'],
  SHORTLISTED: ['INTERVIEW', 'REJECTED'],
  INTERVIEW: ['OFFER', 'REJECTED'],
  OFFER: [],
  REJECTED: [],
});

// REV-3: fixed list shown to the recruiter
const REJECT_REASONS = Object.freeze({
  SKILLS_MISMATCH: 'Skills do not match the role',
  POSITION_FILLED: 'Position has been filled',
  INTERVIEW_NOT_CLEARED: 'Did not clear the interview',
  INCOMPLETE_PROFILE: 'Profile or resume incomplete',
  OTHER: 'Other',
});

function canTransition(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}

module.exports = { STATUSES, TRANSITIONS, REJECT_REASONS, canTransition };
