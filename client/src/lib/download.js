import { api } from '../api/client';

export async function fetchBlob(url, params) {
  const res = await api.get(url, { params, responseType: 'blob' });
  return res.data;
}

export async function downloadFile(url, filename, params) {
  const blob = await fetchBlob(url, params);
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
