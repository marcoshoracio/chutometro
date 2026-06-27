import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { getFlag } from '../utils/flags';

const TABS = ['Jogadores', 'Times', 'Resultados', 'Pré-Torneio', 'Configurações'];

export default function AdminPanel() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const [tab, setTab] = useState('Jogadores');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api.get(`/groups/${groupId}/admin`)
      .then((d) => { setData(d); setError(''); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [groupId]);

  if (loading) return <Spinner />;
  if (error) return (
    <div className="card p-6 text-center">
      <p className="text-red-400">{error}</p>
      {error.includes('administrador') && (
        <p className="text-muted text-sm mt-2">Apenas o administrador do grupo pode acessar este painel.</p>
      )}
    </div>
  );

  const inviteUrl = `${window.location.origin}/join?code=${data.group.code}`;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-xl">Painel Admin</h1>
        <span className="badge bg-pitch/20 text-pitch-light text-xs">{data.group.name}</span>
      </div>

      {/* Invite URL */}
      <div className="card p-4 space-y-2">
        <p className="text-xs text-muted font-medium">Link de convite</p>
        <div className="flex gap-2 items-center">
          <input
            readOnly
            value={inviteUrl}
            className="input text-xs font-mono flex-1"
            onClick={(e) => e.target.select()}
          />
          <button
            onClick={() => navigator.clipboard.writeText(inviteUrl)}
            className="btn-secondary text-xs whitespace-nowrap"
          >
            Copiar
          </button>
          <button
            onClick={() => api.post(`/groups/${groupId}/admin/invite`).then(load)}
            className="btn-secondary text-xs whitespace-nowrap"
            title="Gerar novo código"
          >
            ↺
          </button>
        </div>
        <p className="text-xs text-muted">Código: <span className="font-mono text-white font-bold tracking-widest">{data.group.code}</span></p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-navy-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-pitch-light text-pitch-light'
                : 'border-transparent text-muted hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Jogadores' && (
        <MembersTab members={data.members} groupId={groupId} adminId={data.group.adminId} currentUserId={user?.id} onRefresh={load} />
      )}
      {tab === 'Times' && (
        <TeamsTab matches={data.matches} groupId={groupId} onRefresh={load} />
      )}
      {tab === 'Resultados' && (
        <ResultsTab matches={data.matches} groupId={groupId} onRefresh={load} />
      )}
      {tab === 'Pré-Torneio' && (
        <PreTournamentResultsTab groupId={groupId} />
      )}
      {tab === 'Configurações' && (
        <SettingsTab settings={data.group.settings} groupId={groupId} onRefresh={load} />
      )}
    </div>
  );
}

