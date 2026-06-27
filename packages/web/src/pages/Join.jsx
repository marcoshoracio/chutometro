import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';

// step: 'landing' | 'login' | 'register' | 'join-code' | 'create-group'
export default function Join() {
  const [searchParams] = useSearchParams();
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState('landing');
  const [form, setForm] = useState({ email: '', password: '', displayName: '', code: searchParams.get('code') || '', groupName: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-redirect if already logged in
  useEffect(() => {
    if (!user) return;
    const code = searchParams.get('code');
    if (code) {
      handleJoinWithCode(code.toUpperCase());
    } else if (user.groups?.length) {
      navigate(`/g/${user.groups[0].id}`, { replace: true });
    } else {
      setStep('join-code');
    }
  }, [user]);

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
    setError('');
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await api.post('/auth/login', { email: form.email, password: form.password });
      login(data.token, { ...data.user, groups: data.groups });
      // useEffect above will handle redirect
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await api.post('/auth/register', {
        email: form.email,
        password: form.password,
        displayName: form.displayName,
      });
      login(data.token, { ...data.user, groups: data.groups });
      // useEffect above will handle redirect
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email: form.email });
      setStep('forgot-sent');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinWithCode(code) {
    setLoading(true);
    setError('');
    try {
      const data = await api.post(`/groups/${code}/join`);
      navigate(`/g/${data.group.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  async function handleCreateGroup(e) {
    e.preventDefault();
    if (!form.groupName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.post('/groups', { name: form.groupName.trim() });
      navigate(`/g/${data.group.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Already logged in and in a group — redirect handled by useEffect
  if (user && user.groups?.length && !searchParams.get('code')) {
    return <Navigate to={`/g/${user.groups[0].id}`} replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-6">

        {/* Logo */}
        <div className="text-center">
          <div className="text-5xl mb-3">⚽</div>
          <h1 className="text-3xl font-extrabold text-pitch-light">Chutômetro</h1>
          <p className="text-muted mt-1 text-sm">World Cup 2026 Prediction Bolão</p>
        </div>

        {/* Landing */}
        {step === 'landing' && (
          <div className="space-y-3">
            <button onClick={() => setStep('login')} className="btn-primary w-full text-base py-3">
              Log In
            </button>
            <button onClick={() => setStep('register')} className="btn-secondary w-full text-base py-3">
              Create Account
            </button>
          </div>
        )}

        {/* Login */}
        {step === 'login' && (
          <div className="card p-6 space-y-4">
            <h2 className="font-bold text-lg">Log In</h2>
            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">Email</label>
                <input
                  type="email"
                  className="input"
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">Password</label>
                <input
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Logging in…' : 'Log In'}
              </button>
            </form>
            <p className="text-center text-xs text-muted">
              <button onClick={() => { setStep('forgot-password'); setError(''); }} className="text-pitch-light hover:underline">
                Forgot password?
              </button>
            </p>
            <p className="text-center text-xs text-muted">
              No account?{' '}
              <button onClick={() => { setStep('register'); setError(''); }} className="text-pitch-light hover:underline">
                Create one
              </button>
            </p>
            <button onClick={() => { setStep('landing'); setError(''); }} className="text-muted text-xs hover:text-white w-full text-center">
              ← Back
            </button>
          </div>
        )}

        {/* Register */}
        {step === 'register' && (
          <div className="card p-6 space-y-4">
            <h2 className="font-bold text-lg">Create Account</h2>
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">Your name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="How should we call you?"
                  value={form.displayName}
                  onChange={e => set('displayName', e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">Email</label>
                <input
                  type="email"
                  className="input"
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">Password</label>
                <input
                  type="password"
                  className="input"
                  placeholder="At least 6 characters"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
            </form>
            <p className="text-center text-xs text-muted">
              Already have an account?{' '}
              <button onClick={() => { setStep('login'); setError(''); }} className="text-pitch-light hover:underline">
                Log in
              </button>
            </p>
            <button onClick={() => { setStep('landing'); setError(''); }} className="text-muted text-xs hover:text-white w-full text-center">
              ← Back
            </button>
          </div>
        )}

        {/* Forgot password */}
        {step === 'forgot-password' && (
          <div className="card p-6 space-y-4">
            <h2 className="font-bold text-lg">Reset Password</h2>
            <p className="text-muted text-sm">Enter your email and we'll send you a reset link.</p>
            <form onSubmit={handleForgotPassword} className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">Email</label>
                <input
                  type="email"
                  className="input"
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  required
                  autoFocus
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>
            <button onClick={() => { setStep('login'); setError(''); }} className="text-muted text-xs hover:text-white w-full text-center">
              ← Back to Log In
            </button>
          </div>
        )}

        {/* Forgot password — email sent */}
        {step === 'forgot-sent' && (
          <div className="card p-6 space-y-4 text-center">
            <div className="text-4xl">📧</div>
            <h2 className="font-bold text-lg">Check your email</h2>
            <p className="text-muted text-sm">
              If an account exists for <strong className="text-white">{form.email}</strong>, you'll receive a password reset link shortly. The link expires in 1 hour.
            </p>
            <button onClick={() => { setStep('login'); setError(''); }} className="btn-secondary w-full">
              Back to Log In
            </button>
          </div>
        )}

        {/* Join with code (logged in, no group yet) */}
        {step === 'join-code' && (
          <div className="space-y-4">
            <div className="card p-6 space-y-4">
              <h2 className="font-bold text-lg">Join a Bolão</h2>
              <p className="text-muted text-sm">Enter the invite code you received.</p>
              <form onSubmit={e => { e.preventDefault(); handleJoinWithCode(form.code.trim().toUpperCase()); }} className="space-y-3">
                <input
                  type="text"
                  className="input uppercase tracking-widest font-mono text-center text-xl"
                  placeholder="XXXXXX"
                  value={form.code}
                  onChange={e => set('code', e.target.value.toUpperCase())}
                  maxLength={6}
                  autoFocus
                />
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button type="submit" disabled={loading || form.code.trim().length < 6} className="btn-primary w-full">
                  {loading ? 'Joining…' : 'Join Bolão'}
                </button>
              </form>
            </div>

            <div className="card p-6 space-y-4">
              <h2 className="font-bold text-lg">Create a new Bolão</h2>
              <form onSubmit={handleCreateGroup} className="space-y-3">
                <input
                  type="text"
                  className="input"
                  placeholder="Name your Bolão"
                  value={form.groupName}
                  onChange={e => set('groupName', e.target.value)}
                />
                <button type="submit" disabled={loading || !form.groupName.trim()} className="btn-primary w-full">
                  {loading ? 'Creating…' : 'Create Bolão'}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
