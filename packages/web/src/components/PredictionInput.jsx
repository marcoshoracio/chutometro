import React, { useState } from 'react';
import { getFlag } from '../utils/flags';

export default function PredictionInput({
  homeTeam,
  awayTeam,
  initialHome = '',
  initialAway = '',
  onSubmit,
  loading = false,
  locked = false,
  jokerAvailable = false,
  initialJoker = false,
}) {
  const [home, setHome] = useState(initialHome !== '' ? String(initialHome) : '');
  const [away, setAway] = useState(initialAway !== '' ? String(initialAway) : '');
  const [joker, setJoker] = useState(initialJoker);

  function handleSubmit(e) {
    e.preventDefault();
    if (home === '' || away === '') return;
    onSubmit({ homeGuess: parseInt(home, 10), awayGuess: parseInt(away, 10), jokerUsed: joker });
  }

  function ScoreInput({ value, onChange, label }) {
    return (
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs text-muted font-medium truncate max-w-[90px] text-center">{label}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onChange(Math.max(0, parseInt(value || 0, 10) - 1))}
            disabled={locked}
            className="w-8 h-8 rounded-lg bg-navy-border hover:bg-pitch disabled:opacity-30 text-white font-bold transition-colors"
          >
            –
          </button>
          <input
            type="number"
            min="0"
            max="99"
            value={value}
            onChange={(e) => onChange(Math.max(0, parseInt(e.target.value || 0, 10)))}
            disabled={locked}
            className="w-14 h-14 text-center text-3xl font-bold bg-navy border-2 border-navy-border rounded-xl text-white focus:outline-none focus:border-pitch-light disabled:opacity-50 tabular-nums"
          />
          <button
            type="button"
            onClick={() => onChange(parseInt(value || 0, 10) + 1)}
            disabled={locked}
            className="w-8 h-8 rounded-lg bg-navy-border hover:bg-pitch disabled:opacity-30 text-white font-bold transition-colors"
          >
            +
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center gap-6">
      <div className="flex items-center gap-4 sm:gap-8">
        <ScoreInput
          value={home}
          onChange={(v) => setHome(String(v))}
          label={`${homeTeam} ${getFlag(homeTeam)}`}
        />
        <span className="text-3xl font-bold text-muted mt-6">–</span>
        <ScoreInput
          value={away}
          onChange={(v) => setAway(String(v))}
          label={`${getFlag(awayTeam)} ${awayTeam}`}
        />
      </div>

      {jokerAvailable && !locked && (
        <label className="flex items-center gap-2 cursor-pointer">
          <div
            onClick={() => setJoker(!joker)}
            className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${
              joker ? 'bg-gold' : 'bg-navy-border'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                joker ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </div>
          <span className="text-sm font-medium">
            Usar Joker <span className="text-gold">★</span>
          </span>
        </label>
      )}

      {!locked && (
        <button
          type="submit"
          disabled={loading || home === '' || away === ''}
          className="btn-primary w-full max-w-xs text-base py-3"
        >
          {loading ? 'Enviando...' : initialHome !== '' ? 'Atualizar Chute' : 'Enviar Chute'}
        </button>
      )}

      {locked && (
        <div className="text-center text-muted text-sm">
          <span className="text-red-400 font-semibold">Prazo encerrado</span> — palpites não são mais aceitos
        </div>
      )}
    </form>
  );
}
