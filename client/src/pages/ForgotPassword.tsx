import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Sparkles, ArrowRight, ArrowLeft, MailCheck } from 'lucide-react';
import './AuthPages.css';

export function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Something went wrong. Please try again.';
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
            Forgot your <br /> password<span className="underscore">_</span>
          </h2>
          <p className="hero-description">
            No worries. Enter the email address linked to your account and we'll send you a link to reset it.
          </p>

          <div className="glass-feature-pill">
            <Sparkles size={18} className="sparkle-icon" />
            <span>Reset links expire after 1 hour for your security</span>
          </div>
        </div>

        <div className="left-footer">
          <p>© {new Date().getFullYear()} Chidi Okonkwo E-Books Platform. All rights reserved.</p>
        </div>
      </div>

      <div className="right-section">
        {sent ? (
          <div className="login-form">
            <div className="brand-icon" style={{ marginBottom: '1rem' }}>
              <MailCheck size={24} />
            </div>
            <h2>Check your email</h2>
            <p className="form-subtitle">
              If an account exists for <strong>{email}</strong>, we've sent a password reset link to it.
            </p>

            <Link to="/login" className="btn-signin" style={{ textDecoration: 'none', justifyContent: 'center' }}>
              <ArrowLeft size={18} /> Back to sign in
            </Link>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            <h2>Forgot password</h2>
            <p className="form-subtitle">Enter your email and we'll send you a reset link.</p>

            {error && <div className="message error">{error}</div>}

            <div className="input-group">
              <label htmlFor="forgot-email">Email Address</label>
              <input
                id="forgot-email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <button type="submit" className="btn-signin" disabled={loading}>
              {loading ? 'Sending link...' : 'Send reset link'} <ArrowRight size={18} />
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