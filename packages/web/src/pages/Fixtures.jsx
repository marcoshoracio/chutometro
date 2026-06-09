import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client';
import MatchCard from '../components/MatchCard';
import StageFilter from '../components/StageFilter';

const STAGE_ORDER = [
  'GROUP_STAGE',
  'ROUND_OF_32',
  'ROUND_OF_16',
  'QUARTER_FINALS',
  'SEMI_FINALS',
  'THIRD_PLACE',
  'FINAL',
];

const STAGE_LABELS = {
  GROUP_STAGE: 'Fase de Grupos',
  ROUND_OF_32: 'Oitavas de Final',
  ROUND_OF_16: 'Quartas de Final',
  QUARTER_FINALS: 'Quartas de Final',
  SEMI_FINALS: 'Semifinal',
  THIRD_PLACE: '3º Lugar',
  FINAL: 'Final',
};

export default function Fixtures() {
  const { groupId } = useParams();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stage, setStage] = useState('ALL');

  useEffect(() => {
    api.get(`/groups/${groupId}/matches`)
      .then((d) => setMatches(d.matches))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [groupId]);

  if (loading) return <Spinner />;
  if (error) return <div className="card p-6 text-red-400 text-center">{error}</div>;

  const availableStages = [...new Set(matches.map((m) => m.stage))];
  const filtered = stage === 'ALL' ? matches : matches.filter((m) => m.stage === stage);

  // Group by stage
  const grouped = {};
  for (const m of filtered) {
    if (!grouped[m.stage]) grouped[m.stage] = [];
    grouped[m.stage].push(m);
  }

  const stagesPresent = STAGE_ORDER.filter((s) => grouped[s]);

  const pendingPredictions = matches.filter(
    (m) => !m.locked && !m.prediction && m.status === 'SCHEDULED'
  ).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-xl">Jogos</h1>
        {pendingPredictions > 0 && (
          <span className="badge bg-gold/20 text-gold text-xs">
            {pendingPredictions} sem palpite
          </span>
        )}
      </div>

      <StageFilter value={stage} onChange={setStage} availableStages={availableStages} />

      {stagesPresent.length === 0 && (
        <p className="text-muted text-center py-8">Nenhum jogo encontrado.</p>
      )}

      {stagesPresent.map((s) => (
        <section key={s}>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-2">
            {STAGE_LABELS[s] || s}
          </h2>
          <div className="space-y-2">
            {grouped[s].map((m) => (
              <MatchCard key={m.id} match={m} prediction={m.prediction} score={m.score} />
            ))}
          </div>
        </section>
      ))}
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
