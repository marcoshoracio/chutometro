import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client';

const TEAMS = [
  'Argentina', 'Austrália', 'Arábia Saudita', 'Bélgica', 'Brasil', 'Camarões',
  'Canadá', 'Chile', 'Colômbia', 'Coreia do Sul', 'Costa Rica', 'Costa do Marfim',
  'Croácia', 'Dinamarca', 'Egito', 'Equador', 'Espanha', 'EUA',
  'França', 'Gana', 'Alemanha', 'Irã', 'Itália', 'Japão',
  'Marrocos', 'México', 'Nigéria', 'Nova Zelândia', 'Países Baixos', 'Panamá',
  'Peru', 'Polônia', 'Portugal', 'Qatar', 'República Tcheca', 'Romênia',
  'Senegal', 'África do Sul', 'Tunísia', 'Turquia', 'Ucrânia', 'Uruguai',
  'Venezuela', 'Bolívia', 'Argélia', 'Indonésia',
].sort((a, b) => a.localeCompare(b, 'pt-BR'));

export default function PreTournament() {
  const { groupId } = useParams();
  const [form, setForm] = useState({ champion: '', runnerUp: '', topScorer: '' });
  const [existing, setExisting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/groups/${groupId}/pre-tournament`)
      .then((d) => {
        if (d.prediction) {
          setExisting(d.prediction);
          setForm({
            champion: d.prediction.champion || '',
            runnerUp: d.prediction.runnerUp || '',
            topScorer: d.prediction.topScorer || '',
          });
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [groupId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await api.post(`/groups/${groupId}/pre-tournament`, form);
      setMsg('Palpites salvos com sucesso!');
      setExisting(form);
    } catch (err) {
      setMsg('Erro: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner />;

  if (error) {
    return (
      <div className="card p-6 text-center">
        <p className="text-red-400">{error}</p>
        {error.includes('habilitados') && (
          <p className="text-muted text-sm mt-2">O administrador não ativou os palpites pré-torneio.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-lg mx-auto">
      <div>
        <h1 className="font-bold text-xl">Palpites Pré-Torneio</h1>
        <p className="text-muted text-sm mt-1">
          Faça suas previsões antes do torneio começar. Você pode alterar até o início da competição.
        </p>
      </div>

      {existing && (
        <div className="card p-3 bg-pitch/10 border-pitch/30">
          <p className="text-xs text-pitch-light font-medium">Palpite enviado anteriormente</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <SelectField
          label="Campeão 🏆"
          value={form.champion}
          onChange={(v) => setForm({ ...form, champion: v })}
        />
        <SelectField
          label="Vice-Campeão 🥈"
          value={form.runnerUp}
          onChange={(v) => setForm({ ...form, runnerUp: v })}
        />
        <div>
          <label className="text-xs text-muted block mb-1">Artilheiro ⚽</label>
          <input
            type="text"
            className="input"
            placeholder="Nome do artilheiro"
            value={form.topScorer}
            onChange={(e) => setForm({ ...form, topScorer: e.target.value })}
          />
        </div>

        {msg && (
          <p className={`text-sm ${msg.startsWith('Erro') ? 'text-red-400' : 'text-green-400'}`}>{msg}</p>
        )}

        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? 'Salvando...' : existing ? 'Atualizar Palpites' : 'Enviar Palpites'}
        </button>
      </form>
    </div>
  );
}

function SelectField({ label, value, onChange }) {
  return (
    <div>
      <label className="text-xs text-muted block mb-1">{label}</label>
      <select
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Selecionar seleção...</option>
        {TEAMS.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-2 border-pitch-light border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
