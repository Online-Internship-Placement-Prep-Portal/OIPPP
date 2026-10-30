import { Link } from 'react-router-dom';
import { HOME_BY_ROLE, useAuth } from '../auth/AuthContext';

export default function Forbidden() {
  const { user } = useAuth();
  return (
    <section className="card narrow center">
      <h1>You do not have access to this page</h1>
      <p className="muted">This page belongs to a different role.</p>
      <Link className="btn btn-primary" to={HOME_BY_ROLE[user?.role] || '/login'}>Go to my dashboard</Link>
    </section>
  );
}
