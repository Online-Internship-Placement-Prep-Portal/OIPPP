export const SRN_PATTERN = /^PES[12]UG\d{2}[A-Z]{2}\d{3}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function checkEmail(value) {
  if (!value?.trim()) return 'Email is required';
  return EMAIL_PATTERN.test(value.trim()) ? '' : 'Enter a valid email address';
}

// AUTH-3: names the rule that failed.
export function checkPassword(value) {
  if (!value) return 'Password is required';
  if (value.length < 8) return 'Password must be at least 8 characters';
  if (value.length > 72) return 'Password must be at most 72 characters';
  if (!/[A-Za-z]/.test(value)) return 'Password must contain at least one letter';
  if (!/\d/.test(value)) return 'Password must contain at least one digit';
  return '';
}

export function checkSrn(value) {
  if (!value?.trim()) return 'SRN is required for students';
  return SRN_PATTERN.test(value.trim().toUpperCase()) ? '' : 'SRN must look like PES1UG24CS177';
}

export function checkName(value) {
  const n = value?.trim() || '';
  if (n.length < 2) return 'Name must be at least 2 characters';
  return n.length > 100 ? 'Name must be at most 100 characters' : '';
}

export function validateRegister(form) {
  const errors = {
    name: checkName(form.name),
    email: checkEmail(form.email),
    password: checkPassword(form.password),
    srn: form.role === 'STUDENT' ? checkSrn(form.srn) : '',
  };
  return Object.fromEntries(Object.entries(errors).filter(([, v]) => v));
}

export function checkResumeFile(file) {
  if (!file) return 'Choose a PDF file';
  const isPdf = file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf');
  if (!isPdf) return 'Resume must be a PDF';
  if (file.size > 2 * 1024 * 1024) return 'Resume must be 2 MB or smaller';
  return '';
}

export function parseSkills(text) {
  const seen = new Set();
  return text.split(',').map((s) => s.trim()).filter((s) => {
    const key = s.toLowerCase();
    if (!s || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
