import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client';
import MatchCard from '../components/MatchCard';
import StageFilter from '../components/StageFilter';

const KNOCKOUT_STAGES = [
  'ROUND_OF_32',
  'ROUND_OF_16',
  'QUARTER_FINALS',
  'SEMI_FINALS',
  'THIRD_PLACE',
  'FINAL',
];

const STAGE_LABELS = {
  ROUND_OF_32: 'Round of 32',
  ROUND_OF_16: 'Round of 16',
  QUARTER_FINALS: 'Quarterfinals',
  SEMI_FINALS: 'Semifinals',
  THIRD_PLACE: '3rd Place',
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

  const knockoutMatches = matches.filter((m) => KNOCKOUT_STAGES.includes(m.stage));
  const availableStages = [...new Set(knockoutMatches.map((m) => m.stage))];
  const filtered = stage === 'ALL' ? knockoutMatches : knockoutMatches.filter((m) => m.stage === stage);

  // Group by stage
  const grouped = {};
  for (const m of filtered) {
    if (!grouped[m.stage]) grouped[m.stage] = [];
    grouped[m.stage].push(m);
  }

  const stagesPresent = KNOCKOUT_STAGES.filter((s) => grouped[s]);

  const pendingPredictions = knockoutMatches.filter(
    (m) => !m.locked && !m.prediction && m.status === 'SCHEDULED'
  ).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-xl">Matches</h1>
        {pendingPredictions > 0 && (
          <span className="badge bg-gold/20 text-gold text-xs">
            {pendingPredictions} without prediction
          </span>
        )}
      </div>

      <StageFilter value={stage} onChange={setStage} availableStages={availableStages} />

      {stagesPresent.length === 0 && (
        <p className="text-muted text-center py-8">No matches found.</p>
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
