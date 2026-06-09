'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const { startPolling } = require('./services/football-api');

const authRoutes = require('./routes/auth');
const groupRoutes = require('./routes/groups');
const matchRoutes = require('./routes/matches');
const predictionRoutes = require('./routes/predictions');
const leaderboardRoutes = require('./routes/leaderboard');
const resultsRoutes = require('./routes/results');
const adminRoutes = require('./routes/admin');
const preTournamentRoutes = require('./routes/pretournament');

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

// In dev, allow Vite dev server. In prod, same origin so no CORS needed.
if (!isProd) {
  app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:4173'],
    credentials: true,
  }));
}
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes(db));
app.use('/api/groups', groupRoutes(db));
app.use('/api/groups/:groupId/matches', matchRoutes(db));
app.use('/api/groups/:groupId/predictions', predictionRoutes(db));
app.use('/api/groups/:groupId/leaderboard', leaderboardRoutes(db));
app.use('/api/groups/:groupId/results', resultsRoutes(db));
app.use('/api/groups/:groupId/admin', adminRoutes(db));
app.use('/api/groups/:groupId/pre-tournament', preTournamentRoutes(db));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV });
});

// Serve React frontend in production
if (isProd) {
  const distPath = path.join(__dirname, '../../web/dist');
  app.use(express.static(distPath));
  // SPA fallback — all non-API routes return index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start polling football API
startPolling(db);

app.listen(PORT, () => {
  console.log(`Chutômetro API running on http://localhost:${PORT}`);
});

module.exports = app;
