'use strict';

const cron = require('node-cron');

const API_KEY = process.env.FOOTBALL_API_KEY;
const BASE_URL = 'https://api.football-data.org/v4';
const WC2026_COMPETITION = 'WC';

let db;

async function fetchWithAuth(path) {
  if (!API_KEY) throw new Error('FOOTBALL_API_KEY not set');
  const fetch = (await import('node-fetch')).default;
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'X-Auth-Token': API_KEY },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function syncLiveMatches() {
  if (!API_KEY) return;

  try {
    const data = await fetchWithAuth(`/competitions/${WC2026_COMPETITION}/matches?status=LIVE`);
    const liveMatches = data.matches || [];

    for (const m of liveMatches) {
      const existing = db.prepare('SELECT * FROM matches WHERE external_id = ?').get(m.id);
      if (!existing) continue;

      db.prepare(`
        UPDATE matches SET status = 'LIVE',
          home_score = ?, away_score = ?
        WHERE id = ?
      `).run(
        m.score?.fullTime?.home ?? null,
        m.score?.fullTime?.away ?? null,
        existing.id
      );
    }
  } catch (err) {
    console.error('[football-api] syncLiveMatches error:', err.message);
  }
}

async function syncFinishedMatches() {
  if (!API_KEY) return;

  try {
    const data = await fetchWithAuth(`/competitions/${WC2026_COMPETITION}/matches?status=FINISHED`);
    const finished = data.matches || [];

    for (const m of finished) {
      const existing = db.prepare('SELECT * FROM matches WHERE external_id = ?').get(m.id);
      if (!existing) continue;

      if (existing.status === 'FINISHED') continue;

      db.prepare(`
        UPDATE matches SET status = 'FINISHED',
          home_score = ?, away_score = ?,
          home_team = ?, away_team = ?
        WHERE id = ?
      `).run(
        m.score?.fullTime?.home ?? 0,
        m.score?.fullTime?.away ?? 0,
        m.homeTeam?.name || existing.home_team,
        m.awayTeam?.name || existing.away_team,
        existing.id
      );
    }
  } catch (err) {
    console.error('[football-api] syncFinishedMatches error:', err.message);
  }
}

async function syncScheduledMatches() {
  if (!API_KEY) return;

  try {
    const data = await fetchWithAuth(`/competitions/${WC2026_COMPETITION}/matches?status=SCHEDULED`);
    const scheduled = data.matches || [];

    const insert = db.prepare(`
      INSERT OR IGNORE INTO matches (id, external_id, stage, match_number, home_team, away_team, kickoff_at, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'SCHEDULED')
    `);

    const { v4: uuidv4 } = require('uuid');

    for (const m of scheduled) {
      const existing = db.prepare('SELECT id FROM matches WHERE external_id = ?').get(m.id);
      if (existing) {
        db.prepare(`
          UPDATE matches SET home_team = ?, away_team = ?, kickoff_at = ?
          WHERE external_id = ?
        `).run(
          m.homeTeam?.name || '?',
          m.awayTeam?.name || '?',
          Math.floor(new Date(m.utcDate).getTime() / 1000),
          m.id
        );
      } else {
        const stageMap = {
          'GROUP_STAGE': 'GROUP_STAGE',
          'ROUND_OF_32': 'ROUND_OF_32',
          'LAST_16': 'ROUND_OF_16',
          'QUARTER_FINALS': 'QUARTER_FINALS',
          'SEMI_FINALS': 'SEMI_FINALS',
          'THIRD_PLACE': 'THIRD_PLACE',
          'FINAL': 'FINAL',
        };
        const stage = stageMap[m.stage] || m.stage || 'GROUP_STAGE';
        insert.run(
          uuidv4(),
          m.id,
          stage,
          m.matchday || null,
          m.homeTeam?.name || '?',
          m.awayTeam?.name || '?',
          Math.floor(new Date(m.utcDate).getTime() / 1000)
        );
      }
    }
  } catch (err) {
    console.error('[football-api] syncScheduledMatches error:', err.message);
  }
}

function hasLiveMatches() {
  const row = db.prepare("SELECT COUNT(*) as c FROM matches WHERE status = 'LIVE'").get();
  return row.c > 0;
}

function startPolling(database) {
  db = database;

  if (!API_KEY) {
    console.log('[football-api] No API key — polling disabled. Set FOOTBALL_API_KEY to enable.');
    return;
  }

  // Every 4 minutes — check live matches
  cron.schedule('*/4 * * * *', async () => {
    await syncLiveMatches();
  });

  // Every 10 minutes — check finished matches
  cron.schedule('*/10 * * * *', async () => {
    await syncFinishedMatches();
  });

  // Once per hour — sync scheduled matches (team names for knockout stage)
  cron.schedule('0 * * * *', async () => {
    await syncScheduledMatches();
  });

  console.log('[football-api] Polling started.');
}

module.exports = { startPolling, syncLiveMatches, syncFinishedMatches, syncScheduledMatches };
