import React from 'react';

const SCORE_OUTCOMES = [
  {
    label: 'Placar exato',
    example: 'Chutou 2–1, deu 2–1',
    pts: 10,
    color: 'border-pitch/60 bg-pitch/10',
    badge: 'bg-pitch/20 text-pitch-light',
  },
  {
    label: 'Vencedor + saldo correto',
    example: 'Chutou 3–1, deu 2–0',
    pts: 6,
    color: 'border-blue-500/40 bg-blue-500/5',
    badge: 'bg-blue-500/20 text-blue-300',
  },
  {
    label: 'Vencedor correto',
    example: 'Chutou 1–0, deu 3–1',
    pts: 3,
    color: 'border-navy-border bg-navy-card',
    badge: 'bg-navy-border text-muted',
  },
  {
    label: 'Resultado errado',
    example: 'Chutou 0–1, deu 1–0',
    pts: 0,
    color: 'border-navy-border/50 bg-navy-card/30',
    badge: 'bg-navy-border/50 text-muted/60',
  },
];

const BONUSES = [
  {
    icon: '🔥',
    label: 'Sequência (streak)',
    detail: 'A cada 3 palpites corretos consecutivos, +1 pt de bônus extra.',
    pts: '+1 pt',
  },
];

const MULTIPLIERS = [
  { stage: 'Oitavas de Final', mult: '×1',   color: 'text-white' },
  { stage: 'Quartas de Final', mult: '×1.5', color: 'text-blue-300' },
  { stage: 'Semifinais',       mult: '×2',   color: 'text-gold' },
  { stage: '3º Lugar',         mult: '×3',   color: 'text-orange-400' },
  { stage: 'Final 4',          mult: '×4',   color: 'text-orange-400' },
  { stage: 'Final',            mult: '×5',   color: 'text-pitch-light font-bold' },
];

const PRE_TOURNAMENT = [
  { label: 'Campeão correto',      pts: '+10 pts', icon: '🏆' },
  { label: 'Vice-campeão correto', pts: '+5 pts',  icon: '🥈' },
  { label: 'Artilheiro correto',   pts: '+5 pts',  icon: '⚽' },
];

export default function Rules() {
  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-4">
      <div>
        <h1 className="font-bold text-xl">Regras do Bolão</h1>
        <p className="text-muted text-sm mt-1">
          Como funciona a pontuação e as regras gerais do Chutômetro.
        </p>
      </div>

      {/* Deadline */}
      <Section title="Prazo para palpites">
        <div className="card p-4 flex gap-3 items-start">
          <span className="text-2xl">⏱️</span>
          <div>
            <p className="font-medium text-sm text-white">30 minutos antes do apito inicial</p>
            <p className="text-xs text-muted mt-0.5">
              Após esse prazo, o palpite fica bloqueado e não pode mais ser enviado ou alterado.
              Os palpites dos outros jogadores ficam visíveis a partir desse momento.
            </p>
          </div>
        </div>
      </Section>

      {/* Base scoring */}
      <Section title="Pontuação base">
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
      <Section title="Multiplicadores por fase">
        <p className="text-xs text-muted mb-3">
          A pontuação final é <strong className="text-white">(base + bônus) × multiplicador</strong>.
          Quanto mais avançada a fase, mais valem os acertos.
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
          Exemplo: placar exato na Final = 10 × 5 = <span className="text-gold font-bold">50 pts</span>.
          Placar exato nas Oitavas = 10 × 1 = <span className="text-gold font-bold">10 pts</span>.
        </p>
      </Section>

      {/* Bonuses */}
      <Section title="Bônus">
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
          Bônus são somados à base <em>antes</em> de aplicar o multiplicador de fase.
        </p>
      </Section>

      {/* Pre-tournament */}
      <Section title="Palpites pré-torneio">
        <p className="text-xs text-muted mb-3">
          Antes do torneio começar, cada jogador pode prever o campeão, o vice e o artilheiro.
          Os pontos são somados ao total geral da classificação.
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
      <Section title="Critérios de desempate">
        <div className="card p-4 space-y-2">
          {[
            'Maior número de placares exatos',
            'Maior número de resultados corretos (vencedor acertado)',
            'Ordem alfabética pelo nome',
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
