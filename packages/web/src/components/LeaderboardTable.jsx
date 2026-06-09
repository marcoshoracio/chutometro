import React from 'react';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardTable({ entries, currentUserId }) {
  if (!entries || entries.length === 0) {
    return (
      <div className="card p-8 text-center text-muted">
        Nenhum dado ainda. Os pontos aparecem após o primeiro resultado.
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-navy-border">
            <th className="text-left px-3 sm:px-4 py-3 text-muted font-medium text-xs w-8">#</th>
            <th className="text-left px-2 sm:px-4 py-3 text-muted font-medium text-xs">Jogador</th>
            <th className="text-right px-2 sm:px-4 py-3 text-muted font-medium text-xs">Pts</th>
            <th className="text-right px-2 sm:px-4 py-3 text-muted font-medium text-xs hidden sm:table-cell">Exatos</th>
            <th className="text-right px-2 sm:px-4 py-3 text-muted font-medium text-xs hidden sm:table-cell">Acertos</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, idx) => {
            const isMe = entry.userId === currentUserId;
            const medal = MEDALS[idx] || null;

            return (
              <tr
                key={entry.userId}
                className={`border-b border-navy-border last:border-0 transition-colors ${
                  isMe ? 'bg-pitch/10' : 'hover:bg-navy-border/30'
                }`}
              >
                <td className="px-3 sm:px-4 py-3 text-center">
                  {medal ? (
                    <span className="text-base">{medal}</span>
                  ) : (
                    <span className="text-muted text-xs">{entry.rank}</span>
                  )}
                </td>
                <td className="px-2 sm:px-4 py-3">
                  <span className={`font-medium ${isMe ? 'text-pitch-light' : 'text-white'}`}>
                    {entry.displayName}
                    {isMe && <span className="ml-1 text-xs text-muted">(você)</span>}
                  </span>
                </td>
                <td className="px-2 sm:px-4 py-3 text-right">
                  <span className="font-bold text-gold text-base">{entry.totalPoints}</span>
                </td>
                <td className="px-2 sm:px-4 py-3 text-right hidden sm:table-cell text-muted">
                  {entry.exactScores}
                </td>
                <td className="px-2 sm:px-4 py-3 text-right hidden sm:table-cell text-muted">
                  {entry.correctResults}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
