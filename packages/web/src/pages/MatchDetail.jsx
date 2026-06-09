import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import PredictionInput from '../components/PredictionInput';
import CountdownTimer from '../components/CountdownTimer';
import { useAuth } from '../contexts/AuthContext';

const STAGE_LABELS = {
  GROUP_STAGE: 'Fase de Grupos',
  ROUND_OF_32: 'Oitavas de Final',
  ROUND_OF_16: 'Quartas de Final',
  QUARTER_FINALS: 'Quartas de Final',
  SEMI_FINALS: 'Semifinal',
  THIRD_PLACE: '3º Lugar',
  FINAL: 'Final',
};

const STAGE_MULT = {
  GROUP_STAGE: '×1',
  ROUND_OF_32: '×1,5',
  ROUND_OF_16: '×2',
  QUARTER_FINALS: '×3',
  SEMI_FINALS: '×4',
  THIRD_PLACE: '×3',
  FINAL: '×5',
};

export default function MatchDetail() {
  const { groupId, matchId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [groupSettings, setGroupSettings] = useState({});

  useEffect(() => {
    Promise.all([
      api.get(`/groups/${groupId}/matches/${matchId}`),
      api.get(`/groups/${groupId}/admin`).catch(() => null),
    ])
      .then(([matchData, adminData]) => {
        setData(matchData);
        if (adminData?.group?.settings) setGroupSettings(adminData.group.settings);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [groupId, matchId]);

  async function handleSubmit({ homeGuess, awayGuess, jokerUsed }) {
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      if (data.prediction) {
        await api.put(`/groups/${groupId}/predictions/${matchId}`, { homeGuess, awayGuess, jokerUsed });
      } else {
        await api.post(`/groups/${groupId}/predictions`, { matchId, homeGuess, awayGuess, jokerUsed });
      }
      setSuccess('Palpite salvo com sucesso!');
      // Refresh
      const updated = await api.get(`/groups/${groupId}/matches/${matchId}`);
      setData(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Spinner />;
  if (error && !data) return <div className="card p-6 text-red-400 text-center">{error}</div>;

  const { match, locked, prediction, score, allPredictions } = data;
  const kickoff = new Date(match.kickoffAt * 1000);
  const finished = match.status === 'FINISHED';
  const live = match.status === 'LIVE';

  // Check if user already used joker in this group
  const jokerAvailable = groupSettings.joker_enabled && (!prediction || prediction.jokerUsed);

  return (
    <div className="space-y-5 max-w-lg mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="text-muted text-sm hover:text-white flex items-center gap-1"
      >
        ← Voltar
      </button>

      {/* Match header */}
      <div className="card p-5 text-center space-y-2">
        <div className="flex items-center justify-between text-xs text-muted">
          <span>{STAGE_LABELS[match.stage] || match.stage}</span>
          <span className="badge bg-navy-border text-muted">
            {STAGE_MULT[match.stage] || '×1'} multiplicador
          </span>
        </div>

        <div className="flex items-center justify-center gap-4 py-3">
          <span className="font-bold text-lg flex-1 text-right">{match.homeTeam}</span>

          {finished || live ? (
            <div className="flex items-center gap-2 min-w-[80px] justify-center">
              <span className="text-4xl font-extrabold tabular-nums">{match.homeScore}</span>
              <span className="text-muted text-2xl">–</span>
              <span className="text-4xl font-extrabold tabular-nums">{match.awayScore}</span>
            </div>
          ) : (
            <div className="min-w-[80px] text-center">
              <div className="text-muted text-sm">
                {kickoff.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              </div>
              <div className="font-semibold">
                {kickoff.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )}

          <span className="font-bold text-lg flex-1 text-left">{match.awayTeam}</span>
        </div>

        {!finished && !live && (
          <div className="flex justify-center">
            <CountdownTimer kickoffAt={match.kickoffAt} />
          </div>
        )}

        {live && (
          <span className="badge bg-red-500/20 text-red-400 animate-pulse mx-auto">AO VIVO</span>
        )}
        {finished && (
          <span className="badge bg-green-500/10 text-green-400 mx-auto">Encerrado</span>
        )}
      </div>

      {/* Score result */}
      {score && (
        <div className="card p-4 flex items-center justify-between">
          <span className="text-muted text-sm">Sua pontuação</span>
          <div className="text-right">
            <span className="text-gold font-bold text-2xl">+{score.final}</span>
            <span className="text-muted text-xs ml-1">pts</span>
            <div className="text-xs text-muted">
              ({score.base} base + {score.bonus} bônus) × {score.multiplier}
            </div>
          </div>
        </div>
      )}

      {/* Prediction form */}
      <div className="card p-6">
        <h2 className="font-bold mb-5 text-center">
          {locked ? 'Seu Palpite' : 'Enviar Palpite'}
        </h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-green-400 text-sm mb-4">
            {success}
          </div>
        )}

        <PredictionInput
          homeTeam={match.homeTeam}
          awayTeam={match.awayTeam}
          initialHome={prediction?.homeGuess ?? ''}
          initialAway={prediction?.awayGuess ?? ''}
          initialJoker={prediction?.jokerUsed || false}
          jokerAvailable={jokerAvailable}
          locked={locked}
          loading={submitting}
          onSubmit={handleSubmit}
        />
      </div>

      {/* All predictions (visible after deadline) */}
      {(locked || finished) && allPredictions && allPredictions.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-navy-border">
            <h3 className="font-semibold text-sm">Palpites do Grupo</h3>
          </div>
          <div className="divide-y divide-navy-border">
            {allPredictions.map((p) => {
              const isMe = p.userId === user?.id;
              return (
                <div
                  key={p.userId}
                  className={`flex items-center px-4 py-3 gap-3 text-sm ${isMe ? 'bg-pitch/10' : ''}`}
                >
                  <span className={`flex-1 font-medium ${isMe ? 'text-pitch-light' : ''}`}>
                    {p.displayName}
                    {p.jokerUsed && <span className="ml-1 text-gold text-xs">★</span>}
                  </span>
                  <span className="font-mono font-semibold">
                    {p.homeGuess} – {p.awayGuess}
                  </span>
                  {p.finalPoints !== null && (
                    <span className="text-gold font-bold">+{p.finalPoints}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
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
