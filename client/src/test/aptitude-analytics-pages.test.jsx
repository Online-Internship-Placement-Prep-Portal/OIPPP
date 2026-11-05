// Branch coverage (#98): aptitude and analytics pages that had no client tests
// (Tests.jsx, Result.jsx, Statistics.jsx). UI-TST-01, UI-TST-03, UI-ANL-02.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from '../api/client';
import Statistics from '../pages/admin/Statistics';
import Result from '../pages/student/Result';
import Tests from '../pages/student/Tests';
import { ok, renderAt } from './helpers';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() } };
});

const fail = (status, code, message) => Promise.reject(new ApiError({ status, code, message }));
const routeGet = (routes) => api.get.mockImplementation((url) => (url in routes ? routes[url]() : ok({ items: [] })));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Aptitude tests list (UI-TST-01)', () => {
  const tests = [
    { testId: 't1', title: 'Mock 1', questionCount: 20, durationMin: 30, status: 'PUBLISHED' },
    { testId: 't2', title: 'Mock 2', questionCount: 10, durationMin: 15, status: 'PUBLISHED' },
  ];

  it('shows a submitted test with its score and a new one with Start or resume', async () => {
    routeGet({
      '/tests': () => ok({ items: tests }),
      '/analytics/me': () => ok({ trend: [{ attemptId: 'a1', testId: 't1', score: 75, submittedAt: '2026-11-01T00:00:00Z' }] }),
    });
    renderAt(<Tests />, { path: '/tests', role: 'STUDENT' });
    const done = (await screen.findByText('Mock 1')).closest('article');
    expect(within(done).getByText('20 questions')).toBeInTheDocument();
    expect(within(done).getByText('Score 75%')).toBeInTheDocument();
    expect(within(done).getByRole('link', { name: 'View result' })).toHaveAttribute('href', '/attempts/a1/result');
    const fresh = screen.getByText('Mock 2').closest('article');
    expect(within(fresh).getByText('15 minutes')).toBeInTheDocument();
    expect(within(fresh).getByRole('button', { name: 'Start or resume' })).toBeEnabled();
  });

  it('starts (or resumes) an attempt and opens it', async () => {
    const user = userEvent.setup();
    routeGet({ '/tests': () => ok({ items: [tests[1]] }), '/analytics/me': () => ok({ trend: [] }) });
    api.post.mockReturnValue(ok({ attemptId: 'att9' }));
    renderAt(<Tests />, { path: '/tests', role: 'STUDENT', extraRoutes: <Route path="/attempts/:id" element={<p>attempt page</p>} /> });
    await user.click(await screen.findByRole('button', { name: 'Start or resume' }));
    expect(api.post).toHaveBeenCalledWith('/tests/t2/attempts', {});
    expect(await screen.findByText('attempt page')).toBeInTheDocument();
  });

  it('shows the server error when the start is refused', async () => {
    const user = userEvent.setup();
    routeGet({ '/tests': () => ok({ items: [tests[1]] }), '/analytics/me': () => ok({ trend: [] }) });
    api.post.mockImplementation(() => fail(409, 'ATTEMPT_EXISTS', 'You have already submitted this test'));
    renderAt(<Tests />, { path: '/tests', role: 'STUDENT' });
    await user.click(await screen.findByRole('button', { name: 'Start or resume' }));
    expect(await screen.findByText(/already submitted this test/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start or resume' })).toBeEnabled();
  });

  it('says so when no test is published', async () => {
    routeGet({ '/tests': () => ok({ items: [] }), '/analytics/me': () => ok({ trend: [] }) });
    renderAt(<Tests />, { path: '/tests', role: 'STUDENT' });
    expect(await screen.findByText('No tests are published yet.')).toBeInTheDocument();
  });
});

describe('Test result (UI-TST-03)', () => {
  it('shows the score and the per-topic table from the server', async () => {
    routeGet({ '/attempts/a1/result': () => ok({ score: 66.6667, correctAnswers: 4, totalQuestions: 6, submittedAt: '2026-11-05T06:00:00Z',
      topicBreakdown: [
        { topic: 'Quantitative', correctAnswers: 2, totalQuestions: 2, percentage: 100 },
        { topic: 'Technical', correctAnswers: 0, totalQuestions: 2, percentage: 0 },
      ] }) });
    renderAt(<Result />, { path: '/attempts/:id/result', route: '/attempts/a1/result', role: 'STUDENT' });
    expect(await screen.findByText('66.7%')).toBeInTheDocument();
    expect(screen.getByText('4/6')).toBeInTheDocument();
    const rows = screen.getAllByRole('row').slice(1).map((r) => r.textContent);
    expect(rows).toEqual(['Quantitative2/2100%', 'Technical0/20%']);
    expect(screen.getByRole('link', { name: 'Back to tests' })).toHaveAttribute('href', '/tests');
  });

  it('shows the error when the attempt is still open', async () => {
    routeGet({ '/attempts/a1/result': () => fail(409, 'ATTEMPT_OPEN', 'The attempt is still in progress') });
    renderAt(<Result />, { path: '/attempts/:id/result', route: '/attempts/a1/result', role: 'STUDENT' });
    expect(await screen.findByText(/still in progress/)).toBeInTheDocument();
  });
});

