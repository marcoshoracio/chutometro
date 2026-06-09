'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

module.exports = function groupRoutes(db) {
  const router = express.Router();

  // POST /api/groups — create group
  router.post('/', authenticate, (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nome do grupo obrigatório' });
    }

    let code;
    let attempts = 0;
    do {
      code = generateCode();
      attempts++;
      if (attempts > 20) return res.status(500).json({ error: 'Não foi possível gerar código único' });
    } while (db.prepare('SELECT id FROM groups WHERE code = ?').get(code));

    const groupId = uuidv4();
    const now = Math.floor(Date.now() / 1000);
    const settings = JSON.stringify({ joker_enabled: false, pre_tournament_enabled: true, knockout_90min_only: false });

    db.prepare(`
      INSERT INTO groups (id, name, code, admin_id, settings, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(groupId, name.trim(), code, req.user.userId, settings, now);

    // Auto-join as admin
    db.prepare(`
      INSERT INTO group_members (id, group_id, user_id, joined_at)
      VALUES (?, ?, ?, ?)
    `).run(uuidv4(), groupId, req.user.userId, now);

    const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    res.status(201).json({
      group: formatGroup(group),
      inviteUrl: `${frontendUrl}/join?code=${code}`,
    });
  });

  // GET /api/groups/:code — get group by invite code
  router.get('/:code', (req, res) => {
    const group = db.prepare('SELECT * FROM groups WHERE code = ?').get(req.params.code.toUpperCase());
    if (!group) return res.status(404).json({ error: 'Grupo não encontrado' });

    const memberCount = db.prepare('SELECT COUNT(*) as c FROM group_members WHERE group_id = ?').get(group.id).c;
    res.json({ group: formatGroup(group), memberCount });
  });

  // POST /api/groups/:code/join — join group by code
  router.post('/:code/join', authenticate, (req, res) => {
    const group = db.prepare('SELECT * FROM groups WHERE code = ?').get(req.params.code.toUpperCase());
    if (!group) return res.status(404).json({ error: 'Grupo não encontrado' });

    const existing = db
      .prepare('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?')
      .get(group.id, req.user.userId);

    if (existing) {
      return res.json({ group: formatGroup(group), alreadyMember: true });
    }

    db.prepare(`
      INSERT INTO group_members (id, group_id, user_id, joined_at)
      VALUES (?, ?, ?, ?)
    `).run(uuidv4(), group.id, req.user.userId, Math.floor(Date.now() / 1000));

    res.status(201).json({ group: formatGroup(group), alreadyMember: false });
  });

  function formatGroup(group) {
    return {
      id: group.id,
      name: group.name,
      code: group.code,
      adminId: group.admin_id,
      settings: JSON.parse(group.settings || '{}'),
      createdAt: group.created_at,
    };
  }

  return router;
};
