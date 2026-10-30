import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { session } from '../api/client';
import { AuthProvider } from '../auth/AuthContext';
import RequireRole from '../auth/RequireRole';
import { USERS } from './helpers';

function renderGuarded(role) {
  if (role) session.save('t', USERS[role]);
  return render(
    <MemoryRouter initialEntries={['/admin/stats']}>
      <AuthProvider>
        <Routes>
          <Route path="/admin" element={<RequireRole roles={['ADMIN']} />}>
            <Route path="stats" element={<p>admin stats</p>} />
          </Route>
          <Route path="/login" element={<p>login page</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('RequireRole (AUTH-6)', () => {
  it('sends a signed-out visitor to the login page', () => {
    renderGuarded(null);
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('shows the no-access screen for the wrong role', () => {
    renderGuarded('STUDENT');
    expect(screen.getByRole('heading', { name: 'You do not have access to this page' })).toBeInTheDocument();
    expect(screen.queryByText('admin stats')).not.toBeInTheDocument();
  });

  it('renders the page for an allowed role', () => {
    renderGuarded('ADMIN');
    expect(screen.getByText('admin stats')).toBeInTheDocument();
  });
});
