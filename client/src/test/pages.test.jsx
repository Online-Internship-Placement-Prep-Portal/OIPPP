import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from '../api/client';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Settings from '../pages/admin/Settings';
import Applicants from '../pages/recruiter/Applicants';
import Applications from '../pages/student/Applications';
import Attempt from '../pages/student/Attempt';
import Progress from '../pages/student/Progress';
import { ok, renderAt } from './helpers';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() } };
});

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockImplementation(() => ok({ items: [] }));
});

describe('Register', () => {
  it('validates the SRN on blur and hides it for recruiters', async () => {
    const user = userEvent.setup();
    renderAt(<Register />, { path: '/register' });
    const srn = screen.getByLabelText('SRN');
    await user.type(srn, 'PES3UG24CS177');
    await user.tab();
    expect(screen.getByText('SRN must look like PES1UG24CS177')).toBeInTheDocument();
    await user.click(screen.getByLabelText('Recruiter'));
    expect(screen.queryByLabelText('SRN')).not.toBeInTheDocument();
  });

  it('sends the SRN upper-cased and logs the student in', async () => {
    const user = userEvent.setup();
    api.post.mockImplementation((url) => (url === '/auth/register'
      ? ok({ user: {} })
      : ok({ token: 't', user: { id: 's1', name: 'Asha', email: 'asha@pes.edu', role: 'STUDENT', status: 'ACTIVE' } })));
    renderAt(<Register />, { path: '/register', extraRoutes: <Route path="/home" element={<p>student home</p>} /> });
    await user.type(screen.getByLabelText('Full name'), 'Asha');
    await user.type(screen.getByLabelText('Institutional email'), 'asha@pes.edu');
    await user.type(screen.getByLabelText('SRN'), 'pes1ug24cs177');
    await user.type(screen.getByLabelText('Password'), 'Student123');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('student home')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/auth/register', {
      name: 'Asha', email: 'asha@pes.edu', password: 'Student123', role: 'STUDENT', srn: 'PES1UG24CS177',
    });
  });

  it('keeps the input and shows server field errors', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue(new ApiError({ status: 409, code: 'DUPLICATE', message: 'An account with this email already exists' }));
    renderAt(<Register />, { path: '/register' });
    await user.click(screen.getByLabelText('Recruiter'));
    await user.type(screen.getByLabelText('Full name'), 'Rec');
    await user.type(screen.getByLabelText('Work email'), 'rec@acme.io');
    await user.type(screen.getByLabelText('Password'), 'Recruit123');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('An account with this email already exists');
    expect(screen.getByLabelText('Work email')).toHaveValue('rec@acme.io');
  });
});

describe('Login', () => {
  it('shows the lockout message from a 423', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue(new ApiError({ status: 423, code: 'ACCOUNT_LOCKED', message: 'Account locked after 5 failed logins. Try again after 10:15.' }));
    renderAt(<Login />, { path: '/login' });
    await user.type(screen.getByLabelText('Email'), 'asha@pes.edu');
    await user.type(screen.getByLabelText('Password'), 'wrong1234');
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Try again after 10:15');
  });

  it('explains that a pending recruiter must be approved', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue(new ApiError({ status: 403, code: 'FORBIDDEN', message: 'Your account is not active' }));
    renderAt(<Login />, { path: '/login' });
    await user.type(screen.getByLabelText('Email'), 'rec@acme.io');
    await user.type(screen.getByLabelText('Password'), 'Recruit123');
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/approves them/);
  });
});

