import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';

export default function Groups() {
  const { user, reload, logout } = useAuth();
  const navigate = useNavigate();

  const [code, setCode] = useState('');
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');
  const [showJoin, setShowJoin] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  async function handleJoin(e) {
    e.preventDefault();
    setLoading('join');
    setError('');
    try {
      const data = await api.post(`/groups/${code.trim().toUpperCase()}/join`);
      await reload();
      navigate(`/g/${data.group.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading('');
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!groupName.trim()) return;
    setLoading('create');
    setError('');
    try {
      const data = await api.post('/groups', { name: groupName.trim() });
      await reload();
      navigate(`/g/${data.group.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading('');
    }
  }

  function handleLogout() {
    logout();
    navigate('/join');
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-6">

        {/* Header */}
        <div className="text-center">
          <div className="text-5xl mb-3">⚽</div>
          <h1 className="text-3xl font-extrabold text-pitch-light">Chutômetro</h1>
          <p className="text-muted mt-1 text-sm">Hey, {user?.displayName}</p>
        </div>

        {/* Bolão list */}
        {user?.groups?.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-navy-border">
              <h2 className="font-semibold text-sm text-muted uppercase tracking-wide">Your Bolões</h2>
            </div>
            <div className="divide-y divide-navy-border">
              {user.groups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => navigate(`/g/${g.id}`)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-navy-border transition-colors text-left"
                >
                  <span className="font-medium">{g.name}</span>
                  <span className="text-muted text-lg">→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Join a Bolão */}
        <div className="card overflow-hidden">
          <button
            onClick={() => { setShowJoin(!showJoin); setShowCreate(false); setError(''); }}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-navy-border transition-colors"
          >
            <span className="font-medium">Join a Bolão</span>
            <span className="text-muted">{showJoin ? '▲' : '▼'}</span>
          </button>
          {showJoin && (
            <div className="px-4 pb-4 border-t border-navy-border pt-3">
              <form onSubmit={handleJoin} className="space-y-3">
                <input
                  type="text"
                  className="input uppercase tracking-widest font-mono text-center text-xl"
                  placeholder="XXXXXX"
                  value={code}
                  onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }}
                  maxLength={6}
                  autoFocus
                />
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button
                  type="submit"
                  disabled={loading === 'join' || code.trim().length < 6}
                  className="btn-primary w-full"
                >
                  {loading === 'join' ? 'Joining…' : 'Join Bolão'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Create a Bolão */}
        <div className="card overflow-hidden">
          <button
            onClick={() => { setShowCreate(!showCreate); setShowJoin(false); setError(''); }}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-navy-border transition-colors"
          >
            <span className="font-medium">Create a Bolão</span>
            <span className="text-muted">{showCreate ? '▲' : '▼'}</span>
          </button>
          {showCreate && (
            <div className="px-4 pb-4 border-t border-navy-border pt-3">
              <form onSubmit={handleCreate} className="space-y-3">
                <input
                  type="text"
                  className="input"
                  placeholder="Name your Bolão"
                  value={groupName}
                  onChange={e => { setGroupName(e.target.value); setError(''); }}
                  autoFocus
                />
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button
                  type="submit"
                  disabled={loading === 'create' || !groupName.trim()}
                  className="btn-primary w-full"
                >
                  {loading === 'create' ? 'Creating…' : 'Create Bolão'}
                </button>
              </form>
            </div>
          )}
        </div>

        <button onClick={handleLogout} className="text-muted text-xs hover:text-red-400 w-full text-center transition-colors">
          Log out
        </button>

      </div>
    </div>
  );
}
