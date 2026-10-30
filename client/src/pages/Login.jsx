import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { HOME_BY_ROLE, useAuth } from '../auth/AuthContext';
import { ErrorBanner, Field, Notice } from '../components/ui';
import { checkEmail } from '../lib/validation';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={HOME_BY_ROLE[user.role] || '/'} replace />;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const blurEmail = () => setErrors((x) => ({ ...x, email: checkEmail(form.email) }));

  async function onSubmit(e) {
    e.preventDefault();
    const next = { email: checkEmail(form.email), password: form.password ? '' : 'Password is required' };
    setErrors(next);
    if (next.email || next.password) return;
    setBusy(true);
    setError(null);
    try {
      const signedIn = await login(form.email.trim(), form.password);
      navigate(location.state?.from || HOME_BY_ROLE[signedIn.role] || '/', { replace: true });
    } catch (err) {
      if (err.code === 'FORBIDDEN') {
        err.message = 'Your account is not active. Recruiter accounts can sign in once a placement admin approves them.';
      }
      setError(err);
      setErrors(err.fields || {});
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-card card">
      <h1>Log in</h1>
      {params.get('expired') && <Notice tone="warning">Your session ended. Please log in again.</Notice>}
      <ErrorBanner error={error} />
      <form onSubmit={onSubmit} noValidate>
        <Field label="Email" error={errors.email}>
          {(p) => <input {...p} type="email" autoComplete="email" value={form.email} onChange={set('email')} onBlur={blurEmail} />}
        </Field>
        <Field label="Password" error={errors.password}>
          {(p) => <input {...p} type="password" autoComplete="current-password" value={form.password} onChange={set('password')} />}
        </Field>
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p className="muted center">New here? <Link to="/register">Create an account</Link></p>
    </section>
  );
}
