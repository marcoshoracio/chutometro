import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';
import MatchCard from '../components/MatchCard';
import CountdownTimer from '../components/CountdownTimer';

export default function Dashboard() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/groups/${groupId}/leaderboard`),
      api.get(`/groups/${groupId}/matches`),
    ])
      .then(([lb, mData]) => {
        setData({ leaderboard: lb.leaderboard, matches: mData.matches });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [groupId]);

  if (loading) return <Spinner />;
  if (error) return <ErrorMsg msg={error} />;

  const KNOCKOUT = ['ROUND_OF_32', 'ROUND_OF_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL'];
  const knockout = data.matches.filter((m) => KNOCKOUT.includes(m.stage));
  const upcoming = knockout
    .filter((m) => m.status === 'SCHEDULED' || m.status === 'LIVE')
    .slice(0, 3);
  const recent = knockout
    .filter((m) => m.status === 'FINISHED')
    .slice(-3)
    .reverse();
  const top5 = data.leaderboard.slice(0, 5);
  const myRank = data.leaderboard.find((e) => e.userId === user?.id);

  return (
    <div className="space-y-6">
      {/* My rank banner */}
      {myRank && (
        <div className="card p-4 flex items-center justify-between bg-gradient-to-r from-pitch/20 to-navy-card border-pitch/30">
          <div>
            <p className="text-xs text-muted">Your position</p>
            <p className="font-bold text-2xl text-white">
              {myRank.rank}º <span className="text-sm font-normal text-muted">place</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted">Points</p>
            <p className="font-bold text-2xl text-gold">{myRank.totalPoints}</p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-xs text-muted">Exact</p>
            <p className="font-bold text-xl text-pitch-light">{myRank.exactScores}</p>
          </div>
        </div>
      )}

      {/* Upcoming matches */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">Upcoming Matches</h2>
          <Link to={`/g/${groupId}/fixtures`} className="text-pitch-light text-sm hover:underline">
            See all
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-muted text-sm">No matches scheduled.</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((m) => (
              <MatchCard key={m.id} match={m} prediction={m.prediction} score={m.score} />
            ))}
          </div>
        )}
      </section>

      {/* Recent results */}
      {recent.length > 0 && (
        <section>
          <h2 className="font-bold text-lg mb-3">Recent Results</h2>
          <div className="space-y-2">
            {recent.map((m) => (
              <MatchCard key={m.id} match={m} prediction={m.prediction} score={m.score} />
            ))}
          </div>
        </section>
      )}

      {/* Top 5 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">Leaderboard</h2>
          <Link to={`/g/${groupId}/leaderboard`} className="text-pitch-light text-sm hover:underline">
            See full
          </Link>
        </div>
        <div className="card overflow-hidden">
          {top5.length === 0 ? (
            <p className="p-4 text-muted text-sm">No scores yet.</p>
          ) : (
            <div className="divide-y divide-navy-border">
              {top5.map((entry, idx) => {
                const medals = ['🥇', '🥈', '🥉'];
                const isMe = entry.userId === user?.id;
                return (
                  <div
                    key={entry.userId}
                    className={`flex items-center px-4 py-3 gap-3 ${isMe ? 'bg-pitch/10' : ''}`}
                  >
                    <span className="w-6 text-center text-base">{medals[idx] || `${idx + 1}`}</span>
                    <span className={`flex-1 font-medium text-sm ${isMe ? 'text-pitch-light' : ''}`}>
                      {entry.displayName}
                      {isMe && <span className="ml-1 text-muted text-xs">(you)</span>}
                    </span>
                    <span className="font-bold text-gold">{entry.totalPoints}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
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

function ErrorMsg({ msg }) {
  return <div className="card p-6 text-red-400 text-center">{msg}</div>;
}
