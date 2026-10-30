import { useState } from 'react';
import { api } from '../../api/client';
import { ErrorBanner, Loading, Notice, PageHeader } from '../../components/ui';
import { useApi } from '../../lib/useApi';

export default function Settings() {
  const { data, error, loading, setData } = useApi('/admin/settings');
  const [saveError, setSaveError] = useState(null);
  const [saved, setSaved] = useState('');
  const [busy, setBusy] = useState(false);
  const settings = data?.settings || data;

  async function toggle() {
    const next = !settings.oneOfferPolicy;
    setBusy(true);
    setSaveError(null);
    setSaved('');
    try {
      const res = await api.patch('/admin/settings', { oneOfferPolicy: next });
      setData(res.data);
      setSaved(next ? 'One-offer policy is on.' : 'One-offer policy is off.');
    } catch (err) {
      setSaveError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <PageHeader title="Settings" />
      {loading && <Loading />}
      <ErrorBanner error={error || saveError} />
      {saved && <Notice tone="success">{saved}</Notice>}
      {settings && (
        <article className="card narrow">
          <h2>One-offer policy</h2>
          <p className="muted">
            When on, a student who holds an offer cannot submit new applications (DOM-2). Existing applications are not changed.
          </p>
          <label className="switch">
            <input type="checkbox" role="switch" checked={Boolean(settings.oneOfferPolicy)} disabled={busy} onChange={toggle} />
            <span>{settings.oneOfferPolicy ? 'On' : 'Off'}</span>
          </label>
        </article>
      )}
    </section>
  );
}
