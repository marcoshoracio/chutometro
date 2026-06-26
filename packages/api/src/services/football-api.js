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

// Maps football-data.org full team names to short FIFA codes
const TEAM_CODE = {
  'South Africa': 'RSA', 'Canada': 'CAN', 'Germany': 'GER', 'France': 'FRA',
  'Netherlands': 'NED', 'Morocco': 'MAR', 'Brazil': 'BRA', 'Japan': 'JPN',
  'Ivory Coast': 'CIV', "Côte d'Ivoire": 'CIV', 'Norway': 'NOR', 'Mexico': 'MEX',
  'United States': 'USA', 'Bosnia and Herzegovina': 'BIH', 'Bosnia-Herzegovina': 'BIH', 'Switzerland': 'SUI',
  'Argentina': 'ARG', 'Australia': 'AUS', 'Spain': 'ESP', 'Portugal': 'POR',
  'England': 'ENG', 'Belgium': 'BEL', 'Croatia': 'CRO', 'Uruguay': 'URU',
  'Colombia': 'COL', 'Ecuador': 'ECU', 'Chile': 'CHI', 'Peru': 'PER',
  'Senegal': 'SEN', 'Ghana': 'GHA', 'Cameroon': 'CMR', 'Nigeria': 'NGA',
  'Egypt': 'EGY', 'Algeria': 'ALG', 'Tunisia': 'TUN', 'Qatar': 'QAT',
  'Saudi Arabia': 'KSA', 'Iran': 'IRN', 'South Korea': 'KOR', 'Japan': 'JPN',
  'Turkey': 'TUR', 'Ukraine': 'UKR', 'Poland': 'POL', 'Denmark': 'DEN',
  'Sweden': 'SWE', 'Serbia': 'SRB', 'Romania': 'ROU', 'Hungary': 'HUN',
  'Slovakia': 'SVK', 'Slovenia': 'SVN', 'Czech Republic': 'CZE', 'Czechia': 'CZE',
  'Austria': 'AUT', 'Scotland': 'SCO', 'Wales': 'WAL', 'Greece': 'GRE',
  'Venezuela': 'VEN', 'Bolivia': 'BOL', 'Paraguay': 'PAR', 'Costa Rica': 'CRC',
  'Panama': 'PAN', 'Honduras': 'HON', 'El Salvador': 'SLV', 'Jamaica': 'JAM',
  'New Zealand': 'NZL', 'Indonesia': 'IDN', 'Thailand': 'THA', 'Vietnam': 'VIE',
  'China': 'CHN', 'India': 'IND', 'Mali': 'MLI', 'Senegal': 'SEN',
  'Mozambique': 'MOZ', 'Tanzania': 'TAN', 'Angola': 'ANG', 'Zambia': 'ZAM',
  'DR Congo': 'COD', 'Zimbabwe': 'ZIM',
};

function toCode(fullName) {
  if (!fullName || fullName === 'TBD') return 'TBD';
  return TEAM_CODE[fullName] || fullName;
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
      const homeTeam = toCode(m.homeTeam?.name) || 'TBD';
      const awayTeam = toCode(m.awayTeam?.name) || 'TBD';
      const status = m.status === 'FINISHED' ? 'FINISHED'
        : m.status === 'IN_PLAY' || m.status === 'PAUSED' ? 'LIVE'
        : 'SCHEDULED';

      // 1. Try to find by external_id
      let existing = db.prepare('SELECT id FROM matches WHERE external_id = ?').get(m.id);

      // 2. Fall back to stage + kickoff proximity (±30 min) — works for both NULL and wrong external_ids
      if (!existing) {
        existing = db.prepare(
          'SELECT id FROM matches WHERE stage = ? AND ABS(kickoff_at - ?) <= 1800 LIMIT 1'
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
