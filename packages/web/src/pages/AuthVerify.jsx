import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';

export default function AuthVerify() {
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('Token inválido na URL.');
      return;
    }

    api.get(`/auth/verify?token=${token}`)
      .then((data) => {
        login(data.token, data.user);
        if (data.redirectTo) {
          navigate(`/join?code=${data.redirectTo}`, { replace: true });
        } else {
          navigate('/join', { replace: true });
        }
      })
      .catch((err) => {
        setError(err.message || 'Link inválido ou expirado.');
      });
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card p-8 text-center max-w-sm w-full">
          <div className="text-4xl mb-4">❌</div>
          <h2 className="text-xl font-bold mb-2">Erro ao verificar link</h2>
          <p className="text-muted mb-6">{error}</p>
          <a href="/join" className="btn-primary inline-block">
            Tentar novamente
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-pitch-light border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted">Verificando seu acesso...</p>
      </div>
    </div>
  );
}
