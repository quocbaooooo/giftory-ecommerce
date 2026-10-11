import { AbstractControl, ValidationErrors } from '@angular/forms';
export function safeReturnUrl(value: unknown, admin = false): string {
  const fallback = admin ? '/admin/dashboard' : '/';
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)) return fallback;
  let decoded: string;
  try { decoded = decodeURIComponent(value); } catch { return fallback; }
  if (decoded.startsWith('//') || /[\\\u0000-\u0020]/.test(decoded)) return fallback;
  const path = decoded.split(/[?#;]/)[0];
  if (/^\/(login|register|forgot-password|reset-password)(\/|$)/.test(path) || (!admin && /^\/admin(\/|$)/.test(path))) return fallback;
  return value;
}
export function passwordPolicy(control: AbstractControl): ValidationErrors | null {
  const value = control.value || '';
  return value.length >= 8 && new TextEncoder().encode(value).length <= 72 && /\S/.test(value) ? null : { passwordPolicy: true };
}
export function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  return control.get('password')?.value === control.get('confirmPassword')?.value ? null : { passwordMismatch: true };
}
