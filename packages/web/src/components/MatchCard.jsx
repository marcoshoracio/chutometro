import React from 'react';
import { Link, useParams } from 'react-router-dom';
import CountdownTimer from './CountdownTimer';
import { getFlag } from '../utils/flags';

const STAGE_LABELS = {
  GROUP_STAGE: 'Fase de Grupos',
  ROUND_OF_32: 'Oitavas de Final',
  ROUND_OF_16: 'Quartas de Final',
  QUARTER_FINALS: 'Quartas de Final',
  SEMI_FINALS: 'Semifinal',
  THIRD_PLACE: '3º Lugar',
  FINAL: 'Final',
};

export default function MatchCard({ match, prediction, score, compact = false }) {
  const { groupId } = useParams();

  const kickoff = new Date(match.kickoffAt * 1000);
  const dateStr = kickoff.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const timeStr = kickoff.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const finished = match.status === 'FINISHED';
  const live = match.status === 'LIVE';

  return (
    <Link
      to={`/g/${groupId}/fixtures/${match.id}`}
      className="card p-3 sm:p-4 flex flex-col gap-2 hover:border-pitch transition-colors"
    >
      {/* Header row */}
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{STAGE_LABELS[match.stage] || match.stage}</span>
        <div className="flex items-center gap-2">
          {live && (
            <span className="badge bg-red-500/20 text-red-400 animate-pulse">AO VIVO</span>
          )}
          {!finished && !live && <CountdownTimer kickoffAt={match.kickoffAt} />}
          {finished && <span className="badge bg-green-500/10 text-green-400">Encerrado</span>}
        </div>
      </div>

      {/* Teams + Score */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Home */}
        <div className="flex-1 text-right">
          <span className="font-semibold text-sm sm:text-base">
            {match.homeTeam} {getFlag(match.homeTeam)}
          </span>
        </div>

        {/* Score / Time */}
        <div className="flex items-center gap-1 min-w-[80px] justify-center">
          {finished || live ? (
            <>
              <span className="text-xl font-bold tabular-nums">{match.homeScore}</span>
              <span className="text-muted font-bold">–</span>
              <span className="text-xl font-bold tabular-nums">{match.awayScore}</span>
            </>
          ) : (
            <div className="text-center">
              <div className="text-xs text-muted">{dateStr}</div>
              <div className="text-sm font-semibold">{timeStr}</div>
            </div>
          )}
        </div>

        {/* Away */}
        <div className="flex-1">
          <span className="font-semibold text-sm sm:text-base">
            {getFlag(match.awayTeam)} {match.awayTeam}
          </span>
        </div>
      </div>

      {/* Prediction / Score row */}
      {!compact && (
        <div className="flex items-center justify-between border-t border-navy-border pt-2 mt-1">
          {prediction ? (
            <span className="text-xs text-muted">
              Seu chute:{' '}
              <span className="text-white font-medium">
                {prediction.homeGuess} – {prediction.awayGuess}
              </span>
              {prediction.jokerUsed && (
                <span className="ml-1 badge bg-gold/20 text-gold">Joker</span>
              )}
            </span>
          ) : (
            <span className="text-xs text-muted italic">
              {match.locked ? 'Sem palpite' : 'Chute não enviado'}
            </span>
          )}

          {score && (
            <span className="text-xs font-bold text-gold">+{score.final} pts</span>
          )}
          {!score && match.status === 'FINISHED' && prediction && (
            <span className="text-xs text-muted">0 pts</span>
          )}
          {match.locked && !finished && (
            <span className="badge bg-red-500/10 text-red-400 text-xs">Bloqueado</span>
          )}
        </div>
      )}
    </Link>
  );
}
