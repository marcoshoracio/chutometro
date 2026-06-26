'use strict';

const express = require('express');
const { authenticate, requireGroupAdmin } = require('../middleware/auth');
const { recalculateGroupScores } = require('../services/scoring');

module.exports = function resultsRoutes(db) {
  const router = express.Router({ mergeParams: true });

  // POST /api/groups/:groupId/results — admin only
  router.post('/', authenticate, requireGroupAdmin(db), (req, res) => {
    const { groupId } = req.params;
    const { matchId, homeScore, awayScore } = req.body;

    if (matchId === undefined || homeScore === undefined || awayScore === undefined) {
      return res.status(400).json({ error: 'matchId, homeScore e awayScore são obrigatórios' });
    }

    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
    if (!match) return res.status(404).json({ error: 'Jogo não encontrado' });

    const hs = parseInt(homeScore, 10);
    const as_ = parseInt(awayScore, 10);

    if (isNaN(hs) || isNaN(as_) || hs < 0 || as_ < 0) {
      return res.status(400).json({ error: 'Placar inválido' });
    }

    db.prepare(`
      UPDATE matches SET home_score = ?, away_score = ?, status = 'FINISHED', is_manual_override = 1 WHERE id = ?
    `).run(hs, as_, matchId);

    // Recalculate all scores for this match/group
    recalculateGroupScores(db, groupId, matchId);

    const updatedMatch = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);

    res.json({
      match: {
        id: updatedMatch.id,
        homeTeam: updatedMatch.home_team,
        awayTeam: updatedMatch.away_team,
        homeScore: updatedMatch.home_score,
        awayScore: updatedMatch.away_score,
        status: updatedMatch.status,
      },
      message: 'Resultado registrado e pontuações recalculadas',
    });
  });

  return router;
};