describe('Applicants (recruiter)', () => {
  const applicant = (id, status) => ({ _id: id, status, appliedAt: '2026-10-20T00:00:00Z',
    student: { id: `s${id}`, name: `Student ${id}`, branch: 'CSE', gradYear: 2027, cgpa: 8.1, skills: ['React'] } });

  beforeEach(() => {
    api.get.mockImplementation((url) => {
      if (url === '/listings/L1') return ok({ listing: { _id: 'L1', title: 'Backend Intern', company: 'Acme' } });
      if (url === '/applications/reject-reasons') return ok({ items: [{ code: 'POSITION_FILLED', label: 'Position has been filled' }] });
      return ok({ items: [applicant('a1', 'APPLIED'), applicant('a2', 'OFFER')], total: 2, page: 1 });
    });
  });

  it('offers only valid transitions per status', async () => {
    renderAt(<Applicants />, { path: '/recruiter/listings/:id/applicants', route: '/recruiter/listings/L1/applicants', role: 'RECRUITER' });
    const [, row1, row2] = await screen.findAllByRole('row');
    expect(within(row1).getByRole('button', { name: 'Move to Shortlisted' })).toBeInTheDocument();
    expect(within(row1).getByRole('button', { name: 'Reject' })).toBeInTheDocument();
    expect(within(row1).queryByRole('button', { name: 'Move to Offer' })).not.toBeInTheDocument();
    expect(within(row2).queryByRole('button', { name: /Move to|Reject/ })).not.toBeInTheDocument();
  });

  it('requires a reason before rejecting (REV-3)', async () => {
    const user = userEvent.setup();
    api.patch.mockReturnValue(ok({ status: 'REJECTED' }));
    renderAt(<Applicants />, { path: '/recruiter/listings/:id/applicants', route: '/recruiter/listings/L1/applicants', role: 'RECRUITER' });
    const [, row1] = await screen.findAllByRole('row');
    await user.click(within(row1).getByRole('button', { name: 'Reject' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Reject' }));
    expect(within(dialog).getByText('Choose a reason')).toBeInTheDocument();
    expect(api.patch).not.toHaveBeenCalled();
    await waitFor(() => expect(within(dialog).getByRole('option', { name: 'Position has been filled' })).toBeInTheDocument());
    await user.selectOptions(within(dialog).getByLabelText('Reason'), 'POSITION_FILLED');
    await user.click(within(dialog).getByRole('button', { name: 'Reject' }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/applications/a1/status', { status: 'REJECTED', reasonCode: 'POSITION_FILLED' }));
  });
});

describe('student pages', () => {
  it('lists applications with status chips in words', async () => {
    api.get.mockReturnValue(ok({ items: [{ _id: 'x', status: 'SHORTLISTED', createdAt: '2026-10-21T00:00:00Z',
      listing: { title: 'Backend Intern', company: 'Acme' }, history: [{ from: null, to: 'APPLIED', at: '2026-10-21T00:00:00Z' }] }] }));
    renderAt(<Applications />, { path: '/applications', role: 'STUDENT' });
    expect(await screen.findByText('Backend Intern')).toBeInTheDocument();
    expect(screen.getByText('Shortlisted')).toHaveClass('chip', 'chip-shortlisted');
    expect(screen.getByText('21-10-2026')).toBeInTheDocument();
  });

  it('shows progress figures and weakest topics', async () => {
    api.get.mockReturnValue(ok({ testsTaken: 2, averageScore: 70, trend: [
      { attemptId: 'a', testId: 't', testTitle: 'Mock 1', score: 60, submittedAt: '2026-10-01T00:00:00Z' },
      { attemptId: 'b', testId: 'u', testTitle: 'Mock 2', score: 80, submittedAt: '2026-10-08T00:00:00Z' }],
    topics: [{ topic: 'Verbal', percentage: 40, correctAnswers: 2, totalQuestions: 5 }],
    weakestTopics: [{ topic: 'Verbal', percentage: 40, correctAnswers: 2, totalQuestions: 5 }],
    applications: { total: 3, byStatus: { APPLIED: 1, SHORTLISTED: 1, INTERVIEW: 0, OFFER: 1, REJECTED: 0 } } }));
    renderAt(<Progress />, { path: '/progress', role: 'STUDENT' });
    expect(await screen.findByText('70%')).toBeInTheDocument();
    expect(screen.getAllByText('Verbal').length).toBeGreaterThan(0);
    expect(screen.getByText('Tests taken').previousSibling).toHaveTextContent('2');
  });

  it('restores saved answers and auto-saves a new pick (SAFE-1, TST-4)', async () => {
    const user = userEvent.setup();
    const now = new Date();
    api.get.mockReturnValue(ok({ attemptId: 'att1', status: 'IN_PROGRESS', serverTime: now.toISOString(),
      endsAt: new Date(now.getTime() + 20 * 60000).toISOString(), answers: { q1: 1 },
      questions: [
        { questionId: 'q1', text: 'Two plus two?', topic: 'Quantitative', difficulty: 'Easy', options: ['3', '4'] },
        { questionId: 'q2', text: 'Opposite of hot?', topic: 'Verbal', difficulty: 'Easy', options: ['cold', 'warm'] },
      ] }));
    api.patch.mockReturnValue(Promise.resolve({ data: '' }));
    renderAt(<Attempt />, { path: '/attempts/:id', route: '/attempts/att1', role: 'STUDENT' });
    expect(await screen.findByText('Two plus two?')).toBeInTheDocument();
    expect(screen.getByLabelText('4')).toBeChecked();
    expect(screen.getByText('1/2 answered')).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent(/(19|20):\d\d/);
    await user.click(screen.getByRole('button', { name: 'Question 2, not answered' }));
    await user.click(screen.getByLabelText('cold'));
    expect(api.patch).toHaveBeenCalledWith('/attempts/att1/answers', { questionId: 'q2', optionIdx: 0 });
    expect(await screen.findByText('✓ Saved')).toBeInTheDocument();
    expect(screen.getByText('2/2 answered')).toBeInTheDocument();
  });
});

describe('admin settings', () => {
  it('toggles the one-offer policy (DOM-2)', async () => {
    const user = userEvent.setup();
    api.get.mockReturnValue(ok({ settings: { oneOfferPolicy: false } }));
    api.patch.mockReturnValue(ok({ settings: { oneOfferPolicy: true } }));
    renderAt(<Settings />, { path: '/admin/settings', role: 'ADMIN' });
    const toggle = await screen.findByRole('switch');
    expect(toggle).not.toBeChecked();
    await user.click(toggle);
    expect(api.patch).toHaveBeenCalledWith('/admin/settings', { oneOfferPolicy: true });
    await waitFor(() => expect(screen.getByRole('switch')).toBeChecked());
    expect(screen.getByText('One-offer policy is on.')).toBeInTheDocument();
  });
});
