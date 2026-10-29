import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

interface AdminRouteProps {
  children: ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading, isAdmin, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div className="spinner" style={{
            width: '36px',
            height: '36px',
            border: '3px solid var(--color-border)',
            borderTopColor: 'var(--color-accent)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>Verifying admin credentials...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!isAdmin) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center', maxWidth: '540px' }}>
        <div style={{
          display: 'inline-flex',
          padding: '1.25rem',
          borderRadius: '50%',
          backgroundColor: 'var(--color-error-bg)',
          color: 'var(--color-error)',
          marginBottom: '1.5rem'
        }}>
          <ShieldAlert size={48} />
        </div>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>Access Denied</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem', lineHeight: '1.6' }}>
          The path <code style={{ background: 'var(--color-surface-hover)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>{location.pathname}</code> is restricted to platform administrators only. You are signed in as <strong>{user?.email}</strong>.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <a href="/" style={{ padding: '0.6rem 1.2rem', background: 'var(--color-primary)', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>
            Return Home
          </a>
          <a href="/login" style={{ padding: '0.6rem 1.2rem', background: 'var(--color-surface-hover)', color: 'var(--color-text)', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>
            Switch Account
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
