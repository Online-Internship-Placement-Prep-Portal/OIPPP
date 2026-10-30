import { useEffect, useState } from 'react';
import { fetchBlob } from '../lib/download';
import { ErrorBanner, Loading, Modal } from './ui';

// Fetches the PDF with the auth header, then shows it from a blob URL.
export default function PdfViewer({ url, title = 'Resume', onClose }) {
  const [src, setSrc] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let href;
    let cancelled = false;
    fetchBlob(url)
      .then((blob) => {
        if (cancelled) return;
        href = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        setSrc(href);
      })
      .catch((err) => { if (!cancelled) setError(err); });
    return () => {
      cancelled = true;
      if (href) URL.revokeObjectURL(href);
    };
  }, [url]);

  return (
    <Modal title={title} onClose={onClose} wide>
      <ErrorBanner error={error} />
      {!src && !error && <Loading label="Loading resume…" />}
      {src && (
        <>
          <iframe className="pdf-frame" src={src} title={title} />
          <a className="btn btn-secondary" href={src} download="resume.pdf">Download</a>
        </>
      )}
    </Modal>
  );
}
