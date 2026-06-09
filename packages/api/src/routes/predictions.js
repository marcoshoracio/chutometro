'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');

const DEADLINE_OFFSET = 1800; // 30 min before kickoff

module.exports = function predictionRoutes(db) {
  const router = express.Router({ mergeParams: true });

  function checkDeadline(match) {
    const now = Math.floor(Date.now() / 1000);
    return now < match.kickoff_at - DEADLINE_OFFSET;
  }

  // POST /api/groups/:groupId/predictions
  router.post('/', authenticate, (req, res) => {
    const { groupId } = req.params;
    const { matchId, homeGuess, awayGuess, jokerUsed } = req.body;

    if (matchId === undefined || homeGuess === undefined || awayGuess === undefined) {
      return res.status(400).json({ error: 'matchId, homeGuess e awayGuess são obrigatórios' });
    }

    const member = db
      .prepare('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?')
      .get(groupId, req.user.userId);
    if (!member) return res.status(403).json({ error: 'Você não é membro deste grupo' });

    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
    if (!match) return res.status(404).json({ error: 'Jogo não encontrado' });

    if (!checkDeadline(match)) {
      return res.status(400).json({ error: 'Prazo encerrado para este jogo' });
    }

    const existing = db
      .prepare('SELECT id FROM predictions WHERE user_id = ? AND group_id = ? AND match_id = ?')
      .get(req.user.userId, groupId, matchId);

    if (existing) {
      return res.status(409).json({ error: 'Palpite já enviado. Use PUT para atualizar.' });
    }

    // Joker validation
    let useJoker = jokerUsed ? 1 : 0;
    if (useJoker) {
      const group = db.prepare('SELECT settings FROM groups WHERE id = ?').get(groupId);
      const settings = JSON.parse(group?.settings || '{}');
      if (!settings.joker_enabled) {
        useJoker = 0;
      } else {
        // Check if joker already used in this group
        const jokerExists = db
          .prepare('SELECT id FROM predictions WHERE user_id = ? AND group_id = ? AND joker_used = 1')
          .get(req.user.userId, groupId);
        if (jokerExists) {
          return res.status(400).json({ error: 'Joker já utilizado neste grupo' });
        }
      }
    }

    const now = Math.floor(Date.now() / 1000);
    const id = uuidv4();

    db.prepare(`
      INSERT INTO predictions (id, user_id, group_id, match_id, home_guess, away_guess, joker_used, submitted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.userId, groupId, matchId, parseInt(homeGuess, 10), parseInt(awayGuess, 10), useJoker, now);

    const pred = db.prepare('SELECT * FROM predictions WHERE id = ?').get(id);
    res.status(201).json({ prediction: formatPrediction(pred) });
  });

  // PUT /api/groups/:groupId/predictions/:matchId
  router.put('/:matchId', authenticate, (req, res) => {
    const { groupId, matchId } = req.params;
    const { homeGuess, awayGuess, jokerUsed } = req.body;

    const member = db
      .prepare('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?')
      .get(groupId, req.user.userId);
    if (!member) return res.status(403).json({ error: 'Você não é membro deste grupo' });

    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
    if (!match) return res.status(404).json({ error: 'Jogo não encontrado' });

    if (!checkDeadline(match)) {
      return res.status(400).json({ error: 'Prazo encerrado para este jogo' });
    }

    const existing = db
      .prepare('SELECT * FROM predictions WHERE user_id = ? AND group_id = ? AND match_id = ?')
      .get(req.user.userId, groupId, matchId);

    if (!existing) {
      return res.status(404).json({ error: 'Palpite não encontrado. Use POST para criar.' });
    }

    const updates = {};
    if (homeGuess !== undefined) updates.home_guess = parseInt(homeGuess, 10);
    if (awayGuess !== undefined) updates.away_guess = parseInt(awayGuess, 10);
    if (jokerUsed !== undefined) {
      const group = db.prepare('SELECT settings FROM groups WHERE id = ?').get(groupId);
      const settings = JSON.parse(group?.settings || '{}');
      if (settings.joker_enabled) {
        updates.joker_used = jokerUsed ? 1 : 0;
      }
    }

    const now = Math.floor(Date.now() / 1000);
    db.prepare(`
      UPDATE predictions SET
        home_guess = COALESCE(@home_guess, home_guess),
        away_guess = COALESCE(@away_guess, away_guess),
        joker_used = COALESCE(@joker_used, joker_used),
        submitted_at = @submitted_at
      WHERE user_id = @userId AND group_id = @groupId AND match_id = @matchId
    `).run({
      home_guess: updates.home_guess ?? null,
      away_guess: updates.away_guess ?? null,
      joker_used: updates.joker_used ?? null,
      submitted_at: now,
      userId: req.user.userId,
      groupId,
      matchId,
    });

    const pred = db
      .prepare('SELECT * FROM predictions WHERE user_id = ? AND group_id = ? AND match_id = ?')
      .get(req.user.userId, groupId, matchId);

    res.json({ prediction: formatPrediction(pred) });
  });

  function formatPrediction(p) {
    return {
      id: p.id,
      userId: p.user_id,
      groupId: p.group_id,
      matchId: p.match_id,
      homeGuess: p.home_guess,
      awayGuess: p.away_guess,
      jokerUsed: p.joker_used === 1,
      submittedAt: p.submitted_at,
    };
  }

  return router;
};
