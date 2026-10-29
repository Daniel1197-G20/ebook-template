import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Sparkles, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';
import './AuthPages.css';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFillAdmin = () => {
    setEmail('admin@ebookplatform.com');
    setPassword('Admin123!');
  };

  const handleFillCustomer = () => {
    setEmail('reader@example.com');
    setPassword('Customer123!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedUser = await login(email, password);
      const from = (location.state as { from?: string })?.from;
      if (from) {
        navigate(from);
      } else if (loggedUser.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/books');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
        'Invalid email or password';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Left Section with Gradient & Headline */}
      <div className="left-section">
        <Link to="/" className="logo-branding">
          <div className="brand-icon">
            <BookOpen size={24} />
          </div>
          <span>Chidi Okonkwo</span>
        </Link>

        <div className="hero-text-content">
          <h2>
            Welcome back <br /> to hundreds<span className="underscore">_</span>
          </h2>
          <p className="hero-description">
            Access your purchased digital library, read anywhere, and discover insightful books on engineering, self-growth, and literature.
          </p>

          <div className="glass-feature-pill">
            <Sparkles size={18} className="sparkle-icon" />
            <span>Instant PDF & EPUB downloads upon checkout</span>
          </div>
        </div>

        <div className="left-footer">
          <p>© {new Date().getFullYear()} Chidi Okonkwo E-Books Platform. All rights reserved.</p>
        </div>
      </div>

      {/* Right Section with Dark Glass Form */}
      <div className="right-section">
        <form className="login-form" onSubmit={handleSubmit}>
          <h2>Sign in</h2>
          <p className="form-subtitle">Enter your account details to access your portal.</p>

          {error && <div className="message error">{error}</div>}

          {/* Quick Demo Fill Pills */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleFillAdmin}
              style={{
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                color: '#818cf8',
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <ShieldCheck size={14} /> Quick-Fill Admin
            </button>

            <button
              type="button"
              onClick={handleFillCustomer}
              style={{
                background: 'rgba(52, 211, 153, 0.15)',
                border: '1px solid rgba(52, 211, 153, 0.3)',
                color: '#34d399',
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <UserCheck size={14} /> Quick-Fill Reader
            </button>
          </div>

          <div className="input-group">
            <label htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="input-group">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <Link to="/forgot-password" className="forgot-password-link">
              Forgot password?
            </Link>
          </div>

          <button type="submit" className="btn-signin" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'} <ArrowRight size={18} />
          </button>

          <div className="links">
            <span className="admin-hint">
              <ShieldCheck size={14} /> Admin demo: admin@ebookplatform.com
            </span>
            <Link to="/register" className="signup-link-btn">
              Don't have an account? <strong>Sign up</strong>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}