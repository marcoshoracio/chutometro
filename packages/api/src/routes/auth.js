'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { Resend } = require('resend');
const { signToken, authenticate } = require('../middleware/auth');

module.exports = function authRoutes(db) {
  const router = express.Router();

  function getResend() {
    return process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  }

  // POST /api/auth/request-magic-link
  router.post('/request-magic-link', async (req, res) => {
    const { email, displayName, redirectTo } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'E-mail obrigatório' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const token = uuidv4();
    const expiresAt = Math.floor(Date.now() / 1000) + 900; // 15 min

    // Save display name hint if provided (will be used on verify)
    db.prepare(`
      INSERT INTO magic_links (id, email, token, expires_at, used, redirect_to)
      VALUES (?, ?, ?, ?, 0, ?)
    `).run(uuidv4(), normalizedEmail, token, expiresAt, redirectTo || null);

    // Store display name hint in a temp way — use email as display_name if user doesn't exist yet
    // We'll handle it on verify
    req.app.locals.pendingDisplayNames = req.app.locals.pendingDisplayNames || {};
    if (displayName) {
      req.app.locals.pendingDisplayNames[token] = displayName.trim();
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const magicLink = `${frontendUrl}/auth/verify?token=${token}`;

    const resend = getResend();
    if (!resend) {
      console.log(`\n[magic-link] ${magicLink}\n`);
      return res.json({ message: 'Link enviado' });
    }

    console.log(`\n[magic-link] ${magicLink}\n`);
    console.log(`[auth] Sending email to ${normalizedEmail} via Resend`);
    try {
      await resend.emails.send({
        from: 'Chutômetro <onboarding@resend.dev>',
        to: normalizedEmail,
        subject: 'Seu link de acesso — Chutômetro ⚽',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0f1923;padding:32px;border-radius:12px">
            <h2 style="color:#22c55e;margin-top:0">Chutômetro ⚽</h2>
            <p style="color:#e2e8f0">Clique no link abaixo para entrar no seu bolão. O link expira em <strong>15 minutos</strong>.</p>
            <a href="${magicLink}" style="display:inline-block;background:#1a7a4a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
              Entrar no Chutômetro
            </a>
            <p style="color:#64748b;font-size:12px;margin-top:24px">Se você não solicitou este e-mail, ignore-o.</p>
          </div>
        `,
      });
      console.log(`[auth] Email sent OK to ${normalizedEmail}`);
      res.json({ message: 'Link de acesso enviado para ' + normalizedEmail });
    } catch (err) {
      console.error('[auth] Resend error:', err.message);
      console.log(`\n[magic-link] ${magicLink}\n`);
      res.json({ message: 'Link enviado' });
    }
  });

  // GET /api/auth/verify?token=xxx
  router.get('/verify', (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token obrigatório' });

    const link = db.prepare('SELECT * FROM magic_links WHERE token = ?').get(token);
    if (!link) return res.status(400).json({ error: 'Link inválido' });
    if (link.used) return res.status(400).json({ error: 'Link já utilizado' });

    const now = Math.floor(Date.now() / 1000);
    if (link.expires_at < now) return res.status(400).json({ error: 'Link expirado' });

    // Mark as used
    db.prepare('UPDATE magic_links SET used = 1 WHERE id = ?').run(link.id);

    // Find or create user
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(link.email);
    const pendingDisplayNames = req.app.locals.pendingDisplayNames || {};
    const displayNameHint = pendingDisplayNames[token] || link.email.split('@')[0];
    delete pendingDisplayNames[token];

    if (!user) {
      const userId = uuidv4();
      db.prepare(`
        INSERT INTO users (id, email, display_name, created_at)
        VALUES (?, ?, ?, ?)
      `).run(userId, link.email, displayNameHint, now);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    }

    const jwtToken = signToken(user.id);

    res.json({
      token: jwtToken,
      user: { id: user.id, email: user.email, displayName: user.display_name },
      redirectTo: link.redirect_to,
    });
  });

  // GET /api/auth/me
  router.get('/me', authenticate, (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.userId);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json({ user: { id: user.id, email: user.email, displayName: user.display_name } });
  });

  return router;
};
