'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { Resend } = require('resend');
const bcrypt = require('bcryptjs');
const { signToken, authenticate } = require('../middleware/auth');

module.exports = function authRoutes(db) {
  const router = express.Router();

  // POST /api/auth/register
  router.post('/register', async (req, res) => {
    const { email, displayName, password } = req.body;
    if (!email || !displayName || !password) {
      return res.status(400).json({ error: 'Email, name, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const hash = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const now = Math.floor(Date.now() / 1000);
    db.prepare('INSERT INTO users (id, email, display_name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(userId, normalizedEmail, displayName.trim(), hash, now);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const token = signToken(user.id);
    const groups = db.prepare(
      'SELECT g.id, g.name FROM groups g JOIN group_members gm ON gm.group_id = g.id WHERE gm.user_id = ? ORDER BY gm.joined_at ASC'
    ).all(user.id);

    res.status(201).json({ token, user: { id: user.id, email: user.email, displayName: user.display_name }, groups });
  });

  // POST /api/auth/login
  router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Incorrect email or password' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Incorrect email or password' });
    }

    const token = signToken(user.id);
    const groups = db.prepare(
      'SELECT g.id, g.name FROM groups g JOIN group_members gm ON gm.group_id = g.id WHERE gm.user_id = ? ORDER BY gm.joined_at ASC'
    ).all(user.id);

    res.json({ token, user: { id: user.id, email: user.email, displayName: user.display_name }, groups });
  });

  // POST /api/auth/forgot-password
  router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const normalizedEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);

    // Always return success to avoid user enumeration
    if (!user) {
      console.log(`[password-reset] no account for email: ${normalizedEmail}`);
      return res.json({ message: 'If an account exists for that email, a reset link has been sent.' });
    }

    const token = uuidv4();
    const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour

    db.prepare(`
      INSERT INTO password_reset_tokens (id, user_id, token, expires_at, used)
      VALUES (?, ?, ?, ?, 0)
    `).run(uuidv4(), user.id, token, expiresAt);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/auth/reset-password?token=${token}`;

    // Always log the link so it's accessible from Railway logs as a fallback
    console.log(`\n[password-reset] token=${token} link=${resetLink}\n`);

    const resend = getResend();
    if (!resend) {
      return res.json({ message: 'If an account exists for that email, a reset link has been sent.' });
    }

    const fromAddress = process.env.EMAIL_FROM || 'onboarding@resend.dev';
    try {
      await resend.emails.send({
        from: `Chutômetro <${fromAddress}>`,
        to: normalizedEmail,
        subject: 'Reset your password — Chutômetro ⚽',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0f1923;padding:32px;border-radius:12px">
            <h2 style="color:#22c55e;margin-top:0">Chutômetro ⚽</h2>
            <p style="color:#e2e8f0">Click the link below to reset your password. The link expires in <strong>1 hour</strong>.</p>
            <a href="${resetLink}" style="display:inline-block;background:#1a7a4a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
              Reset Password
            </a>
            <p style="color:#64748b;font-size:12px;margin-top:24px">If you did not request this, please ignore it.</p>
          </div>
        `,
      });
      console.log(`[auth] Password reset email sent to ${normalizedEmail}`);
    } catch (err) {
      console.error('[auth] Resend error sending reset email:', err.message);
    }

    res.json({ message: 'If an account exists for that email, a reset link has been sent.' });
  });

  // POST /api/auth/reset-password
  router.post('/reset-password', async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const row = db.prepare('SELECT * FROM password_reset_tokens WHERE token = ?').get(token);
    if (!row) return res.status(400).json({ error: 'Invalid or expired reset link' });
    if (row.used) return res.status(400).json({ error: 'This reset link has already been used' });

    const now = Math.floor(Date.now() / 1000);
    if (row.expires_at < now) return res.status(400).json({ error: 'Reset link has expired' });

    const hash = await bcrypt.hash(password, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, row.user_id);
    db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').run(row.id);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(row.user_id);
    const jwtToken = signToken(user.id);
    const groups = db.prepare(
      'SELECT g.id, g.name FROM groups g JOIN group_members gm ON gm.group_id = g.id WHERE gm.user_id = ? ORDER BY gm.joined_at ASC'
    ).all(user.id);

    res.json({ token: jwtToken, user: { id: user.id, email: user.email, displayName: user.display_name }, groups });
  });

  function getResend() {
    return process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  }

  // POST /api/auth/request-magic-link
  router.post('/request-magic-link', async (req, res) => {
    const { email, displayName, redirectTo } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
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
      return res.json({ message: 'Link sent' });
    }

    console.log(`\n[magic-link] ${magicLink}\n`);
    console.log(`[auth] Sending email to ${normalizedEmail} via Resend`);
    try {
      await resend.emails.send({
        from: `Chutômetro <${process.env.EMAIL_FROM || 'onboarding@resend.dev'}>`,
        to: normalizedEmail,
        subject: 'Your access link — Chutômetro ⚽',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0f1923;padding:32px;border-radius:12px">
            <h2 style="color:#22c55e;margin-top:0">Chutômetro ⚽</h2>
            <p style="color:#e2e8f0">Click the link below to join your Bolão. The link expires in <strong>15 minutes</strong>.</p>
            <a href="${magicLink}" style="display:inline-block;background:#1a7a4a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
              Enter Chutômetro
            </a>
            <p style="color:#64748b;font-size:12px;margin-top:24px">If you did not request this email, please ignore it.</p>
          </div>
        `,
      });
      console.log(`[auth] Email sent OK to ${normalizedEmail}`);
      res.json({ message: 'Access link sent to ' + normalizedEmail });
    } catch (err) {
      console.error('[auth] Resend error:', err.message);
      console.log(`\n[magic-link] ${magicLink}\n`);
      res.json({ message: 'Link sent' });
    }
  });

  // GET /api/auth/verify?token=xxx
  router.get('/verify', (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    const link = db.prepare('SELECT * FROM magic_links WHERE token = ?').get(token);
    if (!link) return res.status(400).json({ error: 'Invalid link' });
    if (link.used) return res.status(400).json({ error: 'Link already used' });

    const now = Math.floor(Date.now() / 1000);
    if (link.expires_at < now) return res.status(400).json({ error: 'Link expired' });

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
    if (!user) return res.status(404).json({ error: 'User not found' });
    const groups = db.prepare(
      'SELECT g.id, g.name FROM groups g JOIN group_members gm ON gm.group_id = g.id WHERE gm.user_id = ? ORDER BY gm.joined_at ASC'
    ).all(user.id);
    res.json({ user: { id: user.id, email: user.email, displayName: user.display_name }, groups });
  });

  return router;
};
