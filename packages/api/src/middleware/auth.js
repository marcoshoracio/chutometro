'use strict';

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const token = header.slice(7);
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (_) {
      // ignore
    }
  }
  next();
}

function requireGroupAdmin(db) {
  return (req, res, next) => {
    const groupId = req.params.groupId;
    if (!groupId) return res.status(400).json({ error: 'groupId obrigatório' });

    const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId);
    if (!group) return res.status(404).json({ error: 'Grupo não encontrado' });

    if (group.admin_id !== req.user.userId) {
      return res.status(403).json({ error: 'Apenas o administrador pode fazer isso' });
    }

    req.group = group;
    next();
  };
}

function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

module.exports = { authenticate, optionalAuth, requireGroupAdmin, signToken };
