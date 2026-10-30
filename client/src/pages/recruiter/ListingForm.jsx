import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { ErrorBanner, Field, Loading, PageHeader } from '../../components/ui';
import { toDateInput } from '../../lib/format';
import { parseSkills } from '../../lib/validation';

const EMPTY = { company: '', title: '', location: '', mode: 'ONSITE', stipend: '', skills: '', minCgpa: '', deadline: '' };

export function checkListing(form, now = new Date()) {
  const errors = {};
  if (!form.company.trim()) errors.company = 'Company is required';
  else if (form.company.length > 80) errors.company = 'At most 80 characters';
  if (!form.title.trim()) errors.title = 'Role title is required';
  else if (form.title.length > 80) errors.title = 'At most 80 characters';
  if (!form.location.trim()) errors.location = 'Location is required';
  else if (form.location.length > 60) errors.location = 'At most 60 characters';
  if (form.stipend === '' || Number(form.stipend) < 0) errors.stipend = 'Stipend must be 0 or more';
  const skills = parseSkills(form.skills);
  if (!skills.length) errors.skills = 'Add at least one skill';
  else if (skills.length > 10) errors.skills = 'At most 10 skills';
  else if (skills.some((s) => s.length > 30)) errors.skills = 'Each skill must be at most 30 characters';
  if (form.minCgpa !== '' && (Number(form.minCgpa) < 0 || Number(form.minCgpa) > 10)) errors.minCgpa = 'CGPA must be between 0 and 10';
  if (!form.deadline) errors.deadline = 'Deadline is required';
  else if (new Date(`${form.deadline}T23:59:59`) <= now) errors.deadline = 'Deadline must be in the future';
  return errors;
}

export default function ListingForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [touched, setTouched] = useState({});
  const [serverFields, setServerFields] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(Boolean(id));

  useEffect(() => {
    if (!id) return;
    api.get(`/listings/${id}`).then(({ data }) => {
      const l = data.listing;
      setForm({ company: l.company, title: l.title, location: l.location, mode: l.mode, stipend: String(l.stipend),
        skills: l.skills.join(', '), minCgpa: l.minCgpa ?? '', deadline: toDateInput(l.deadline) });
    }).catch(setError).finally(() => setLoading(false));
  }, [id]);

  const errors = checkListing(form);
  const show = (key) => (touched[key] && errors[key]) || serverFields[key];
  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setServerFields((s) => ({ ...s, [key]: undefined }));
  };
  const blur = (key) => () => setTouched((t) => ({ ...t, [key]: true }));

  async function onSubmit(e) {
    e.preventDefault();
    setTouched(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, true])));
    if (Object.keys(errors).length) return;
    const body = {
      company: form.company.trim(), title: form.title.trim(), location: form.location.trim(), mode: form.mode,
      stipend: Number(form.stipend), skills: parseSkills(form.skills),
      minCgpa: form.minCgpa === '' ? null : Number(form.minCgpa),
      deadline: new Date(`${form.deadline}T23:59:59`).toISOString(),
    };
    setBusy(true);
    setError(null);
    try {
      if (id) await api.patch(`/listings/${id}`, body);
      else await api.post('/listings', body);
      navigate('/recruiter/listings');
    } catch (err) {
      setError(err.code === 'NOT_APPROVED'
        ? Object.assign(err, { message: 'Your account must be approved by a placement admin before you can post.' })
        : err);
      setServerFields(err.fields || {});
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loading />;

  return (
    <section>
      <PageHeader title={id ? 'Edit listing' : 'Post a listing'} />
      <form className="card narrow" onSubmit={onSubmit} noValidate>
        <ErrorBanner error={error} />
        <Field label="Company" error={show('company')}>
          {(p) => <input {...p} maxLength={80} value={form.company} onChange={set('company')} onBlur={blur('company')} />}
        </Field>
        <Field label="Role title" error={show('title')}>
          {(p) => <input {...p} maxLength={80} value={form.title} onChange={set('title')} onBlur={blur('title')} />}
        </Field>
        <div className="field-row">
          <Field label="Location" error={show('location')}>
            {(p) => <input {...p} maxLength={60} value={form.location} onChange={set('location')} onBlur={blur('location')} />}
          </Field>
          <Field label="Mode" error={show('mode')}>
            {(p) => (
              <select {...p} value={form.mode} onChange={set('mode')}>
                <option value="ONSITE">On-site</option>
                <option value="REMOTE">Remote</option>
                <option value="HYBRID">Hybrid</option>
              </select>
            )}
          </Field>
        </div>
        <div className="field-row">
          <Field label="Stipend (₹ per month)" error={show('stipend')} hint="0 if unpaid">
            {(p) => <input {...p} type="number" min="0" value={form.stipend} onChange={set('stipend')} onBlur={blur('stipend')} />}
          </Field>
          <Field label="Minimum CGPA (optional)" error={show('minCgpa')}>
            {(p) => <input {...p} type="number" step="0.01" min="0" max="10" value={form.minCgpa} onChange={set('minCgpa')} onBlur={blur('minCgpa')} />}
          </Field>
        </div>
        <Field label="Required skills" error={show('skills')} hint="Comma separated, 1 to 10">
          {(p) => <input {...p} value={form.skills} onChange={set('skills')} onBlur={blur('skills')} />}
        </Field>
        <Field label="Application deadline" error={show('deadline')}>
          {(p) => <input {...p} type="date" value={form.deadline} onChange={set('deadline')} onBlur={blur('deadline')} />}
        </Field>
        <div className="actions">
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : id ? 'Save changes' : 'Publish listing'}</button>
          <button className="btn btn-secondary" type="button" onClick={() => navigate('/recruiter/listings')}>Cancel</button>
        </div>
      </form>
    </section>
  );
}
