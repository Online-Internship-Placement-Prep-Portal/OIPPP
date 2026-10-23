const { TRANSITIONS, STATUSES, canTransition } = require('../../src/modules/applications/application.constants');

describe('REV-2 state machine', () => {
  test.each([
    ['APPLIED', 'SHORTLISTED'], ['APPLIED', 'REJECTED'],
    ['SHORTLISTED', 'INTERVIEW'], ['SHORTLISTED', 'REJECTED'],
    ['INTERVIEW', 'OFFER'], ['INTERVIEW', 'REJECTED'],
  ])('%s -> %s is allowed', (from, to) => expect(canTransition(from, to)).toBe(true));

  test('every other pair is refused', () => {
    let allowed = 0;
    for (const from of STATUSES) {
      for (const to of STATUSES) if (canTransition(from, to)) allowed += 1;
    }
    expect(allowed).toBe(6);
  });

  test('OFFER and REJECTED are final', () => {
    expect(TRANSITIONS.OFFER).toEqual([]);
    expect(TRANSITIONS.REJECTED).toEqual([]);
  });

  test('unknown status is refused', () => expect(canTransition('GHOST', 'APPLIED')).toBe(false));
});