function MembersTab({ members, groupId, adminId, currentUserId, onRefresh }) {
  const [removing, setRemoving] = useState(null);

  async function handleRemove(userId) {
    if (!confirm('Remover este jogador do grupo?')) return;
    setRemoving(userId);
    try {
      await api.delete(`/groups/${groupId}/admin/members/${userId}`);
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="divide-y divide-navy-border">
        {members.map((m) => (
          <div key={m.id} className="flex items-center px-4 py-3 gap-3">
            <div className="flex-1">
              <p className="font-medium text-sm">
                {m.displayName}
                {m.isAdmin && <span className="ml-1 badge bg-pitch/20 text-pitch-light text-xs">Admin</span>}
              </p>
              <p className="text-xs text-muted">{m.email}</p>
            </div>
            <span className="text-gold font-bold">{m.totalPoints} pts</span>
            {m.id !== adminId && m.id !== currentUserId && (
              <button
                onClick={() => handleRemove(m.id)}
                disabled={removing === m.id}
                className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
              >
                {removing === m.id ? '...' : 'Remover'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultsTab({ matches, groupId, onRefresh }) {
  const [form, setForm] = useState({ matchId: '', homeScore: '', awayScore: '' });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  const pendingMatches = matches.filter((m) => m.status !== 'FINISHED');
  const finishedMatches = matches.filter((m) => m.status === 'FINISHED').slice(-10).reverse();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.matchId || form.homeScore === '' || form.awayScore === '') return;
    setSubmitting(true);
    setMsg('');
    try {
      await api.post(`/groups/${groupId}/results`, {
        matchId: form.matchId,
        homeScore: parseInt(form.homeScore, 10),
        awayScore: parseInt(form.awayScore, 10),
      });
      setMsg('Resultado registrado!');
      setForm({ matchId: '', homeScore: '', awayScore: '' });
      onRefresh();
    } catch (err) {
      setMsg('Erro: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const selectedMatch = matches.find((m) => m.id === form.matchId);

  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-4">
        <h3 className="font-semibold">Registrar Resultado</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-muted block mb-1">Jogo</label>
            <select
              className="input"
              value={form.matchId}
              onChange={(e) => setForm({ ...form, matchId: e.target.value })}
              required
            >
              <option value="">Selecionar jogo...</option>
              {pendingMatches.map((m) => (
                <option key={m.id} value={m.id}>
                  #{m.matchNumber} {m.homeTeam} × {m.awayTeam}
                </option>
              ))}
            </select>
          </div>

          {selectedMatch && (
            <div className="flex items-center gap-3">
              <div className="flex-1 text-right font-semibold text-sm">{selectedMatch.homeTeam}</div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="99"
                  className="w-14 text-center input text-xl font-bold"
                  placeholder="0"
                  value={form.homeScore}
                  onChange={(e) => setForm({ ...form, homeScore: e.target.value })}
                  required
                />
                <span className="text-muted font-bold">–</span>
                <input
                  type="number"
                  min="0"
                  max="99"
                  className="w-14 text-center input text-xl font-bold"
                  placeholder="0"
                  value={form.awayScore}
                  onChange={(e) => setForm({ ...form, awayScore: e.target.value })}
                  required
                />
              </div>
              <div className="flex-1 font-semibold text-sm">{selectedMatch.awayTeam}</div>
            </div>
          )}

          {msg && (
            <p className={msg.startsWith('Erro') ? 'text-red-400 text-sm' : 'text-green-400 text-sm'}>{msg}</p>
          )}

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Salvando...' : 'Confirmar Resultado'}
          </button>
        </form>
      </div>

      {finishedMatches.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-navy-border">
            <h3 className="font-semibold text-sm text-muted">Últimos Resultados</h3>
          </div>
          <div className="divide-y divide-navy-border">
            {finishedMatches.map((m) => (
              <div key={m.id} className="flex items-center px-4 py-3 gap-2 text-sm">
                <span className="flex-1 text-right text-muted">{m.homeTeam}</span>
                <span className="font-bold tabular-nums">{m.homeScore} – {m.awayScore}</span>
                <span className="flex-1 text-muted">{m.awayTeam}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const KNOCKOUT_STAGES = ['ROUND_OF_32', 'ROUND_OF_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL'];
const STAGE_LABELS = {
  ROUND_OF_32: 'Oitavas', ROUND_OF_16: 'Quartas', QUARTER_FINALS: 'Semi',
  SEMI_FINALS: 'Final 4', THIRD_PLACE: '3º', FINAL: 'Final',
};

function TeamsTab({ matches, groupId, onRefresh }) {
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [editing, setEditing] = useState(null); // matchId
  const [form, setForm] = useState({ homeTeam: '', awayTeam: '' });
  const [saving, setSaving] = useState(false);

  const knockoutMatches = matches
    .filter((m) => KNOCKOUT_STAGES.includes(m.stage))
    .sort((a, b) => a.kickoffAt - b.kickoffAt);

  async function handleSync() {
    setSyncing(true);
    setSyncMsg('');
    try {
      await api.post(`/groups/${groupId}/admin/sync`);
      setSyncMsg('Sincronizado! Recarregando...');
      setTimeout(() => { onRefresh(); setSyncMsg(''); }, 1000);
    } catch (err) {
      setSyncMsg('Erro: ' + err.message);
    } finally {
      setSyncing(false);
    }
  }

  function startEdit(match) {
    setEditing(match.id);
    setForm({ homeTeam: match.homeTeam === 'TBD' ? '' : match.homeTeam, awayTeam: match.awayTeam === 'TBD' ? '' : match.awayTeam });
  }

  async function handleSave(matchId) {
    setSaving(true);
    try {
      await api.patch(`/groups/${groupId}/admin/matches/${matchId}/teams`, {
        homeTeam: form.homeTeam || undefined,
        awayTeam: form.awayTeam || undefined,
      });
      setEditing(null);
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">Sincronizar da API</h3>
            <p className="text-xs text-muted">Puxa nomes de times confirmados do football-data.org</p>
          </div>
          <button onClick={handleSync} disabled={syncing} className="btn-primary text-sm">
            {syncing ? '...' : '↻ Sincronizar'}
          </button>
        </div>
        {syncMsg && <p className="text-xs text-green-400">{syncMsg}</p>}
      </div>

      {KNOCKOUT_STAGES.map((stageKey) => {
        const stageMatches = knockoutMatches.filter((m) => m.stage === stageKey);
        if (stageMatches.length === 0) return null;
        return (
          <div key={stageKey} className="card overflow-hidden">
            <div className="px-4 py-2 bg-navy-border/40 border-b border-navy-border">
              <h3 className="font-semibold text-sm text-pitch-light">{STAGE_LABELS[stageKey]}</h3>
            </div>
            <div className="divide-y divide-navy-border">
              {stageMatches.map((m) => (
                <div key={m.id} className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted w-14 shrink-0 leading-tight">
                      <span className="font-mono font-bold text-white/70">{m.matchNumber ? `M${m.matchNumber}` : ''}</span>
                      <span className="block text-muted/70">
                        {m.kickoffAt ? new Date(m.kickoffAt * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : ''}
                      </span>
                    </span>
                    {editing === m.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input className="input text-xs flex-1" placeholder="Time casa" value={form.homeTeam} onChange={(e) => setForm({ ...form, homeTeam: e.target.value })} />
                        <span className="text-muted text-xs">×</span>
                        <input className="input text-xs flex-1" placeholder="Time fora" value={form.awayTeam} onChange={(e) => setForm({ ...form, awayTeam: e.target.value })} />
                        <button onClick={() => handleSave(m.id)} disabled={saving} className="btn-primary text-xs px-2 py-1">✓</button>
                        <button onClick={() => setEditing(null)} className="text-muted hover:text-white text-xs px-2 py-1">✕</button>
                      </div>
                    ) : (
                      <>
                        <span className={`flex-1 text-sm text-right ${m.homeTeam === 'TBD' ? 'text-muted italic' : 'font-medium'}`}>
                          {m.homeTeam !== 'TBD' && <span className="mr-1">{getFlag(m.homeTeam)}</span>}{m.homeTeam}
                        </span>
                        <span className="text-muted text-xs shrink-0">×</span>
                        <span className={`flex-1 text-sm ${m.awayTeam === 'TBD' ? 'text-muted italic' : 'font-medium'}`}>
                          {m.awayTeam !== 'TBD' && <span className="mr-1">{getFlag(m.awayTeam)}</span>}{m.awayTeam}
                        </span>
                        <button onClick={() => startEdit(m)} className="text-xs text-pitch-light hover:underline shrink-0">editar</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SettingsTab({ settings, groupId, onRefresh }) {
  const [form, setForm] = useState({
    jokerEnabled: settings.joker_enabled || false,
    preTournamentEnabled: settings.pre_tournament_enabled !== false,
    knockout90minOnly: settings.knockout_90min_only || false,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  async function handleSave() {
    setSaving(true);
    setMsg('');
    try {
      await api.put(`/groups/${groupId}/admin/settings`, form);
      setMsg('Configurações salvas!');
      onRefresh();
    } catch (err) {
      setMsg('Erro: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  function Toggle({ label, description, field }) {
    return (
      <div className="flex items-start justify-between gap-4 py-3">
        <div>
          <p className="font-medium text-sm">{label}</p>
          {description && <p className="text-xs text-muted mt-0.5">{description}</p>}
        </div>
        <button
          onClick={() => setForm({ ...form, [field]: !form[field] })}
          className={`flex-shrink-0 w-11 h-6 rounded-full transition-colors flex items-center px-1 ${
            form[field] ? 'bg-pitch' : 'bg-navy-border'
          }`}
        >
          <div
            className={`w-4 h-4 rounded-full bg-white transition-transform ${
              form[field] ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    );
  }

  return (
    <div className="card p-4 divide-y divide-navy-border space-y-0">
      <Toggle
        label="Joker"
        description="Permite usar um Joker por torneio (dobra os pontos do palpite)"
        field="jokerEnabled"
      />
      <Toggle
        label="Palpites pré-torneio"
        description="Permite prever campeão, vice e artilheiro antes do torneio"
        field="preTournamentEnabled"
      />
      <Toggle
        label="Mata-mata: apenas 90 minutos"
        description="Pontuação baseada apenas no resultado dos 90 min (ignora prorrogação/pênaltis)"
        field="knockout90minOnly"
      />
      <div className="pt-3">
        {msg && (
          <p className={`text-sm mb-2 ${msg.startsWith('Erro') ? 'text-red-400' : 'text-green-400'}`}>{msg}</p>
        )}
        <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </div>
  );
}

function PreTournamentResultsTab({ groupId }) {
  const [form, setForm] = useState({ champion: '', runnerUp: '', topScorer: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get(`/groups/${groupId}/admin/pre-tournament-results`)
      .then((d) => {
        if (d.results) {
          setForm({
            champion: d.results.champion || '',
            runnerUp: d.results.runnerUp || '',
            topScorer: d.results.topScorer || '',
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [groupId]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await api.post(`/groups/${groupId}/admin/pre-tournament-results`, form);
      setMsg('Resultados salvos e pontos calculados!');
    } catch (err) {
      setMsg('Erro: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-1">
        <h3 className="font-semibold">Resultados Pré-Torneio</h3>
        <p className="text-xs text-muted">
          Defina os resultados reais após o torneio terminar. Os pontos serão calculados automaticamente:
          Campeão correto <span className="text-gold font-bold">+10 pts</span>,
          Vice correto <span className="text-gold font-bold">+5 pts</span>,
          Artilheiro correto <span className="text-gold font-bold">+5 pts</span>.
        </p>
      </div>

      <form onSubmit={handleSave} className="card p-4 space-y-4">
        <div>
          <label className="text-xs text-muted block mb-1">🏆 Campeão</label>
          <input
            type="text"
            className="input"
            placeholder="Nome do país campeão"
            value={form.champion}
            onChange={(e) => setForm({ ...form, champion: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs text-muted block mb-1">🥈 Vice-Campeão</label>
          <input
            type="text"
            className="input"
            placeholder="Nome do país vice-campeão"
            value={form.runnerUp}
            onChange={(e) => setForm({ ...form, runnerUp: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs text-muted block mb-1">⚽ Artilheiro</label>
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
          {saving ? 'Salvando...' : 'Salvar e Calcular Pontos'}
        </button>
      </form>
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
