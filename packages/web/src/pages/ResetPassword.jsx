import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card p-6 text-center space-y-4 max-w-sm w-full">
          <div className="text-4xl">⚠️</div>
          <p className="text-muted">Invalid reset link. Please request a new one.</p>
          <button onClick={() => navigate('/join')} className="btn-secondary w-full">Back to Log In</button>
        </div>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await api.post('/auth/reset-password', { token, password });
      login(data.token, { ...data.user, groups: data.groups });
      setDone(true);
      setTimeout(() => {
        if (data.groups?.length) navigate(`/g/${data.groups[0].id}`, { replace: true });
        else navigate('/join', { replace: true });
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="text-5xl mb-3">⚽</div>
          <h1 className="text-3xl font-extrabold text-pitch-light">Chutômetro</h1>
        </div>

        {done ? (
          <div className="card p-6 text-center space-y-3">
            <div className="text-4xl">✅</div>
            <p className="font-semibold">Password updated!</p>
            <p className="text-muted text-sm">Redirecting you now…</p>
          </div>
        ) : (
          <div className="card p-6 space-y-4">
            <h2 className="font-bold text-lg">Set New Password</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">New password</label>
                <input
                  type="password"
                  className="input"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  required
                  minLength={6}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">Confirm password</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Repeat your new password"
                  value={confirm}
                  onChange={e => { setConfirm(e.target.value); setError(''); }}
                  required
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Saving…' : 'Update Password'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
