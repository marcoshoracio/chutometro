import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';

const ROUNDS = [
  { key: 'ROUND_OF_32', label: 'Oitavas', short: 'R32' },
  { key: 'ROUND_OF_16', label: 'Quartas', short: 'R16' },
  { key: 'QUARTER_FINALS', label: 'Semis', short: 'QF' },
  { key: 'SEMI_FINALS', label: 'Final 4', short: 'SF' },
  { key: 'FINAL', label: 'Final', short: 'F' },
];

function fmt(kickoffAt) {
  if (!kickoffAt) return '';
  const d = new Date(kickoffAt * 1000);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function MatchSlot({ match, groupId }) {
  if (!match) {
    return (
      <div className="border border-dashed border-navy-border rounded-lg p-2 opacity-40 min-w-[140px]">
        <div className="text-xs text-muted text-center">—</div>
      </div>
    );
  }

  const isFinished = match.status === 'FINISHED';
  const isLive = match.status === 'LIVE';
  const hasPrediction = !!match.prediction;
  const isLocked = match.locked;

  return (
    <Link
      to={`/g/${groupId}/fixtures/${match.id}`}
      className={`block border rounded-lg p-2 min-w-[140px] transition-colors hover:border-pitch/60 ${
        isLive ? 'border-gold/60 bg-gold/5' :
        isFinished ? 'border-navy-border bg-navy-card/50' :
        hasPrediction ? 'border-pitch/40 bg-pitch/5' :
        'border-navy-border bg-navy-card'
      }`}
    >
      <div className="text-xs text-muted mb-1">{fmt(match.kickoff_at)}</div>
      <div className="space-y-0.5">
        <TeamRow
          name={match.home_team}
          score={isFinished || isLive ? match.home_score : null}
          isWinner={isFinished && match.home_score > match.away_score}
        />
        <TeamRow
          name={match.away_team}
          score={isFinished || isLive ? match.away_score : null}
          isWinner={isFinished && match.away_score > match.home_score}
        />
      </div>
      {!isLocked && !isFinished && !hasPrediction && (
        <div className="mt-1 text-xs text-gold/70">+ chute</div>
      )}
      {hasPrediction && !isFinished && (
        <div className="mt-1 text-xs text-pitch-light/70">
          {match.prediction.home_score}–{match.prediction.away_score}
        </div>
      )}
      {isFinished && match.score && (
        <div className="mt-1 text-xs text-pitch-light/70 font-bold">
          +{match.score.points}pts
        </div>
      )}
    </Link>
  );
}

function TeamRow({ name, score, isWinner }) {
  const display = name && name !== 'TBD' ? name : '?';
  const short = display.length > 12 ? display.slice(0, 12) + '…' : display;
  return (
    <div className={`flex items-center justify-between gap-2 text-xs ${isWinner ? 'font-bold text-white' : 'text-muted'}`}>
      <span className="truncate">{short}</span>
      {score !== null && score !== undefined && (
        <span className="font-mono font-bold text-white">{score}</span>
      )}
    </div>
  );
}

export default function Bracket() {
  const { groupId } = useParams();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/groups/${groupId}/matches`)
      .then((d) => setMatches(d.matches))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [groupId]);

  if (loading) return <Spinner />;
  if (error) return <div className="card p-6 text-red-400 text-center">{error}</div>;

  const byRound = {};
  for (const r of ROUNDS) byRound[r.key] = [];
  const thirdPlace = [];

  for (const m of matches) {
    if (m.stage === 'THIRD_PLACE') { thirdPlace.push(m); continue; }
    if (byRound[m.stage]) byRound[m.stage].push(m);
  }

  // Sort each round by kickoff
  for (const r of ROUNDS) {
    byRound[r.key].sort((a, b) => a.kickoff_at - b.kickoff_at);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-xl">Chaveamento</h1>
        <Link to={`/g/${groupId}/fixtures`} className="text-pitch-light text-sm hover:underline">
          Ver lista
        </Link>
      </div>

      {/* Horizontal scrollable bracket */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3 min-w-max items-start">
          {ROUNDS.map((round, roundIdx) => {
            const roundMatches = byRound[round.key];
            const maxSlots = round.key === 'ROUND_OF_32' ? 16
              : round.key === 'ROUND_OF_16' ? 8
              : round.key === 'QUARTER_FINALS' ? 4
              : round.key === 'SEMI_FINALS' ? 2
              : 1;

            const slots = Array.from({ length: maxSlots }, (_, i) => roundMatches[i] || null);

            return (
              <div key={round.key} className="flex flex-col gap-1">
                {/* Round header */}
                <div className="text-center text-xs font-semibold text-muted uppercase tracking-wider mb-2 px-2">
                  {round.label}
                  <span className="block text-xs font-normal text-muted/60">
                    {roundMatches.length} jogos
                  </span>
                </div>

                {/* Matches with spacing to simulate bracket */}
                <div
                  className="flex flex-col"
                  style={{ gap: `${Math.pow(2, roundIdx) * 4}px` }}
                >
                  {slots.map((match, i) => (
                    <MatchSlot key={match?.id || `empty-${round.key}-${i}`} match={match} groupId={groupId} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Third place separately */}
      {thirdPlace.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-2">3º Lugar</h2>
          <div className="flex gap-3">
            {thirdPlace.map((m) => (
              <MatchSlot key={m.id} match={m} groupId={groupId} />
            ))}
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
