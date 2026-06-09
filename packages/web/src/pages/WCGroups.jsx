import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { getFlag } from '../utils/flags';

export default function WCGroups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/wc-groups')
      .then((d) => setGroups(d.groups))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error) return <div className="card p-6 text-red-400 text-center">{error}</div>;

  return (
    <div className="space-y-5">
      <h1 className="font-bold text-xl">Grupos da Copa do Mundo 2026</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {groups.map((g) => (
          <GroupCard key={g.group} group={g} />
        ))}
      </div>
    </div>
  );
}

function GroupCard({ group }) {
  return (
    <div className="bg-navy-card border border-navy-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-navy-border">
        <h2 className="font-bold text-base">Grupo {group.group}</h2>
      </div>

      {/* Table */}
      <table className="w-full text-xs sm:text-sm">
        <thead>
          <tr className="border-b border-navy-border">
            <th className="text-left px-3 py-2 text-muted font-medium">Seleção</th>
            <th className="text-center px-2 py-2 text-muted font-medium w-7" title="Jogos">J</th>
            <th className="text-center px-2 py-2 text-muted font-medium w-7" title="Vitórias">V</th>
            <th className="text-center px-2 py-2 text-muted font-medium w-7" title="Empates">E</th>
            <th className="text-center px-2 py-2 text-muted font-medium w-7" title="Derrotas">D</th>
            <th className="text-center px-2 py-2 text-muted font-medium w-10" title="Saldo de Gols">SG</th>
            <th className="text-center px-2 py-2 text-muted font-medium w-8 text-gold" title="Pontos">P</th>
          </tr>
        </thead>
        <tbody>
          {group.teams.map((team, idx) => {
            const advances = idx < 2;
            return (
              <tr
                key={team.name}
                className={`border-b border-navy-border last:border-0 ${
                  advances ? 'bg-green-900/20' : ''
                }`}
              >
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    {advances && (
                      <span className="w-1 h-4 rounded-full bg-pitch-light flex-shrink-0" />
                    )}
                    <span className="text-base leading-none">{getFlag(team.name)}</span>
                    <span className={`font-medium truncate max-w-[120px] ${advances ? 'text-white' : 'text-muted'}`}>
                      {team.name}
                    </span>
                  </div>
                </td>
                <td className="text-center px-2 py-2 tabular-nums text-muted">{team.played}</td>
                <td className="text-center px-2 py-2 tabular-nums text-muted">{team.won}</td>
                <td className="text-center px-2 py-2 tabular-nums text-muted">{team.drawn}</td>
                <td className="text-center px-2 py-2 tabular-nums text-muted">{team.lost}</td>
                <td className={`text-center px-2 py-2 tabular-nums ${
                  team.gd > 0 ? 'text-pitch-light' : team.gd < 0 ? 'text-red-400' : 'text-muted'
                }`}>
                  {team.gd > 0 ? `+${team.gd}` : team.gd}
                </td>
                <td className="text-center px-2 py-2 tabular-nums font-bold text-gold">{team.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Legend */}
      <div className="px-3 py-2 border-t border-navy-border flex items-center gap-1.5">
        <span className="w-1 h-3 rounded-full bg-pitch-light" />
        <span className="text-xs text-muted">Classificados para as oitavas</span>
      </div>
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
