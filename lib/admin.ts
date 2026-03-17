import { Session } from 'next-auth';

function parseAdminEmails(raw: string | undefined): Set<string> {
  const emails = (raw || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return new Set(emails);
}

export function isAdminSession(session: Session | null): boolean {
  const adminEmails = parseAdminEmails(process.env.ADMIN_EMAILS);
  const email = session?.user?.email?.toLowerCase() || '';
  if (!email) return false;
  return adminEmails.has(email);
}

export function assertAdminSession(session: Session | null) {
  if (!isAdminSession(session)) {
    const err = new Error('UNAUTHORIZED_ADMIN');
    (err as any).statusCode = 403;
    throw err;
  }
}

