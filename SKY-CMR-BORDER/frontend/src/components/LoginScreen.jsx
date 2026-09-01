import React, { useState } from 'react';
import { useCmr } from '../context/CmrContext';

export const LoginScreen = () => {
  const { login } = useCmr();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter both username/email and password.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const result = login(email, password, rememberMe);
      if (!result.success) {
        setError(result.message || 'Invalid username or password.');
        setIsLoading(false);
      }
    }, 400);
  };

  return (
    <div className="login-screen-wrapper">
      <div className="login-backdrop-glow"></div>
      <div className="login-card-container">
        
        {/* BRAND HEADER */}
        <div className="login-brand-header">
          <div className="login-logo-ring">
            <img 
              src="/sky_ariana_logo.jpg" 
              alt="Sky Ariana Limited Logo" 
              className="login-logo-img"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
          <h1 className="login-company-title">SKY ARIANA LIMITED</h1>
          <div className="login-portal-subtitle">INTERNATIONAL FREIGHT • CMR &amp; INVOICE PORTAL</div>
          <div className="login-security-badge">
            <span className="login-sec-icon">🔒</span>
            <span>SECURE TRANSIT GATEWAY</span>
          </div>
        </div>

        {/* ERROR NOTICE */}
        {error && (
          <div className="login-error-banner animate-shake">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        <form onSubmit={handleSubmit} className="login-form" autoComplete="off">
          <div className="login-input-group">
            <label className="login-label">
              <span>USERNAME OR EMAIL</span>
            </label>
            <div className="login-input-wrapper">
              <span className="input-icon">👤</span>
              <input 
                type="text"
                className="login-input"
                placeholder="Enter username or email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                autoFocus
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="login-input-group">
            <label className="login-label">
              <span>PASSWORD</span>
            </label>
            <div className="login-input-wrapper">
              <span className="input-icon">🔑</span>
              <input 
                type={showPassword ? 'text' : 'password'}
                className="login-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                disabled={isLoading}
              />
              <button 
                type="button" 
                className="password-toggle-btn"
                onClick={() => setShowPassword(prev => !prev)}
                title={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

          <div className="login-remember-row">
            <label className="remember-checkbox-label">
              <input 
                type="checkbox" 
                checked={rememberMe} 
                onChange={(e) => setRememberMe(e.target.checked)}
                className="custom-checkbox"
              />
              <span>Remember me on this device</span>
            </label>
          </div>

          <button 
            type="submit" 
            className="login-submit-btn" 
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="btn-loading-flex">
                <span className="spinner-dot"></span> Authenticating...
              </span>
            ) : (
              <span>Sign In to System →</span>
            )}
          </button>
        </form>

        {/* FOOTER METADATA */}
        <div className="login-footer">
          <div>Authorized Personnel &amp; Customs Desk Only</div>
          <div className="login-reg-text">REG: 2401-2198 • KANDAHAR &amp; KABUL TRANSIT OFFICES</div>
        </div>

      </div>
    </div>
  );
};
