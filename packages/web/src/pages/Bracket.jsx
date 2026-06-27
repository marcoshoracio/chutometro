import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { getFlag } from '../utils/flags';

const ROUNDS = [
  { key: 'ROUND_OF_32',    label: 'Round of 32',  cols: 2 },
  { key: 'ROUND_OF_16',    label: 'Round of 16',  cols: 2 },
  { key: 'QUARTER_FINALS', label: 'Quarterfinals', cols: 2 },
  { key: 'SEMI_FINALS',    label: 'Semifinals',    cols: 2 },
  { key: 'FINAL',          label: 'Final',         cols: 1 },
];

function fmtDate(kickoffAt) {
  if (!kickoffAt) return '';
  const d = new Date(kickoffAt * 1000);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function fmtTime(kickoffAt) {
  if (!kickoffAt) return '';
  const d = new Date(kickoffAt * 1000);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function TeamRow({ name, score, isWinner }) {
  const flag = getFlag(name);
  const isPlaceholder = !name || name === 'TBD' || name.length > 5;
  const display = isPlaceholder && name !== 'TBD' ? (name || '?') : (name || '?');

  return (
    <div className={`flex items-center gap-1.5 ${isWinner ? 'font-bold text-white' : 'text-muted'}`}>
      {flag ? (
        <span className="text-base leading-none">{flag}</span>
      ) : (
        <span className="w-[1.2em] inline-block text-center text-muted/40 text-xs">·</span>
      )}
      <span className="text-xs font-mono flex-1 truncate">{display}</span>
      {score !== null && score !== undefined && (
        <span className="font-mono font-bold text-white text-xs ml-auto">{score}</span>
      )}
    </div>
  );
}

function MatchCard({ match, groupId }) {
  if (!match) return null;

  const isFinished = match.status === 'FINISHED';
  const isLive = match.status === 'LIVE';
  const hasPrediction = !!match.prediction;
  const matchNum = match.match_number ? `M${match.match_number}` : '';

  return (
    <Link
      to={`/g/${groupId}/fixtures/${match.id}`}
      className={`block rounded-xl border p-3 transition-colors hover:border-pitch/60 ${
        isLive
          ? 'border-gold/60 bg-gold/5'
          : isFinished
          ? 'border-navy-border bg-navy-card/50'
          : hasPrediction
          ? 'border-pitch/40 bg-pitch/5'
          : 'border-navy-border bg-navy-card'
      }`}
    >
      {/* Header: match number + date/time */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-muted/60 tracking-widest uppercase">
          {matchNum}
        </span>
        <span className="text-[10px] text-muted">
          {fmtDate(match.kickoff_at)} {fmtTime(match.kickoff_at)}
        </span>
      </div>

      {/* Teams */}
      <div className="space-y-1.5">
        <TeamRow
          name={match.home_team}
          score={isFinished || isLive ? match.home_score : null}
          isWinner={isFinished && match.home_score > match.away_score}
        />
        <div className="border-t border-navy-border/50" />
        <TeamRow
          name={match.away_team}
          score={isFinished || isLive ? match.away_score : null}
          isWinner={isFinished && match.away_score > match.home_score}
        />
      </div>

      {/* Footer: prediction or cta */}
      {isLive && (
        <div className="mt-2 text-[10px] text-gold font-semibold uppercase tracking-wider">
          Live
        </div>
      )}
      {!isLive && !isFinished && hasPrediction && (
        <div className="mt-2 text-[10px] text-pitch-light/70">
          Prediction: {match.prediction.home_score}–{match.prediction.away_score}
        </div>
      )}
      {!isLive && !isFinished && !hasPrediction && !match.locked && (
        <div className="mt-2 text-[10px] text-gold/70">+ predict</div>
      )}
      {isFinished && match.score && (
        <div className="mt-2 text-[10px] text-pitch-light font-bold">
          +{match.score.points} pts
        </div>
      )}
    </Link>
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

  for (const r of ROUNDS) {
    byRound[r.key].sort((a, b) => (a.match_number || 0) - (b.match_number || 0));
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-xl">Bracket</h1>
        <Link to={`/g/${groupId}/fixtures`} className="text-pitch-light text-sm hover:underline">
          See list
        </Link>
      </div>

      {ROUNDS.map((round) => {
        const roundMatches = byRound[round.key];
        if (roundMatches.length === 0) return null;

        return (
          <section key={round.key}>
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                {round.label}
              </h2>
              <div className="flex-1 border-t border-navy-border" />
              <span className="text-xs text-muted">{roundMatches.length} matches</span>
            </div>

            <div
              className={`grid gap-3 ${
                round.cols === 2 ? 'grid-cols-2' : 'grid-cols-1 max-w-[220px]'
              }`}
            >
              {roundMatches.map((m) => (
                <MatchCard key={m.id} match={m} groupId={groupId} />
              ))}
            </div>
          </section>
        );
      })}

      {thirdPlace.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              3rd Place
            </h2>
            <div className="flex-1 border-t border-navy-border" />
          </div>
          <div className="grid grid-cols-1 max-w-[220px] gap-3">
            {thirdPlace.map((m) => (
              <MatchCard key={m.id} match={m} groupId={groupId} />
            ))}
          </div>
        </section>
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
