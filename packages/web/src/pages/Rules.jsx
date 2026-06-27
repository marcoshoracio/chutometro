import React from 'react';

const SCORE_OUTCOMES = [
  {
    label: 'Exact score',
    example: 'Predicted 2–1, result 2–1',
    pts: 10,
    color: 'border-pitch/60 bg-pitch/10',
    badge: 'bg-pitch/20 text-pitch-light',
  },
  {
    label: 'Correct winner + goal difference',
    example: 'Predicted 3–1, result 2–0',
    pts: 6,
    color: 'border-blue-500/40 bg-blue-500/5',
    badge: 'bg-blue-500/20 text-blue-300',
  },
  {
    label: 'Correct winner',
    example: 'Predicted 1–0, result 3–1',
    pts: 3,
    color: 'border-navy-border bg-navy-card',
    badge: 'bg-navy-border text-muted',
  },
  {
    label: 'Wrong result',
    example: 'Predicted 0–1, result 1–0',
    pts: 0,
    color: 'border-navy-border/50 bg-navy-card/30',
    badge: 'bg-navy-border/50 text-muted/60',
  },
];

const BONUSES = [
  {
    icon: '🔥',
    label: 'Streak',
    detail: 'Every 3 consecutive correct predictions, +1 extra bonus point.',
    pts: '+1 pt',
  },
];

const MULTIPLIERS = [
  { stage: 'Round of 32',  mult: '×1',   color: 'text-white' },
  { stage: 'Round of 16',  mult: '×1.5', color: 'text-blue-300' },
  { stage: 'Quarterfinals', mult: '×2',  color: 'text-gold' },
  { stage: '3rd Place',    mult: '×3',   color: 'text-orange-400' },
  { stage: 'Semifinals',   mult: '×4',   color: 'text-orange-400' },
  { stage: 'Final',        mult: '×5',   color: 'text-pitch-light font-bold' },
];

const PRE_TOURNAMENT = [
  { label: 'Correct champion',   pts: '+10 pts', icon: '🏆' },
  { label: 'Correct runner-up',  pts: '+5 pts',  icon: '🥈' },
  { label: 'Correct top scorer', pts: '+5 pts',  icon: '⚽' },
];

export default function Rules() {
  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-4">
      <div>
        <h1 className="font-bold text-xl">Bolão Rules</h1>
        <p className="text-muted text-sm mt-1">
          How scoring works and the general rules of Chutômetro.
        </p>
      </div>

      {/* Deadline */}
      <Section title="Prediction deadline">
        <div className="card p-4 flex gap-3 items-start">
          <span className="text-2xl">⏱️</span>
          <div>
            <p className="font-medium text-sm text-white">30 minutes before kickoff</p>
            <p className="text-xs text-muted mt-0.5">
              After this deadline, the prediction is locked and can no longer be submitted or changed.
              Other players' predictions become visible from that point on.
            </p>
          </div>
        </div>
      </Section>

      {/* Base scoring */}
      <Section title="Base scoring">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SCORE_OUTCOMES.map((o) => (
            <div key={o.label} className={`rounded-xl border p-4 ${o.color}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-sm text-white leading-tight">{o.label}</p>
                <span className={`text-lg font-mono font-bold tabular-nums shrink-0 px-2 py-0.5 rounded-lg ${o.badge}`}>
                  {o.pts}
                </span>
              </div>
              <p className="text-xs text-muted mt-2">{o.example}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Multipliers */}
      <Section title="Stage multipliers">
        <p className="text-xs text-muted mb-3">
          The final score is <strong className="text-white">(base + bonus) × multiplier</strong>.
          The further the stage, the more your correct predictions are worth.
        </p>
        <div className="card overflow-hidden">
          <div className="divide-y divide-navy-border">
            {MULTIPLIERS.map((m) => (
              <div key={m.stage} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-muted">{m.stage}</span>
                <span className={`font-mono font-bold text-sm tabular-nums ${m.color}`}>{m.mult}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted mt-2">
          Example: exact score in the Final = 10 × 5 = <span className="text-gold font-bold">50 pts</span>.
          Exact score in the Round of 32 = 10 × 1 = <span className="text-gold font-bold">10 pts</span>.
        </p>
      </Section>

      {/* Bonuses */}
      <Section title="Bonuses">
        <div className="space-y-2">
          {BONUSES.map((b) => (
            <div key={b.label} className="card p-4 flex gap-3 items-start">
              <span className="text-xl shrink-0">{b.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm text-white">{b.label}</p>
                  <span className="text-gold font-bold font-mono text-sm tabular-nums shrink-0">{b.pts}</span>
                </div>
                <p className="text-xs text-muted mt-0.5">{b.detail}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted mt-2">
          Bonuses are added to the base <em>before</em> applying the stage multiplier.
        </p>
      </Section>

      {/* Pre-tournament */}
      <Section title="Pre-tournament predictions">
        <p className="text-xs text-muted mb-3">
          Before the tournament starts, each player can predict the champion, runner-up and top scorer.
          Points are added to the overall leaderboard total.
        </p>
        <div className="card overflow-hidden">
          <div className="divide-y divide-navy-border">
            {PRE_TOURNAMENT.map((p) => (
              <div key={p.label} className="flex items-center gap-3 px-4 py-3">
                <span className="text-lg">{p.icon}</span>
                <span className="flex-1 text-sm text-white">{p.label}</span>
                <span className="font-mono font-bold text-sm text-gold tabular-nums">{p.pts}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Tiebreaker */}
      <Section title="Tiebreaker criteria">
        <div className="card p-4 space-y-2">
          {[
            'Most exact scores',
            'Most correct results (correct winner)',
            'Alphabetical order by name',
          ].map((rule, i) => (
            <div key={i} className="flex gap-3 items-start">
              <span className="font-mono text-xs text-muted/60 pt-0.5 w-4 shrink-0 tabular-nums">{i + 1}.</span>
              <span className="text-sm text-muted">{rule}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-bold text-pitch-light uppercase tracking-widest">{title}</h2>
      {children}
    </section>
  );
}
