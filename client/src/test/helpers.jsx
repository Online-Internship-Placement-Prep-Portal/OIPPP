import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { session } from '../api/client';
import { AuthProvider } from '../auth/AuthContext';

export const USERS = {
  STUDENT: { id: 's1', name: 'Asha Rao', email: 'asha@pes.edu', role: 'STUDENT', status: 'ACTIVE' },
  RECRUITER: { id: 'r1', name: 'Rec Lead', email: 'rec@acme.io', role: 'RECRUITER', status: 'ACTIVE' },
  ADMIN: { id: 'a1', name: 'Admin', email: 'admin@example.com', role: 'ADMIN', status: 'ACTIVE' },
};

// Renders `element` at `path`, signed in as `role` when given.
export function renderAt(element, { path = '/', route = path, role, extraRoutes = null } = {}) {
  if (role) session.save('test-token', USERS[role]);
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <Routes>
          <Route path={path} element={element} />
          {extraRoutes}
          <Route path="*" element={<p>other page</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

export const ok = (data) => Promise.resolve({ data });
