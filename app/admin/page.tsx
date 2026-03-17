'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

type AdminUserRow = {
  id: string;
  email: string;
  name: string | null;
  userType: 'trial' | 'paid';
  tokenLimit: number;
  tokensUsed: number;
  subscriptionStatus: 'active' | 'expired' | 'cancelled' | null;
  subscriptionExpiresAt: string | null;
  paymentId: string | null;
  createdAt: string;
};

export default function AdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);

  const canLoad = useMemo(() => status === 'authenticated' && !!session?.user?.email, [status, session]);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/auth/signin');
  }, [status, router]);

  useEffect(() => {
    if (!canLoad) return;
    (async () => {
      try {
        const res = await fetch('/api/admin/me');
        const data = await res.json();
        setIsAdmin(!!data?.isAdmin);
      } catch {
        setIsAdmin(false);
      }
    })();
  }, [canLoad]);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/list?q=${encodeURIComponent(query)}&limit=50&offset=0`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || 'Failed to load users');
      setUsers(data.users || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin]);

  const revokePaid = async (userId: string) => {
    if (!confirm('Revoke paid access for this user?')) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users/revoke-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, resetTokenLimitToTrial: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || 'Failed');
      await loadUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const cancelSubscription = async (userId: string) => {
    if (!confirm('Cancel subscription in Stripe (cancel at period end)?')) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, cancelNow: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || 'Failed');
      await loadUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const refund = async () => {
    const invoiceIdOrPi = prompt('Enter Stripe invoice id (in_...) or payment_intent id (pi_...):');
    if (!invoiceIdOrPi) return;
    const payload =
      invoiceIdOrPi.startsWith('in_')
        ? { invoiceId: invoiceIdOrPi, reason: 'requested_by_customer' as const }
        : { paymentIntentId: invoiceIdOrPi, reason: 'requested_by_customer' as const };

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || 'Refund failed');
      alert(`Refund created: ${data?.refund?.id || 'OK'}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Refund failed');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || isAdmin === null) {
    return (
      <main className="container" style={{ paddingTop: 'var(--spacing-xl)' }}>
        <div>Loading…</div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="container" style={{ paddingTop: 'var(--spacing-xl)' }}>
        <h2 style={{ marginTop: 0 }}>Admin</h2>
        <div className="card">
          <p style={{ margin: 0 }}>You don’t have admin access.</p>
          <p style={{ marginTop: 'var(--spacing-sm)', color: 'var(--color-text-secondary)' }}>
            Set `ADMIN_EMAILS` in your environment to a comma-separated list of admin emails.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="container" style={{ paddingTop: 'var(--spacing-xl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 'var(--spacing-xs)' }}>Admin</h2>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
            Manage paid members and refunds
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="outline" onClick={() => router.push('/')}>
            Back to app
          </button>
          <button className="outline" onClick={refund}>
            Create refund…
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 'var(--spacing-lg)' }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by email or name…"
            style={{ flex: 1, minWidth: '240px' }}
          />
          <button onClick={loadUsers} disabled={loading}>
            {loading ? 'Loading…' : 'Search'}
          </button>
        </div>

        {error && (
          <div style={{ marginTop: 'var(--spacing-md)', color: 'var(--color-error)' }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: 'var(--spacing-lg)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '0.5rem' }}>User</th>
                <th style={{ padding: '0.5rem' }}>Type</th>
                <th style={{ padding: '0.5rem' }}>Subscription</th>
                <th style={{ padding: '0.5rem' }}>Tokens</th>
                <th style={{ padding: '0.5rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.5rem' }}>
                    <div style={{ fontWeight: 600 }}>{u.email}</div>
                    {u.name && <div style={{ color: 'var(--color-text-secondary)' }}>{u.name}</div>}
                    <div style={{ color: 'var(--color-text-tertiary)', fontSize: '0.75rem' }}>{u.id}</div>
                  </td>
                  <td style={{ padding: '0.5rem' }}>{u.userType}</td>
                  <td style={{ padding: '0.5rem' }}>
                    <div>{u.subscriptionStatus || '—'}</div>
                    {u.subscriptionExpiresAt && (
                      <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>
                        expires {new Date(u.subscriptionExpiresAt).toLocaleString()}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <div>
                      used {u.tokensUsed.toLocaleString()} / limit {u.tokenLimit.toLocaleString()}
                    </div>
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button className="outline" onClick={() => cancelSubscription(u.id)} disabled={loading}>
                        Cancel (Stripe)
                      </button>
                      <button
                        onClick={() => revokePaid(u.id)}
                        disabled={loading}
                        style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-error)' }}
                      >
                        Revoke paid
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '0.75rem', color: 'var(--color-text-secondary)' }}>
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

