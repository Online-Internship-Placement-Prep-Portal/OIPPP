import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { ErrorBanner, Field, Loading, Notice, PageHeader } from '../../components/ui';
import { downloadFile } from '../../lib/download';
import { formatDateTime } from '../../lib/format';
import { checkResumeFile, parseSkills } from '../../lib/validation';

function checkProfile(form) {
  const errors = {};
  const cgpa = Number(form.cgpa);
  if (form.cgpa !== '' && (Number.isNaN(cgpa) || cgpa < 0 || cgpa > 10)) errors.cgpa = 'CGPA must be between 0.00 and 10.00';
  const year = Number(form.gradYear);
  if (form.gradYear !== '' && (!Number.isInteger(year) || year < 2000 || year > 2100)) errors.gradYear = 'Enter a year between 2000 and 2100';
  if (form.branch.length > 100) errors.branch = 'Branch must be at most 100 characters';
  const skills = parseSkills(form.skills);
  if (skills.length > 20) errors.skills = 'Up to 20 skills';
  else if (skills.some((s) => s.length > 30)) errors.skills = 'Each skill must be at most 30 characters';
  return errors;
}

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ branch: '', cgpa: '', gradYear: '', skills: '' });
  const [touched, setTouched] = useState({});
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [uploadMsg, setUploadMsg] = useState('');
  const [uploadError, setUploadError] = useState(null);

  useEffect(() => {
    api.get('/profile/me').then(({ data }) => {
      const p = data.profile || {};
      setProfile(p);
      setForm({ branch: p.branch || '', cgpa: p.cgpa ?? '', gradYear: p.gradYear ?? '', skills: (p.skills || []).join(', ') });
    }).catch(setError);
  }, []);

  const errors = checkProfile(form);
  const show = (key) => touched[key] && errors[key];
  const set = (key) => (e) => { setSaved(false); setForm((f) => ({ ...f, [key]: e.target.value })); };
  const blur = (key) => () => setTouched((t) => ({ ...t, [key]: true }));

  async function onSave(e) {
    e.preventDefault();
    setTouched({ branch: true, cgpa: true, gradYear: true, skills: true });
    if (Object.keys(errors).length) return;
    const body = { branch: form.branch.trim(), skills: parseSkills(form.skills) };
    if (form.cgpa !== '') body.cgpa = Number(form.cgpa);
    if (form.gradYear !== '') body.gradYear = Number(form.gradYear);
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.put('/profile/me', body);
      setProfile(data.profile);
      setSaved(true);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  function pickFile(e) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setUploadMsg('');
    setUploadError(null);
    setFileError(f ? checkResumeFile(f) : '');
  }

  async function onUpload(e) {
    e.preventDefault();
    const problem = checkResumeFile(file);
    setFileError(problem);
    if (problem) return;
    const body = new FormData();
    body.append('resume', file);
    setUploadError(null);
    try {
      const { data } = await api.post('/profile/me/resume', body);
      setProfile((p) => ({ ...p, resumeFileId: data.resumeFileId, resumeUploadedAt: new Date().toISOString() }));
      setUploadMsg(data.message || 'Resume uploaded');
      setFile(null);
      e.target.reset();
    } catch (err) {
      setUploadError(err);
    }
  }

  async function onDownload() {
    setUploadError(null);
    try {
      await downloadFile('/profile/me/resume', 'resume.pdf');
    } catch (err) {
      setUploadError(err);
    }
  }

  if (!profile && !error) return <Loading />;

  return (
    <section>
      <PageHeader title="My profile" subtitle={`${user.name} · ${user.email}`} />
      <div className="grid-2">
        <form className="card" onSubmit={onSave} noValidate>
          <h2>Academic details</h2>
          <ErrorBanner error={error} />
          {saved && <Notice tone="success">Profile saved.</Notice>}
          <Field label="Branch" error={show('branch')} hint="For example CSE, ECE">
            {(p) => <input {...p} value={form.branch} onChange={set('branch')} onBlur={blur('branch')} />}
          </Field>
          <div className="field-row">
            <Field label="CGPA" error={show('cgpa')}>
              {(p) => <input {...p} type="number" step="0.01" min="0" max="10" value={form.cgpa} onChange={set('cgpa')} onBlur={blur('cgpa')} />}
            </Field>
            <Field label="Graduation year" error={show('gradYear')}>
              {(p) => <input {...p} type="number" min="2000" max="2100" value={form.gradYear} onChange={set('gradYear')} onBlur={blur('gradYear')} />}
            </Field>
          </div>
          <Field label="Skills" error={show('skills')} hint={`Comma separated, up to 20 (${parseSkills(form.skills).length}/20)`}>
            {(p) => <input {...p} value={form.skills} onChange={set('skills')} onBlur={blur('skills')} />}
          </Field>
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
        </form>

        <form className="card" onSubmit={onUpload} noValidate>
          <h2>Resume</h2>
          <ErrorBanner error={uploadError} />
          {uploadMsg && <Notice tone="success">{uploadMsg}</Notice>}
          <p className="muted">
            {profile?.resumeFileId
              ? `A resume is on file${profile.resumeUploadedAt ? ` (uploaded ${formatDateTime(profile.resumeUploadedAt)})` : ''}. Uploading again replaces it; applications keep the resume they were sent with.`
              : 'No resume uploaded yet. You need one to apply.'}
          </p>
          <Field label="PDF file, up to 2 MB" error={fileError}>
            {(p) => <input {...p} type="file" accept="application/pdf,.pdf" onChange={pickFile} />}
          </Field>
          <div className="actions">
            <button className="btn btn-primary" type="submit" disabled={!file || Boolean(fileError)}>Upload</button>
            {profile?.resumeFileId && <button className="btn btn-secondary" type="button" onClick={onDownload}>Download current</button>}
          </div>
        </form>
      </div>
    </section>
  );
}
