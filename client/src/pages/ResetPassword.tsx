import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Sparkles, ArrowRight, ArrowLeft, ShieldCheck } from 'lucide-react';
import './AuthPages.css';

export function ResetPassword() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('This reset link is invalid or missing a token.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'This link may have expired. Please request a new one.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="left-section">
        <Link to="/" className="logo-branding">
          <div className="brand-icon">
            <BookOpen size={24} />
          </div>
          <span>Chidi Okonkwo</span>
        </Link>

        <div className="hero-text-content">
          <h2>
            Set a new <br /> password<span className="underscore">_</span>
          </h2>
          <p className="hero-description">
            Choose a strong new password to secure your account and get back to your library.
          </p>

          <div className="glass-feature-pill">
            <Sparkles size={18} className="sparkle-icon" />
            <span>Use at least 8 characters, mixing letters & numbers</span>
          </div>
        </div>

        <div className="left-footer">
          <p>© {new Date().getFullYear()} Chidi Okonkwo E-Books Platform. All rights reserved.</p>
        </div>
      </div>

      <div className="right-section">
        {success ? (
          <div className="login-form">
            <div className="brand-icon" style={{ marginBottom: '1rem' }}>
              <ShieldCheck size={24} />
            </div>
            <h2>Password updated</h2>
            <p className="form-subtitle">Redirecting you to sign in...</p>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            <h2>Reset password</h2>
            <p className="form-subtitle">Enter a new password for your account.</p>

            {error && <div className="message error">{error}</div>}

            <div className="input-group">
              <label htmlFor="reset-password">New Password</label>
              <input
                id="reset-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <div className="input-group">
              <label htmlFor="reset-confirm-password">Confirm Password</label>
              <input
                id="reset-confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className="btn-signin" disabled={loading}>
              {loading ? 'Updating...' : 'Update password'} <ArrowRight size={18} />
            </button>

            <div className="links">
              <Link to="/login" className="signup-link-btn">
                <ArrowLeft size={14} /> Back to sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}