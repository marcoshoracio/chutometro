import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';
import LeaderboardTable from '../components/LeaderboardTable';

const TABS = [
  { key: 'ALL', label: 'Overall' },
  { key: 'GROUP_STAGE', label: 'Group Stage' },
  { key: 'TODAY', label: 'Today' },
];

export default function Leaderboard() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const [tab, setTab] = useState('ALL');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    api.get(`/groups/${groupId}/leaderboard?stage=${tab}`)
      .then((d) => setData(d))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [groupId, tab]);

  return (
    <div className="space-y-5">
      <h1 className="font-bold text-xl">Leaderboard</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-navy-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? 'border-pitch-light text-pitch-light'
                : 'border-transparent text-muted hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-2 border-pitch-light border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="card p-6 text-red-400 text-center">{error}</div>
      )}

      {!loading && !error && data && (
        <LeaderboardTable entries={data.leaderboard} currentUserId={user?.id} />
      )}

      {/* Legend */}
      <div className="card p-4 text-xs text-muted space-y-1">
        <p className="font-semibold text-white text-sm mb-2">How to score</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <span>Exact score</span><span className="text-gold font-bold">10 pts</span>
          <span>Winner + goal difference</span><span className="text-gold font-bold">6 pts</span>
          <span>Correct winner</span><span className="text-gold font-bold">3 pts</span>
          <span>Reversed totals</span><span className="text-pitch-light font-bold">+2 bonus</span>
          <span>Correct total goals</span><span className="text-pitch-light font-bold">+1 bonus</span>
          <span>Streak of 3</span><span className="text-pitch-light font-bold">+1 bonus</span>
        </div>
        <p className="mt-2">Multipliers: Groups ×1 · R32 ×1.5 · R16 ×2 · QF ×3 · SF ×4 · Final ×5</p>
      </div>
    </div>
  );
}
