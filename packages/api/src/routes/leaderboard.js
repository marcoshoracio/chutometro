'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth');

module.exports = function leaderboardRoutes(db) {
  const router = express.Router({ mergeParams: true });

  // GET /api/groups/:groupId/leaderboard?stage=&matchday=
  router.get('/', authenticate, (req, res) => {
    const { groupId } = req.params;
    const { stage } = req.query;

    const member = db
      .prepare('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?')
      .get(groupId, req.user.userId);
    if (!member) return res.status(403).json({ error: 'You are not a member of this group' });

    let stageFilter = '';
    const args = [groupId];

    if (stage && stage !== 'ALL') {
      stageFilter = 'AND m.stage = ?';
      args.push(stage);
    }

    // Today filter
    let todayFilter = '';
    if (stage === 'TODAY') {
      stageFilter = '';
      const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
      const todayEnd = todayStart + 86400;
      todayFilter = `AND m.kickoff_at >= ${todayStart} AND m.kickoff_at < ${todayEnd}`;
    }

    // Include pre-tournament points only on full leaderboard (no stage/day filter)
    const includePre = !stage || stage === 'ALL';

    const rows = db.prepare(`
      SELECT
        u.id as user_id,
        u.display_name,
        COALESCE(SUM(s.final_points), 0) ${includePre ? '+ COALESCE(MAX(ptp.points), 0)' : ''} as total_points,
        COUNT(CASE WHEN s.base_points = 10 THEN 1 END) as exact_scores,
        COUNT(CASE WHEN s.base_points >= 3 THEN 1 END) as correct_results,
        COUNT(s.id) as predictions_scored,
        ${includePre ? 'COALESCE(MAX(ptp.points), 0)' : '0'} as pre_tournament_points
      FROM group_members gm
      JOIN users u ON u.id = gm.user_id
      LEFT JOIN scores s ON s.user_id = u.id AND s.group_id = gm.group_id
      LEFT JOIN matches m ON m.id = s.match_id
      ${includePre ? 'LEFT JOIN pre_tournament_predictions ptp ON ptp.user_id = u.id AND ptp.group_id = gm.group_id' : ''}
      WHERE gm.group_id = ? ${stageFilter} ${todayFilter}
      GROUP BY u.id, u.display_name
      ORDER BY total_points DESC, exact_scores DESC, u.display_name ASC
    `).all(...args);

    const leaderboard = rows.map((row, idx) => ({
      rank: idx + 1,
      userId: row.user_id,
      displayName: row.display_name,
      totalPoints: row.total_points,
      exactScores: row.exact_scores,
      correctResults: row.correct_results,
      predictionsScored: row.predictions_scored,
      preTournamentPoints: row.pre_tournament_points,
      isCurrentUser: row.user_id === req.user.userId,
    }));

    res.json({ leaderboard });
  });

  return router;
};
