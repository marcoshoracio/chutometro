import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';

export default function Join() {
  const [searchParams] = useSearchParams();
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState('group'); // 'group' | 'auth' | 'magic-sent' | 'create'
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
      setError('Código de grupo não encontrado.');
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

  // If logged in with no code, show dashboard redirect or create group
  if (user && !searchParams.get('code')) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <div className="text-5xl mb-3">⚽</div>
            <h1 className="text-3xl font-extrabold text-pitch-light">Chutômetro</h1>
            <p className="text-muted mt-1">Olá, {user.displayName}!</p>
          </div>

          <div className="card p-6 space-y-4">
            <h2 className="font-bold text-lg">Entrar em um grupo</h2>
            <form onSubmit={handleLookupCode} className="space-y-3">
              <input
                type="text"
                className="input uppercase tracking-widest font-mono text-center text-lg"
                placeholder="CÓDIGO"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={6}
              />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Buscando...' : 'Entrar no Grupo'}
              </button>
            </form>
          </div>

          <div className="card p-6 space-y-4">
            <h2 className="font-bold text-lg">Criar novo grupo</h2>
            <form onSubmit={handleCreateGroup} className="space-y-3">
              <input
                type="text"
                className="input"
                placeholder="Nome do seu bolão"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
              <button type="submit" disabled={loading || !groupName.trim()} className="btn-primary w-full">
                {loading ? 'Criando...' : 'Criar Bolão'}
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
          <p className="text-muted mt-1 text-sm">Bolão da Copa do Mundo 2026</p>
        </div>

        {step === 'group' && (
          <div className="card p-6 space-y-4">
            <h2 className="font-bold text-lg">Entrar no Bolão</h2>
            <form onSubmit={handleLookupCode} className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">Código do grupo</label>
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
                {loading ? 'Buscando...' : 'Continuar'}
              </button>
            </form>
          </div>
        )}

        {step === 'auth' && groupInfo && (
          <div className="card p-6 space-y-4">
            <div className="text-center">
              <p className="text-muted text-sm">Entrando em</p>
              <p className="font-bold text-xl text-pitch-light">{groupInfo.group.name}</p>
              <p className="text-xs text-muted">{groupInfo.memberCount} participantes</p>
            </div>
            <hr className="border-navy-border" />
            <h2 className="font-bold">Seu acesso por e-mail</h2>
            <form onSubmit={handleRequestMagicLink} className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">Nome de exibição</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Como quer ser chamado?"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">E-mail</label>
                <input
                  type="email"
                  className="input"
                  placeholder="seu@email.com"
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
                {loading ? 'Enviando...' : 'Enviar link de acesso'}
              </button>
            </form>
            <button
              onClick={() => { setStep('group'); setError(''); }}
              className="text-muted text-xs hover:text-white w-full text-center"
            >
              Voltar
            </button>
          </div>
        )}

        {step === 'magic-sent' && (
          <div className="card p-8 text-center space-y-4">
            <div className="text-5xl">📧</div>
            <h2 className="font-bold text-xl">Verifique seu e-mail</h2>
            <p className="text-muted text-sm">
              Enviamos um link mágico para <span className="text-white font-medium">{email}</span>.
              Clique nele para entrar — o link expira em 15 minutos.
            </p>
            <p className="text-xs text-muted italic">
              Em modo dev, o link aparece no console da API.
            </p>
            <button
              onClick={() => setStep('auth')}
              className="text-pitch-light text-sm hover:underline"
            >
              Reenviar link
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
