'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth');

module.exports = function matchRoutes(db) {
  const router = express.Router({ mergeParams: true });

  // GET /api/groups/:groupId/matches
  router.get('/', authenticate, (req, res) => {
    const { groupId } = req.params;

    // Check membership
    const member = db
      .prepare('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?')
      .get(groupId, req.user.userId);
    if (!member) return res.status(403).json({ error: 'Você não é membro deste grupo' });

    const matches = db.prepare(
      "SELECT * FROM matches WHERE stage != 'GROUP_STAGE' ORDER BY kickoff_at ASC"
    ).all();
    const userId = req.user.userId;
    const deadline = 1800; // 30 min before kickoff

    const result = matches.map((m) => {
      const prediction = db
        .prepare('SELECT * FROM predictions WHERE user_id = ? AND group_id = ? AND match_id = ?')
        .get(userId, groupId, m.id);

      const score = db
        .prepare('SELECT * FROM scores WHERE user_id = ? AND group_id = ? AND match_id = ?')
        .get(userId, groupId, m.id);

      const now = Math.floor(Date.now() / 1000);
      const locked = now >= m.kickoff_at - deadline;

      return {
        ...formatMatch(m),
        locked,
        prediction: prediction
          ? { homeGuess: prediction.home_guess, awayGuess: prediction.away_guess, jokerUsed: prediction.joker_used === 1 }
          : null,
        score: score
          ? { base: score.base_points, bonus: score.bonus_points, multiplier: score.multiplier, final: score.final_points }
          : null,
      };
    });

    res.json({ matches: result });
  });

  // GET /api/groups/:groupId/matches/:matchId
  router.get('/:matchId', authenticate, (req, res) => {
    const { groupId, matchId } = req.params;

    const member = db
      .prepare('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?')
      .get(groupId, req.user.userId);
    if (!member) return res.status(403).json({ error: 'Você não é membro deste grupo' });

    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
    if (!match) return res.status(404).json({ error: 'Jogo não encontrado' });

    const prediction = db
      .prepare('SELECT * FROM predictions WHERE user_id = ? AND group_id = ? AND match_id = ?')
      .get(req.user.userId, groupId, matchId);

    const score = db
      .prepare('SELECT * FROM scores WHERE user_id = ? AND group_id = ? AND match_id = ?')
      .get(req.user.userId, groupId, matchId);

    // All predictions for this match (after deadline, show others)
    const now = Math.floor(Date.now() / 1000);
    const deadline = 1800;
    const locked = now >= match.kickoff_at - deadline;

    let allPredictions = [];
    if (locked || match.status === 'FINISHED') {
      allPredictions = db.prepare(`
        SELECT p.*, u.display_name, s.final_points
        FROM predictions p
        JOIN users u ON u.id = p.user_id
        LEFT JOIN scores s ON s.user_id = p.user_id AND s.group_id = p.group_id AND s.match_id = p.match_id
        WHERE p.group_id = ? AND p.match_id = ?
        ORDER BY s.final_points DESC NULLS LAST
      `).all(groupId, matchId);
    }

    res.json({
      match: formatMatch(match),
      locked,
      prediction: prediction
        ? { homeGuess: prediction.home_guess, awayGuess: prediction.away_guess, jokerUsed: prediction.joker_used === 1 }
        : null,
      score: score
        ? { base: score.base_points, bonus: score.bonus_points, multiplier: score.multiplier, final: score.final_points }
        : null,
      allPredictions: allPredictions.map((p) => ({
        userId: p.user_id,
        displayName: p.display_name,
        homeGuess: p.home_guess,
        awayGuess: p.away_guess,
        jokerUsed: p.joker_used === 1,
        finalPoints: p.final_points ?? null,
      })),
    });
  });

  function formatMatch(m) {
    return {
      id: m.id,
      stage: m.stage,
      matchNumber: m.match_number,
      homeTeam: m.home_team,
      awayTeam: m.away_team,
      kickoffAt: m.kickoff_at,
      homeScore: m.home_score,
      awayScore: m.away_score,
      status: m.status,
    };
  }

  return router;
};
