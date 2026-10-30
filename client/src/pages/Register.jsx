import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { HOME_BY_ROLE, useAuth } from '../auth/AuthContext';
import { ErrorBanner, Field, Notice } from '../components/ui';
import { validateRegister } from '../lib/validation';

const EMPTY = { role: 'STUDENT', name: '', email: '', srn: '', password: '' };

export default function Register() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [touched, setTouched] = useState({});
  const [serverFields, setServerFields] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(false);

  if (user) return <Navigate to={HOME_BY_ROLE[user.role] || '/'} replace />;

  const clientErrors = validateRegister(form);
  const errorFor = (key) => (touched[key] && clientErrors[key]) || serverFields[key];
  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setServerFields((s) => ({ ...s, [key]: undefined }));
  };
  const blur = (key) => () => setTouched((t) => ({ ...t, [key]: true }));

  async function onSubmit(e) {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true, srn: true });
    if (Object.keys(clientErrors).length) return;
    setBusy(true);
    setError(null);
    const body = { name: form.name.trim(), email: form.email.trim(), password: form.password, role: form.role };
    if (form.role === 'STUDENT') body.srn = form.srn.trim().toUpperCase();
    try {
      await api.post('/auth/register', body);
      if (form.role === 'RECRUITER') {
        setPending(true);
      } else {
        const signedIn = await login(body.email, body.password);
        navigate(HOME_BY_ROLE[signedIn.role], { replace: true });
      }
    } catch (err) {
      setError(err);
      setServerFields(err.fields || {});
    } finally {
      setBusy(false);
    }
  }

  if (pending) {
    return (
      <section className="auth-card card">
        <h1>Registration received</h1>
        <Notice>
          Your recruiter account is waiting for approval by the placement office. You will get an email when
          it is approved, and then you can log in and post internships.
        </Notice>
        <Link className="btn btn-primary btn-block" to="/login">Back to log in</Link>
      </section>
    );
  }

  return (
    <section className="auth-card card">
      <h1>Create an account</h1>
      <ErrorBanner error={error} />
      <form onSubmit={onSubmit} noValidate>
        <fieldset className="role-choice">
          <legend>I am a</legend>
          {[['STUDENT', 'Student'], ['RECRUITER', 'Recruiter']].map(([value, label]) => (
            <label key={value} className={form.role === value ? 'selected' : ''}>
              <input type="radio" name="role" value={value} checked={form.role === value} onChange={set('role')} />
              {label}
            </label>
          ))}
        </fieldset>
        <Field label="Full name" error={errorFor('name')}>
          {(p) => <input {...p} autoComplete="name" value={form.name} onChange={set('name')} onBlur={blur('name')} />}
        </Field>
        <Field label={form.role === 'STUDENT' ? 'Institutional email' : 'Work email'} error={errorFor('email')}>
          {(p) => <input {...p} type="email" autoComplete="email" value={form.email} onChange={set('email')} onBlur={blur('email')} />}
        </Field>
        {form.role === 'STUDENT' && (
          <Field label="SRN" error={errorFor('srn')} hint="For example PES1UG24CS177">
            {(p) => (
              <input {...p} value={form.srn} maxLength={13} autoCapitalize="characters"
                onChange={set('srn')} onBlur={blur('srn')} />
            )}
          </Field>
        )}
        <Field label="Password" error={errorFor('password')} hint="At least 8 characters, with a letter and a digit">
          {(p) => (
            <input {...p} type="password" autoComplete="new-password" value={form.password}
              onChange={set('password')} onBlur={blur('password')} />
          )}
        </Field>
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="muted center">Already registered? <Link to="/login">Log in</Link></p>
    </section>
  );
}
