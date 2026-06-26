'use strict';

const cron = require('node-cron');
const { recalculateGroupScores } = require('./scoring');

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
      if (existing.is_manual_override) continue;

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

      // Trigger score recalculation for every group that has predictions for this match
      const groups = db.prepare(
        'SELECT DISTINCT group_id FROM predictions WHERE match_id = ?'
      ).all(existing.id);
      for (const { group_id } of groups) {
        recalculateGroupScores(db, group_id, existing.id);
      }
    }
  } catch (err) {
    console.error('[football-api] syncFinishedMatches error:', err.message);
  }
}

const STAGE_MAP = {
  'GROUP_STAGE': 'GROUP_STAGE',
  'LAST_32': 'ROUND_OF_32',
  'LAST_16': 'ROUND_OF_16',
  'QUARTER_FINALS': 'QUARTER_FINALS',
  'SEMI_FINALS': 'SEMI_FINALS',
  'THIRD_PLACE': 'THIRD_PLACE',
  'FINAL': 'FINAL',
};

async function syncAllMatches() {
  if (!API_KEY) return;

  try {
    const data = await fetchWithAuth(`/competitions/${WC2026_COMPETITION}/matches`);
    const apiMatches = data.matches || [];
    const { v4: uuidv4 } = require('uuid');

    const insert = db.prepare(`
      INSERT OR IGNORE INTO matches (id, external_id, stage, match_number, home_team, away_team, kickoff_at, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const m of apiMatches) {
      const kickoffAt = Math.floor(new Date(m.utcDate).getTime() / 1000);
      const stage = STAGE_MAP[m.stage] || m.stage || 'GROUP_STAGE';
      const homeTeam = m.homeTeam?.name || 'TBD';
      const awayTeam = m.awayTeam?.name || 'TBD';
      const status = m.status === 'FINISHED' ? 'FINISHED'
        : m.status === 'IN_PLAY' || m.status === 'PAUSED' ? 'LIVE'
        : 'SCHEDULED';

      // 1. Try to find by external_id
      let existing = db.prepare('SELECT id FROM matches WHERE external_id = ?').get(m.id);

      // 2. Fall back to matching by stage + kickoff time (±30 min) for unseeded matches
      if (!existing) {
        existing = db.prepare(
          'SELECT id FROM matches WHERE stage = ? AND ABS(kickoff_at - ?) <= 1800 AND external_id IS NULL LIMIT 1'
        ).get(stage, kickoffAt);
        if (existing) {
          db.prepare('UPDATE matches SET external_id = ? WHERE id = ?').run(m.id, existing.id);
        }
      }

      if (existing) {
        db.prepare(`
          UPDATE matches SET home_team = ?, away_team = ?, kickoff_at = ?, status = ?
          WHERE id = ?
        `).run(homeTeam, awayTeam, kickoffAt, status, existing.id);

        if (status === 'FINISHED') {
          const hs = m.score?.fullTime?.home ?? null;
          const as_ = m.score?.fullTime?.away ?? null;
          if (hs !== null && !db.prepare('SELECT is_manual_override FROM matches WHERE id = ?').get(existing.id)?.is_manual_override) {
            db.prepare('UPDATE matches SET home_score = ?, away_score = ? WHERE id = ?').run(hs, as_, existing.id);
            const groups = db.prepare('SELECT DISTINCT group_id FROM predictions WHERE match_id = ?').all(existing.id);
            for (const { group_id } of groups) {
              recalculateGroupScores(db, group_id, existing.id);
            }
          }
        }
      } else {
        insert.run(uuidv4(), m.id, stage, m.matchday || null, homeTeam, awayTeam, kickoffAt, status);
      }
    }
    console.log(`[football-api] syncAllMatches: ${apiMatches.length} matches processed`);
  } catch (err) {
    console.error('[football-api] syncAllMatches error:', err.message);
  }
}

async function syncScheduledMatches() {
  return syncAllMatches();
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

  // Run a full sync on startup to pull real team names and results
  syncAllMatches().catch((err) => console.error('[football-api] startup sync error:', err.message));

  // Every 5 minutes — full sync (live scores, finished results, team name updates)
  cron.schedule('*/5 * * * *', async () => {
    await syncAllMatches();
  });

  console.log('[football-api] Polling started.');
}

module.exports = { startPolling, syncAllMatches, syncLiveMatches, syncFinishedMatches, syncScheduledMatches };
