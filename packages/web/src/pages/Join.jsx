import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';

export default function Join() {
  const [searchParams] = useSearchParams();
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState('group'); // 'group' | 'auth' | 'magic-sent' | 'create' | 'create-auth'
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [groupInfo, setGroupInfo] = useState(null);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If user is already logged in and has a code, try to join
  useEffect(() => {
    const initialCode = searchParams.get('code');
    if (initialCode && user) {
      handleJoinWithCode(initialCode.toUpperCase());
    } else if (initialCode) {
      fetchGroupInfo(initialCode.toUpperCase());
    }
  }, [user]);

  async function fetchGroupInfo(c) {
    try {
      const data = await api.get(`/groups/${c}`);
      setGroupInfo(data);
      setCode(c);
    } catch {
      // ignore — group might not exist
    }
  }

  async function handleJoinWithCode(c) {
    setLoading(true);
    setError('');
    try {
      const data = await api.post(`/groups/${c}/join`);
      navigate(`/g/${data.group.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLookupCode(e) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.get(`/groups/${code.trim().toUpperCase()}`);
      setGroupInfo(data);
      setStep('auth');
    } catch (err) {
      setError('Group code not found.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestMagicLink(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/request-magic-link', {
        email: email.trim().toLowerCase(),
        displayName: displayName.trim() || undefined,
        redirectTo: code || undefined,
      });
      setStep('magic-sent');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateGroup(e) {
    e.preventDefault();
    if (!groupName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.post('/groups', { name: groupName.trim() });
      navigate(`/g/${data.group.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // If logged in and already in a group, go straight there
  if (user && user.groups?.length && !searchParams.get('code')) {
    return <Navigate to={`/g/${user.groups[0].id}`} replace />;
  }

  // If logged in with no code, show dashboard redirect or create group
  if (user && !searchParams.get('code')) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <div className="text-5xl mb-3">⚽</div>
            <h1 className="text-3xl font-extrabold text-pitch-light">Chutômetro</h1>
            <p className="text-muted mt-1">Hello, {user.displayName}!</p>
          </div>

          <div className="card p-6 space-y-4">
            <h2 className="font-bold text-lg">Join a group</h2>
            <form
              onSubmit={(e) => { e.preventDefault(); handleJoinWithCode(code.trim().toUpperCase()); }}
              className="space-y-3"
            >
              <input
                type="text"
                className="input uppercase tracking-widest font-mono text-center text-lg"
                placeholder="CODE"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={6}
              />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button type="submit" disabled={loading || code.trim().length < 6} className="btn-primary w-full">
                {loading ? 'Joining...' : 'Join Group'}
              </button>
            </form>
          </div>

          <div className="card p-6 space-y-4">
            <h2 className="font-bold text-lg">Create a new group</h2>
            <form onSubmit={handleCreateGroup} className="space-y-3">
              <input
                type="text"
                className="input"
                placeholder="Your Bolão name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
              <button type="submit" disabled={loading || !groupName.trim()} className="btn-primary w-full">
                {loading ? 'Creating...' : 'Create Bolão'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="text-5xl mb-3">⚽</div>
          <h1 className="text-3xl font-extrabold text-pitch-light">Chutômetro</h1>
          <p className="text-muted mt-1 text-sm">World Cup 2026 Bolão</p>
        </div>

        {step === 'group' && (
          <div className="card p-6 space-y-4">
            <h2 className="font-bold text-lg">Join the Bolão</h2>
            <form onSubmit={handleLookupCode} className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">Group code</label>
                <input
                  type="text"
                  className="input uppercase tracking-widest font-mono text-center text-xl"
                  placeholder="XXXXXX"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  autoFocus
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading || code.length < 6}
                className="btn-primary w-full"
              >
                {loading ? 'Looking up...' : 'Continue'}
              </button>
            </form>
            <div className="border-t border-navy-border pt-4 text-center">
              <p className="text-muted text-xs mb-3">Want to create your own Bolão?</p>
              <button
                onClick={() => { setStep('create-auth'); setError(''); }}
                className="btn-secondary w-full"
              >
                Create new Bolão
              </button>
            </div>
          </div>
        )}

        {step === 'create-auth' && (
          <div className="card p-6 space-y-4">
            <h2 className="font-bold text-lg">Create new Bolão</h2>
            <p className="text-muted text-sm">Enter your email to get started.</p>
            <form onSubmit={handleRequestMagicLink} className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">Your name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="What should we call you?"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">Email</label>
                <input
                  type="email"
                  className="input"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="btn-primary w-full"
              >
                {loading ? 'Sending...' : 'Send access link'}
              </button>
            </form>
            <button
              onClick={() => { setStep('group'); setError(''); }}
              className="text-muted text-xs hover:text-white w-full text-center"
            >
              Back
            </button>
          </div>
        )}

        {step === 'auth' && groupInfo && (
          <div className="card p-6 space-y-4">
            <div className="text-center">
              <p className="text-muted text-sm">Joining</p>
              <p className="font-bold text-xl text-pitch-light">{groupInfo.group.name}</p>
              <p className="text-xs text-muted">{groupInfo.memberCount} members</p>
            </div>
            <hr className="border-navy-border" />
            <h2 className="font-bold">Access via email</h2>
            <form onSubmit={handleRequestMagicLink} className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">Display name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="What should we call you?"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">Email</label>
                <input
                  type="email"
                  className="input"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="btn-primary w-full"
              >
                {loading ? 'Sending...' : 'Send access link'}
              </button>
            </form>
            <button
              onClick={() => { setStep('group'); setError(''); }}
              className="text-muted text-xs hover:text-white w-full text-center"
            >
              Back
            </button>
          </div>
        )}

        {step === 'magic-sent' && (
          <div className="card p-8 text-center space-y-4">
            <div className="text-5xl">📧</div>
            <h2 className="font-bold text-xl">Check your email</h2>
            <p className="text-muted text-sm">
              We sent a magic link to <span className="text-white font-medium">{email}</span>.
              Click it to sign in — the link expires in 15 minutes.
            </p>
            <p className="text-xs text-muted italic">
              In dev mode, the link appears in the API console.
            </p>
            <button
              onClick={() => setStep('auth')}
              className="text-pitch-light text-sm hover:underline"
            >
              Resend link
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
