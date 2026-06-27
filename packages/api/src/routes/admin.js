'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticate, requireGroupAdmin } = require('../middleware/auth');
const { syncAllMatches } = require('../services/football-api');

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

module.exports = function adminRoutes(db) {
  const router = express.Router({ mergeParams: true });

  // GET /api/groups/:groupId/admin
  router.get('/', authenticate, requireGroupAdmin(db), (req, res) => {
    const { groupId } = req.params;
    const group = req.group;

    const members = db.prepare(`
      SELECT u.id, u.email, u.display_name, gm.joined_at,
        COALESCE(SUM(s.final_points), 0) as total_points
      FROM group_members gm
      JOIN users u ON u.id = gm.user_id
      LEFT JOIN scores s ON s.user_id = u.id AND s.group_id = gm.group_id
      WHERE gm.group_id = ?
      GROUP BY u.id
      ORDER BY total_points DESC
    `).all(groupId);

    const matches = db.prepare(`
      SELECT * FROM matches ORDER BY kickoff_at ASC
    `).all();

    res.json({
      group: {
        id: group.id,
        name: group.name,
        code: group.code,
        adminId: group.admin_id,
        settings: JSON.parse(group.settings || '{}'),
        createdAt: group.created_at,
      },
      members: members.map((m) => ({
        id: m.id,
        email: m.email,
        displayName: m.display_name,
        joinedAt: m.joined_at,
        totalPoints: m.total_points,
        isAdmin: m.id === group.admin_id,
      })),
      matches: matches.map((m) => ({
        id: m.id,
        matchNumber: m.match_number,
        stage: m.stage,
        homeTeam: m.home_team,
        awayTeam: m.away_team,
        kickoffAt: m.kickoff_at,
        homeScore: m.home_score,
        awayScore: m.away_score,
        status: m.status,
      })),
    });
  });

  // PUT /api/groups/:groupId/settings
  router.put('/settings', authenticate, requireGroupAdmin(db), (req, res) => {
    const { groupId } = req.params;
    const { jokerEnabled, preTournamentEnabled, knockout90minOnly } = req.body;

    const group = req.group;
    const current = JSON.parse(group.settings || '{}');

    if (jokerEnabled !== undefined) current.joker_enabled = Boolean(jokerEnabled);
    if (preTournamentEnabled !== undefined) current.pre_tournament_enabled = Boolean(preTournamentEnabled);
    if (knockout90minOnly !== undefined) current.knockout_90min_only = Boolean(knockout90minOnly);

    db.prepare('UPDATE groups SET settings = ? WHERE id = ?').run(JSON.stringify(current), groupId);

    res.json({ settings: current });
  });

  // POST /api/groups/:groupId/invite — regenerate invite code
  router.post('/invite', authenticate, requireGroupAdmin(db), (req, res) => {
    const { groupId } = req.params;

    let code;
    let attempts = 0;
    do {
      code = generateCode();
      attempts++;
      if (attempts > 20) return res.status(500).json({ error: 'Could not generate unique code' });
    } while (db.prepare('SELECT id FROM groups WHERE code = ? AND id != ?').get(code, groupId));

    db.prepare('UPDATE groups SET code = ? WHERE id = ?').run(code, groupId);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.json({
      code,
      inviteUrl: `${frontendUrl}/join?code=${code}`,
    });
  });

  // POST /api/groups/:groupId/admin/sync — force a match sync from football-data.org
  router.post('/sync', authenticate, requireGroupAdmin(db), async (req, res) => {
    try {
      await syncAllMatches();
      res.json({ message: 'Sync complete' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PATCH /api/groups/:groupId/admin/matches/:matchId/teams — update team names manually
  router.patch('/matches/:matchId/teams', authenticate, requireGroupAdmin(db), (req, res) => {
    const { matchId } = req.params;
    const { homeTeam, awayTeam } = req.body;
    if (!homeTeam && !awayTeam) return res.status(400).json({ error: 'Provide at least one team name' });

    const match = db.prepare('SELECT id FROM matches WHERE id = ?').get(matchId);
    if (!match) return res.status(404).json({ error: 'Match not found' });

    if (homeTeam) db.prepare('UPDATE matches SET home_team = ? WHERE id = ?').run(homeTeam.trim(), matchId);
    if (awayTeam) db.prepare('UPDATE matches SET away_team = ? WHERE id = ?').run(awayTeam.trim(), matchId);

    res.json({ message: 'Teams updated' });
  });

  // POST /api/groups/:groupId/admin/pre-tournament-results — set correct answers and score predictions
  router.post('/pre-tournament-results', authenticate, requireGroupAdmin(db), (req, res) => {
    const { groupId } = req.params;
    const { champion, runnerUp, topScorer } = req.body;

    // Store results in group settings
    const group = req.group;
    const settings = JSON.parse(group.settings || '{}');
    settings.pre_tournament_results = {
      champion: champion || null,
      runnerUp: runnerUp || null,
      topScorer: topScorer || null,
    };
    db.prepare('UPDATE groups SET settings = ? WHERE id = ?').run(JSON.stringify(settings), groupId);

    // Recalculate points for all predictions in this group
    const preds = db.prepare(
      'SELECT * FROM pre_tournament_predictions WHERE group_id = ?'
    ).all(groupId);

    const updatePoints = db.prepare(
      'UPDATE pre_tournament_predictions SET points = ? WHERE user_id = ? AND group_id = ?'
    );

    const recalc = db.transaction(() => {
      for (const pred of preds) {
        let pts = 0;
        if (champion && pred.champion && pred.champion.toLowerCase() === champion.toLowerCase()) pts += 10;
        if (runnerUp && pred.runner_up && pred.runner_up.toLowerCase() === runnerUp.toLowerCase()) pts += 5;
        if (topScorer && pred.top_scorer && pred.top_scorer.trim().toLowerCase() === topScorer.trim().toLowerCase()) pts += 5;
        updatePoints.run(pts, pred.user_id, groupId);
      }
    });
    recalc();

    res.json({ message: 'Results saved and points calculated', results: settings.pre_tournament_results });
  });

  // GET /api/groups/:groupId/admin/pre-tournament-results
  router.get('/pre-tournament-results', authenticate, requireGroupAdmin(db), (req, res) => {
    const { groupId } = req.params;
    const group = req.group;
    const settings = JSON.parse(group.settings || '{}');
    res.json({ results: settings.pre_tournament_results || null });
  });

  // DELETE /api/groups/:groupId/members/:userId
  router.delete('/members/:userId', authenticate, requireGroupAdmin(db), (req, res) => {
    const { groupId } = req.params;
    const { userId } = req.params;

    if (userId === req.user.userId) {
      return res.status(400).json({ error: 'You cannot remove yourself as administrator' });
    }

    const result = db
      .prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?')
      .run(groupId, userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    res.json({ message: 'Member removed successfully' });
  });

  return router;
};
