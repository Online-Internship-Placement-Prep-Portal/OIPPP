import { describe, expect, it } from 'vitest';
import { checkPassword, checkResumeFile, checkSrn, parseSkills, validateRegister } from '../lib/validation';
import { checkListing } from '../pages/recruiter/ListingForm';
import { checkQuestion } from '../pages/admin/Questions';
import { checkTest } from '../pages/admin/TestsAdmin';

describe('SRN (AUTH-1)', () => {
  it.each(['PES1UG24CS177', 'PES2UG23EC001', 'pes1ug24cs177'])('accepts %s', (srn) => {
    expect(checkSrn(srn)).toBe('');
  });
  it.each(['PES3UG24CS177', 'PES1PG24CS177', 'PES1UG24C1177', 'PES1UG24CS17', ''])('rejects %s', (srn) => {
    expect(checkSrn(srn)).not.toBe('');
  });
});

describe('password rule (AUTH-3)', () => {
  it('names the rule that failed', () => {
    expect(checkPassword('abc')).toMatch(/at least 8/);
    expect(checkPassword('abcdefgh')).toMatch(/digit/);
    expect(checkPassword('12345678')).toMatch(/letter/);
    expect(checkPassword('Passw0rd1')).toBe('');
  });
});

describe('validateRegister', () => {
  const base = { name: 'Asha', email: 'asha@pes.edu', password: 'Student123' };
  it('requires an SRN only for students', () => {
    expect(validateRegister({ ...base, role: 'STUDENT', srn: '' })).toHaveProperty('srn');
    expect(validateRegister({ ...base, role: 'RECRUITER', srn: '' })).toEqual({});
  });
  it('flags a bad email and short name', () => {
    expect(validateRegister({ ...base, role: 'RECRUITER', name: 'A', email: 'nope' })).toEqual({
      name: expect.any(String), email: expect.any(String),
    });
  });
});

describe('resume file (PROF-2)', () => {
  const file = (name, type, size) => ({ name, type, size });
  it('accepts a PDF up to 2 MB and rejects anything else', () => {
    expect(checkResumeFile(file('cv.pdf', 'application/pdf', 1.9 * 1024 * 1024))).toBe('');
    expect(checkResumeFile(file('cv.pdf', 'application/pdf', 2.1 * 1024 * 1024))).toMatch(/2 MB/);
    expect(checkResumeFile(file('cv.docx', 'application/msword', 1000))).toMatch(/PDF/);
  });
});

describe('form rules', () => {
  it('parses skills, trimming and dropping duplicates', () => {
    expect(parseSkills(' React, node.js,react,, SQL ')).toEqual(['React', 'node.js', 'SQL']);
  });

  it('rejects listings with a past deadline or negative stipend (LST-2)', () => {
    const form = { company: 'Acme', title: 'Intern', location: 'Bengaluru', mode: 'REMOTE', stipend: '-1',
      skills: 'React', minCgpa: '', deadline: '2020-01-01' };
    expect(checkListing(form)).toEqual({ stipend: expect.any(String), deadline: expect.any(String) });
    expect(checkListing({ ...form, stipend: '0', deadline: '2999-01-01' })).toEqual({});
  });

  it('checks questions have 2-6 distinct options (TST-1)', () => {
    const q = { text: 'Q', options: ['a', 'b'], answerIdx: 1 };
    expect(checkQuestion(q)).toEqual({});
    expect(checkQuestion({ ...q, options: ['a', 'A'] })).toHaveProperty('options');
    expect(checkQuestion({ ...q, options: ['a'] })).toHaveProperty('options');
  });

  it('checks tests have 5-60 questions and 10-120 minutes (TST-2)', () => {
    const ids = (n) => Array.from({ length: n }, (_, i) => String(i));
    expect(checkTest({ title: 'T', durationMin: '30', questionIds: ids(5) })).toEqual({});
    expect(checkTest({ title: 'T', durationMin: '9', questionIds: ids(4) })).toEqual({
      durationMin: expect.any(String), questionIds: expect.any(String),
    });
  });
});
