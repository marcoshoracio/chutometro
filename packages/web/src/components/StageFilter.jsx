import React from 'react';

const STAGES = [
  { value: 'ALL', label: 'Todos' },
  { value: 'GROUP_STAGE', label: 'Grupos' },
  { value: 'ROUND_OF_32', label: 'Oitavas' },
  { value: 'ROUND_OF_16', label: 'Quartas' },
  { value: 'QUARTER_FINALS', label: 'Quartas' },
  { value: 'SEMI_FINALS', label: 'Semi' },
  { value: 'THIRD_PLACE', label: '3º Lugar' },
  { value: 'FINAL', label: 'Final' },
];

export default function StageFilter({ value, onChange, availableStages }) {
  const filtered = availableStages
    ? STAGES.filter((s) => s.value === 'ALL' || availableStages.includes(s.value))
    : STAGES;

  // Deduplicate label (ROUND_OF_16 and QUARTER_FINALS both say "Quartas" — only show QUARTER_FINALS)
  const unique = filtered.filter(
    (s, i, arr) => arr.findIndex((x) => x.label === s.label) === i
  );

  return (
    <div className="flex gap-1 flex-wrap">
      {unique.map((stage) => (
        <button
          key={stage.value}
          onClick={() => onChange(stage.value)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            value === stage.value
              ? 'bg-pitch text-white'
              : 'bg-navy-border text-muted hover:text-white'
          }`}
        >
          {stage.label}
        </button>
      ))}
    </div>
  );
}
