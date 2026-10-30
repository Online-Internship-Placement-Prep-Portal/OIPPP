import axios from 'axios';

const TOKEN_KEY = 'oippp.token';
const USER_KEY = 'oippp.user';

function read(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

export const session = {
  get token() { return read(TOKEN_KEY); },
  get user() {
    try { return JSON.parse(read(USER_KEY)); } catch { return null; }
  },
  save(token, user) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch { /* storage blocked: the session lasts for this page only */ }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch { /* nothing stored */ }
  },
};

const FALLBACK = {
  ACCOUNT_LOCKED: 'Too many failed logins. Try again later.',
  RATE_LIMITED: 'Too many requests. Please wait a minute and try again.',
  NETWORK: 'Cannot reach the server. Check your connection and try again.',
  INTERNAL: 'Something went wrong on the server. Please try again.',
};

export class ApiError extends Error {
  constructor({ status, code, message, details = [] }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  // Field errors keyed by field name, for messages under each input.
  get fields() {
    const out = {};
    for (const d of this.details) if (d.field && !out[d.field]) out[d.field] = d.message;
    return out;
  }
}

function readBlobText(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

export async function toApiError(error) {
  if (error instanceof ApiError) return error;
  const res = error?.response;
  if (!res) return new ApiError({ status: 0, code: 'NETWORK', message: FALLBACK.NETWORK });
  let body = res.data;
  if (typeof Blob !== 'undefined' && body instanceof Blob) {
    try { body = JSON.parse(await readBlobText(body)); } catch { body = null; }
  }
  const err = body?.error;
  const code = err?.code || (res.status >= 500 ? 'INTERNAL' : `HTTP_${res.status}`);
  let message = err?.message || FALLBACK[code] || `Request failed (${res.status})`;
  if (code === 'ACCOUNT_LOCKED') {
    const retryAt = err?.details?.find((d) => d.field === 'retryAt')?.message;
    if (retryAt) {
      message = `Account locked after 5 failed logins. Try again after ${new Date(retryAt).toLocaleTimeString()}.`;
    }
  }
  if (code === 'INTERNAL' && err?.requestId) message = `${FALLBACK.INTERNAL} (ref ${err.requestId})`;
  return new ApiError({ status: res.status, code, message, details: err?.details || [] });
}

let onUnauthorized = () => {};
export function setUnauthorizedHandler(fn) { onUnauthorized = fn; }

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

api.interceptors.request.use((config) => {
  const token = session.token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function handleResponseError(error) {
  const apiError = await toApiError(error);
  // A 401 on a request that carried a token means the session is no longer valid.
  if (apiError.status === 401 && error?.config?.headers?.Authorization) {
    session.clear();
    onUnauthorized();
  }
  throw apiError;
}

api.interceptors.response.use((res) => res, handleResponseError);
