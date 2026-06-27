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
  const [allPredictions, setAllPredictions] = useState([]);
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
        setAllPredictions(d.allPredictions || []);
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

      {allPredictions.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Palpites do Grupo</h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-border text-xs text-muted uppercase tracking-wider">
                  <th className="text-left px-4 py-2">Jogador</th>
                  <th className="text-left px-4 py-2">🏆 Campeão</th>
                  <th className="text-left px-4 py-2">🥈 Vice</th>
                  <th className="text-left px-4 py-2">⚽ Artilheiro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-border">
                {allPredictions.map((p) => (
                  <tr key={p.userId} className={p.points > 0 ? 'bg-pitch/5' : ''}>
                    <td className="px-4 py-2 font-medium text-white">
                      {p.displayName}
                      {p.points > 0 && (
                        <span className="ml-1 text-xs text-gold font-bold">+{p.points}pts</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-muted">{p.champion || '—'}</td>
                    <td className="px-4 py-2 text-muted">{p.runnerUp || '—'}</td>
                    <td className="px-4 py-2 text-muted">{p.topScorer || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
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
