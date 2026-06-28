'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');

module.exports = function preTournamentRoutes(db) {
  const router = express.Router({ mergeParams: true });

  // POST /api/groups/:groupId/pre-tournament
  router.post('/', authenticate, (req, res) => {
    const { groupId } = req.params;
    const { champion, runnerUp, topScorer } = req.body;

    const member = db
      .prepare('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?')
      .get(groupId, req.user.userId);
    if (!member) return res.status(403).json({ error: 'You are not a member of this group' });

    const group = db.prepare('SELECT settings FROM groups WHERE id = ?').get(groupId);
    const settings = JSON.parse(group?.settings || '{}');
    if (!settings.pre_tournament_enabled) {
      return res.status(400).json({ error: 'Pre-tournament predictions are not enabled for this group' });
    }

    const now = Math.floor(Date.now() / 1000);
    const id = uuidv4();

    db.prepare(`
      INSERT INTO pre_tournament_predictions (id, user_id, group_id, champion, runner_up, top_scorer, submitted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, group_id) DO UPDATE SET
        champion = excluded.champion,
        runner_up = excluded.runner_up,
        top_scorer = excluded.top_scorer,
        submitted_at = excluded.submitted_at
    `).run(id, req.user.userId, groupId, champion || null, runnerUp || null, topScorer || null, now);

    const pred = db
      .prepare('SELECT * FROM pre_tournament_predictions WHERE user_id = ? AND group_id = ?')
      .get(req.user.userId, groupId);

    res.json({ prediction: formatPred(pred) });
  });

  // GET /api/groups/:groupId/pre-tournament
  router.get('/', authenticate, (req, res) => {
    const { groupId } = req.params;

    const member = db
      .prepare('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?')
      .get(groupId, req.user.userId);
    if (!member) return res.status(403).json({ error: 'You are not a member of this group' });

    const pred = db
      .prepare('SELECT * FROM pre_tournament_predictions WHERE user_id = ? AND group_id = ?')
      .get(req.user.userId, groupId);

    // All members' predictions (visible to everyone)
    const all = db.prepare(`
      SELECT ptp.*, u.display_name
      FROM pre_tournament_predictions ptp
      JOIN users u ON u.id = ptp.user_id
      WHERE ptp.group_id = ?
      ORDER BY ptp.points DESC, u.display_name ASC
    `).all(groupId);

    // Teams from Round of 32 — exclude slot codes (short uppercase codes like TBD, 1G, 3ABCDF)
    const r32Rows = db.prepare(`
      SELECT home_team, away_team FROM matches WHERE stage = 'ROUND_OF_32'
    `).all();
    const teamSet = new Set();
    for (const row of r32Rows) {
      for (const t of [row.home_team, row.away_team]) {
        if (t && t !== 'TBD' && !/^[0-9]/.test(t) && !/^[A-Z]{1,3}$/.test(t) && !/^3[A-Z]+$/.test(t)) {
          teamSet.add(t);
        }
      }
    }
    const teams = [...teamSet].sort((a, b) => a.localeCompare(b));

    res.json({
      prediction: pred ? formatPred(pred) : null,
      allPredictions: all.map((p) => ({ ...formatPred(p), displayName: p.display_name })),
      teams,
    });
  });

  function formatPred(p) {
    return {
      id: p.id,
      userId: p.user_id,
      groupId: p.group_id,
      champion: p.champion,
      runnerUp: p.runner_up,
      topScorer: p.top_scorer,
      submittedAt: p.submitted_at,
    };
  }

  return router;
};