describe('Placement statistics (UI-ANL-02, DOM-3)', () => {
  const stats = {
    filters: { branch: null, gradYear: null }, students: 40, placedStudents: 12,
    offersPerCompany: [{ company: 'Globex', offers: 9 }, { company: null, offers: 3 }],
    applicationsPerListing: [
      { listingId: 'l1', title: 'Data Intern', company: 'Globex', applications: 30, offers: 9 },
      { listingId: 'l2', title: null, company: null, applications: 5, offers: 3 },
    ],
    averageScoreByBranch: [{ branch: 'CSE', results: 50, students: 40, averageScore: 71.4 }, { branch: null, results: 2, students: 2, averageScore: 40 }],
  };

  it('shows the tiles and the per-listing table, with unknown listings labelled', async () => {
    api.get.mockReturnValue(ok(stats));
    renderAt(<Statistics />, { path: '/admin/statistics', role: 'ADMIN' });
    expect(await screen.findByText('Students')).toBeInTheDocument();
    expect(screen.getByText('Students').previousSibling).toHaveTextContent('40');
    expect(screen.getByText('With an offer').previousSibling).toHaveTextContent('12');
    expect(screen.getByText('Placement rate').previousSibling).toHaveTextContent('30%');
    const rows = screen.getAllByRole('row').slice(1).map((r) => r.textContent);
    expect(rows).toEqual(['Data InternGlobex309', 'Unknown—53']);
    expect(api.get).toHaveBeenCalledWith('/analytics/placements', { params: {} });
  });

  it('applies branch and graduation year to the request, and blocks a bad year', async () => {
    const user = userEvent.setup();
    api.get.mockReturnValue(ok(stats));
    renderAt(<Statistics />, { path: '/admin/statistics', role: 'ADMIN' });
    await screen.findByText('Students');
    await user.type(screen.getByLabelText('Graduation year'), '1999');
    expect(screen.getByText('Year must be 2000–2100')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
    await user.clear(screen.getByLabelText('Graduation year'));
    await user.type(screen.getByLabelText('Graduation year'), '2027');
    await user.type(screen.getByLabelText('Branch'), ' CSE ');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/analytics/placements', { params: { branch: 'CSE', gradYear: 2027 } }));
  });

  it('shows empty states and a dash for the rate when the cohort is empty', async () => {
    api.get.mockReturnValue(ok({ ...stats, students: 0, placedStudents: 0, offersPerCompany: [], applicationsPerListing: [], averageScoreByBranch: [] }));
    renderAt(<Statistics />, { path: '/admin/statistics', role: 'ADMIN' });
    expect(await screen.findByText('No offers yet.')).toBeInTheDocument();
    expect(screen.getByText('No test results yet.')).toBeInTheDocument();
    expect(screen.getByText('No applications yet.')).toBeInTheDocument();
    expect(screen.getByText('Placement rate').previousSibling).toHaveTextContent('—');
  });

  it('exports the CSV with the current filter and reports a failed export', async () => {
    const user = userEvent.setup();
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    api.get.mockImplementation((url) => (url.endsWith('/export') ? ok(new Blob(['a,b'])) : ok(stats)));
    renderAt(<Statistics />, { path: '/admin/statistics', role: 'ADMIN' });
    await user.click(await screen.findByRole('button', { name: 'Export CSV' }));
    expect(api.get).toHaveBeenCalledWith('/analytics/placements/export', { params: {}, responseType: 'blob' });
    api.get.mockImplementation((url) => (url.endsWith('/export') ? fail(403, 'FORBIDDEN', 'Export not allowed') : ok(stats)));
    await user.click(screen.getByRole('button', { name: 'Export CSV' }));
    expect(await screen.findByText(/Export not allowed/)).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('offers a retry when the statistics fail to load', async () => {
    const user = userEvent.setup();
    api.get.mockImplementationOnce(() => fail(500, 'INTERNAL', 'Something went wrong')).mockImplementation(() => ok(stats));
    renderAt(<Statistics />, { path: '/admin/statistics', role: 'ADMIN' });
    expect(await screen.findByText(/Something went wrong/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /retry/i }));
    expect(await screen.findByText('Students')).toBeInTheDocument();
  });
});
