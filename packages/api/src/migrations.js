'use strict';

const { v4: uuidv4 } = require('uuid');

function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      admin_id TEXT NOT NULL,
      settings TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS group_members (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES groups(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      joined_at INTEGER NOT NULL,
      UNIQUE(group_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS magic_links (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at INTEGER NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      redirect_to TEXT
    );

    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      external_id INTEGER,
      stage TEXT NOT NULL,
      match_number INTEGER,
      home_team TEXT NOT NULL,
      away_team TEXT NOT NULL,
      kickoff_at INTEGER NOT NULL,
      home_score INTEGER,
      away_score INTEGER,
      status TEXT NOT NULL DEFAULT 'SCHEDULED',
      is_manual_override INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS predictions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      group_id TEXT NOT NULL REFERENCES groups(id),
      match_id TEXT NOT NULL REFERENCES matches(id),
      home_guess INTEGER NOT NULL,
      away_guess INTEGER NOT NULL,
      joker_used INTEGER NOT NULL DEFAULT 0,
      submitted_at INTEGER NOT NULL,
      UNIQUE(user_id, group_id, match_id)
    );

    CREATE TABLE IF NOT EXISTS scores (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      group_id TEXT NOT NULL REFERENCES groups(id),
      match_id TEXT NOT NULL REFERENCES matches(id),
      base_points INTEGER NOT NULL DEFAULT 0,
      bonus_points INTEGER NOT NULL DEFAULT 0,
      multiplier REAL NOT NULL DEFAULT 1.0,
      final_points INTEGER NOT NULL DEFAULT 0,
      UNIQUE(user_id, group_id, match_id)
    );

    CREATE TABLE IF NOT EXISTS pre_tournament_predictions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      group_id TEXT NOT NULL REFERENCES groups(id),
      champion TEXT,
      runner_up TEXT,
      top_scorer TEXT,
      submitted_at INTEGER NOT NULL,
      UNIQUE(user_id, group_id)
    );
  `);

  // Add is_manual_override column if it doesn't exist (for existing DBs)
  try {
    db.exec('ALTER TABLE matches ADD COLUMN is_manual_override INTEGER NOT NULL DEFAULT 0');
  } catch (_) { /* column already exists */ }

  // Add points column to pre_tournament_predictions if it doesn't exist
  try {
    db.exec('ALTER TABLE pre_tournament_predictions ADD COLUMN points INTEGER NOT NULL DEFAULT 0');
  } catch (_) { /* column already exists */ }

  // Seed FIFA WC2026 bracket slot names by kickoff order (match_number may be null on old DBs)
  // Sorted by kickoff_at ascending — matches the official FIFA R32 schedule order
  const r32Slots = [
    [73, 'RSA', 'CAN'],   // 28/06 19:00 UTC
    [74, 'GER', '3ABCDF'],// 29/06 17:00 UTC
    [75, 'NED', 'MAR'],   // 29/06 20:30 UTC
    [76, 'BRA', 'JPN'],   // 30/06 01:00 UTC
    [77, 'FRA', '3CDFGH'],// 30/06 17:00 UTC
    [78, 'CIV', 'NOR'],   // 30/06 21:00 UTC
    [79, 'MEX', '3CEFHI'],// 01/07 01:00 UTC
    [80, '1L',  '3EHIJK'],// 01/07 16:00 UTC
    [81, 'USA', 'BIH'],   // 01/07 20:00 UTC
    [82, '1G',  '3AEHIJ'],// 02/07 00:00 UTC
    [83, '2K',  '2L'],    // 02/07 19:00 UTC
    [84, '1H',  '2J'],    // 02/07 23:00 UTC
    [85, 'SUI', '3EFGIJ'],// 03/07 03:00 UTC
    [86, 'ARG', '2H'],    // 03/07 18:00 UTC
    [87, '1K',  '3DEIJL'],// 03/07 22:00 UTC
    [88, 'AUS', '2G'],    // 04/07 01:30 UTC
  ];
  const r32Rows = db.prepare(
    "SELECT id FROM matches WHERE stage='ROUND_OF_32' AND is_manual_override=0 AND status!='FINISHED' ORDER BY kickoff_at ASC"
  ).all();
  const updateSlot = db.prepare('UPDATE matches SET match_number=?, home_team=?, away_team=? WHERE id=?');
  r32Rows.forEach((row, i) => {
    if (r32Slots[i]) updateSlot.run(r32Slots[i][0], r32Slots[i][1], r32Slots[i][2], row.id);
  });

  // Dedup: remove duplicate knockout matches with full team names inserted by API sync
  // Keep the row with the lower kickoff_at tie-break (our seeded one), delete the API duplicate
  db.exec(`
    DELETE FROM matches
    WHERE id IN (
      SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY stage, kickoff_at ORDER BY rowid ASC) as rn
        FROM matches
        WHERE stage IN ('ROUND_OF_32','ROUND_OF_16','QUARTER_FINALS','SEMI_FINALS','THIRD_PLACE','FINAL')
      ) WHERE rn > 1
    )
    AND id NOT IN (SELECT DISTINCT match_id FROM predictions)
  `);

  // Seed matches if empty
  const count = db.prepare('SELECT COUNT(*) as c FROM matches').get();
  if (count.c === 0) {
    seedMatches(db);
  }

  // Replace all seeded knockout matches (external_id IS NULL) with real API data.
  // Runs after seeding so it handles both fresh and existing DBs.
  const knockoutStages = ['ROUND_OF_32', 'ROUND_OF_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL'];
  const hasUnlinkedKnockout = db.prepare(
    `SELECT COUNT(*) as c FROM matches WHERE stage IN (${knockoutStages.map(() => '?').join(',')}) AND external_id IS NULL`
  ).get(...knockoutStages);

  if (hasUnlinkedKnockout.c > 0) {
    // Delete placeholder knockouts that haven't been predicted
    db.prepare(
      `DELETE FROM matches WHERE stage IN (${knockoutStages.map(() => '?').join(',')}) AND external_id IS NULL
       AND id NOT IN (SELECT DISTINCT match_id FROM predictions)`
    ).run(...knockoutStages);

    // Seed real knockout matches from football-data.org (external IDs and exact dates known)
    const insertKnockout = db.prepare(`
      INSERT OR IGNORE INTO matches (id, external_id, stage, match_number, home_team, away_team, kickoff_at, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'SCHEDULED')
    `);

    const realKnockout = [
      // ROUND_OF_32 — June 28 – July 4
      [537417, 'ROUND_OF_32', 73,  'TBD', 'TBD', '2026-06-28T19:00:00Z'],
      [537423, 'ROUND_OF_32', 74,  'TBD', 'TBD', '2026-06-29T17:00:00Z'],
      [537415, 'ROUND_OF_32', 75,  'TBD', 'TBD', '2026-06-29T20:30:00Z'],
      [537418, 'ROUND_OF_32', 76,  'TBD', 'TBD', '2026-06-30T01:00:00Z'],
      [537424, 'ROUND_OF_32', 77,  'TBD', 'TBD', '2026-06-30T17:00:00Z'],
      [537416, 'ROUND_OF_32', 78,  'TBD', 'TBD', '2026-06-30T21:00:00Z'],
      [537425, 'ROUND_OF_32', 79,  'TBD', 'TBD', '2026-07-01T01:00:00Z'],
      [537426, 'ROUND_OF_32', 80,  'TBD', 'TBD', '2026-07-01T16:00:00Z'],
      [537422, 'ROUND_OF_32', 81,  'TBD', 'TBD', '2026-07-01T20:00:00Z'],
      [537421, 'ROUND_OF_32', 82,  'TBD', 'TBD', '2026-07-02T00:00:00Z'],
      [537420, 'ROUND_OF_32', 83,  'TBD', 'TBD', '2026-07-02T19:00:00Z'],
      [537419, 'ROUND_OF_32', 84,  'TBD', 'TBD', '2026-07-02T23:00:00Z'],
      [537429, 'ROUND_OF_32', 85,  'TBD', 'TBD', '2026-07-03T03:00:00Z'],
      [537428, 'ROUND_OF_32', 86,  'TBD', 'TBD', '2026-07-03T18:00:00Z'],
      [537427, 'ROUND_OF_32', 87,  'TBD', 'TBD', '2026-07-03T22:00:00Z'],
      [537430, 'ROUND_OF_32', 88,  'TBD', 'TBD', '2026-07-04T01:30:00Z'],
      // ROUND_OF_16 — July 4–7
      [537376, 'ROUND_OF_16', 89,  'TBD', 'TBD', '2026-07-04T17:00:00Z'],
      [537375, 'ROUND_OF_16', 90,  'TBD', 'TBD', '2026-07-04T21:00:00Z'],
      [537377, 'ROUND_OF_16', 91,  'TBD', 'TBD', '2026-07-05T20:00:00Z'],
      [537378, 'ROUND_OF_16', 92,  'TBD', 'TBD', '2026-07-06T00:00:00Z'],
      [537379, 'ROUND_OF_16', 93,  'TBD', 'TBD', '2026-07-06T19:00:00Z'],
      [537380, 'ROUND_OF_16', 94,  'TBD', 'TBD', '2026-07-07T00:00:00Z'],
      [537381, 'ROUND_OF_16', 95,  'TBD', 'TBD', '2026-07-07T16:00:00Z'],
      [537382, 'ROUND_OF_16', 96,  'TBD', 'TBD', '2026-07-07T20:00:00Z'],
      // QUARTER_FINALS — July 9–12
      [537383, 'QUARTER_FINALS', 97, 'TBD', 'TBD', '2026-07-09T20:00:00Z'],
      [537384, 'QUARTER_FINALS', 98, 'TBD', 'TBD', '2026-07-10T19:00:00Z'],
      [537385, 'QUARTER_FINALS', 99, 'TBD', 'TBD', '2026-07-11T21:00:00Z'],
      [537386, 'QUARTER_FINALS', 100,'TBD', 'TBD', '2026-07-12T01:00:00Z'],
      // SEMI_FINALS — July 14–15
      [537387, 'SEMI_FINALS', 101, 'TBD', 'TBD', '2026-07-14T19:00:00Z'],
      [537388, 'SEMI_FINALS', 102, 'TBD', 'TBD', '2026-07-15T19:00:00Z'],
      // THIRD_PLACE — July 18
      [537389, 'THIRD_PLACE', 103, 'TBD', 'TBD', '2026-07-18T21:00:00Z'],
      // FINAL — July 19
      [537390, 'FINAL',       104, 'TBD', 'TBD', '2026-07-19T19:00:00Z'],
    ];

    const insertAll = db.transaction(() => {
      for (const [extId, stage, num, home, away, dateStr] of realKnockout) {
        insertKnockout.run(uuidv4(), extId, stage, num, home, away, Math.floor(new Date(dateStr).getTime() / 1000));
      }
    });
    insertAll();
    console.log('Reseeded knockout matches with real external IDs and dates.');
  }
}

function ts(dateStr) {
  return Math.floor(new Date(dateStr).getTime() / 1000);
}

function seedMatches(db) {
  const insert = db.prepare(`
    INSERT INTO matches (id, external_id, stage, match_number, home_team, away_team, kickoff_at, status)
    VALUES (@id, @external_id, @stage, @match_number, @home_team, @away_team, @kickoff_at, @status)
  `);

  const insertMany = db.transaction((matches) => {
    for (const m of matches) {
      insert.run(m);
    }
  });

  // FIFA World Cup 2026 — Group Stage
  // 12 groups (A–L), 4 teams each, 6 matches per group = 72 matches
  // Group stage: June 11 – July 2, 2026
  // All times UTC

  const groups = {
    A: ['México', 'EUA', 'Canadá', 'Nova Zelândia'],
    B: ['Brasil', 'Croácia', 'Marrocos', 'Bélgica'],
    C: ['Argentina', 'Polônia', 'Arábia Saudita', 'Austrália'],
    D: ['França', 'Peru', 'Dinamarca', 'Tunísia'],
    E: ['Inglaterra', 'Irã', 'Senegal', 'Países Baixos'],
    F: ['Espanha', 'Costa Rica', 'Alemanha', 'Japão'],
    G: ['Portugal', 'Gana', 'Uruguai', 'Coreia do Sul'],
    H: ['Itália', 'Colômbia', 'Equador', 'Costa do Marfim'],
    I: ['Argélia', 'México', 'Venezuela', 'Camarões'],
    J: ['Turquia', 'Chile', 'Romênia', 'Nigéria'],
    K: ['Ucrânia', 'Egito', 'Bolívia', 'República Tcheca'],
    L: ['Qatar', 'África do Sul', 'Panamá', 'Indonésia'],
  };

  // Matchday schedule per group (simplified — spread across 3 matchdays)
  // Group stage dates: MD1 June 11-15, MD2 June 16-22, MD3 June 23 - July 2
  const groupSchedule = {
    A: {
      md1: [['2026-06-11T18:00:00Z', 0, 1], ['2026-06-11T21:00:00Z', 2, 3]],
      md2: [['2026-06-15T18:00:00Z', 0, 2], ['2026-06-15T21:00:00Z', 1, 3]],
      md3: [['2026-06-19T21:00:00Z', 0, 3], ['2026-06-19T21:00:00Z', 1, 2]],
    },
    B: {
      md1: [['2026-06-12T15:00:00Z', 0, 1], ['2026-06-12T18:00:00Z', 2, 3]],
      md2: [['2026-06-16T15:00:00Z', 0, 2], ['2026-06-16T18:00:00Z', 1, 3]],
      md3: [['2026-06-20T21:00:00Z', 0, 3], ['2026-06-20T21:00:00Z', 1, 2]],
    },
    C: {
      md1: [['2026-06-12T21:00:00Z', 0, 1], ['2026-06-13T00:00:00Z', 2, 3]],
      md2: [['2026-06-17T18:00:00Z', 0, 2], ['2026-06-17T21:00:00Z', 1, 3]],
      md3: [['2026-06-21T21:00:00Z', 0, 3], ['2026-06-21T21:00:00Z', 1, 2]],
    },
    D: {
      md1: [['2026-06-13T15:00:00Z', 0, 1], ['2026-06-13T18:00:00Z', 2, 3]],
      md2: [['2026-06-17T15:00:00Z', 0, 2], ['2026-06-17T18:00:00Z', 1, 3]],
      md3: [['2026-06-22T21:00:00Z', 0, 3], ['2026-06-22T21:00:00Z', 1, 2]],
    },
    E: {
      md1: [['2026-06-13T21:00:00Z', 0, 1], ['2026-06-14T00:00:00Z', 2, 3]],
      md2: [['2026-06-18T18:00:00Z', 0, 2], ['2026-06-18T21:00:00Z', 1, 3]],
      md3: [['2026-06-23T21:00:00Z', 0, 3], ['2026-06-23T21:00:00Z', 1, 2]],
    },
    F: {
      md1: [['2026-06-14T15:00:00Z', 0, 1], ['2026-06-14T18:00:00Z', 2, 3]],
      md2: [['2026-06-18T15:00:00Z', 0, 2], ['2026-06-18T18:00:00Z', 1, 3]],
      md3: [['2026-06-24T21:00:00Z', 0, 3], ['2026-06-24T21:00:00Z', 1, 2]],
    },
    G: {
      md1: [['2026-06-14T21:00:00Z', 0, 1], ['2026-06-15T00:00:00Z', 2, 3]],
      md2: [['2026-06-19T18:00:00Z', 0, 2], ['2026-06-19T18:00:00Z', 1, 3]],
      md3: [['2026-06-25T21:00:00Z', 0, 3], ['2026-06-25T21:00:00Z', 1, 2]],
    },
    H: {
      md1: [['2026-06-15T15:00:00Z', 0, 1], ['2026-06-15T18:00:00Z', 2, 3]],
      md2: [['2026-06-20T18:00:00Z', 0, 2], ['2026-06-20T18:00:00Z', 1, 3]],
      md3: [['2026-06-26T21:00:00Z', 0, 3], ['2026-06-26T21:00:00Z', 1, 2]],
    },
    I: {
      md1: [['2026-06-16T21:00:00Z', 0, 1], ['2026-06-16T21:00:00Z', 2, 3]],
      md2: [['2026-06-21T18:00:00Z', 0, 2], ['2026-06-21T18:00:00Z', 1, 3]],
      md3: [['2026-06-27T21:00:00Z', 0, 3], ['2026-06-27T21:00:00Z', 1, 2]],
    },
    J: {
      md1: [['2026-06-17T21:00:00Z', 0, 1], ['2026-06-17T21:00:00Z', 2, 3]],
      md2: [['2026-06-22T18:00:00Z', 0, 2], ['2026-06-22T18:00:00Z', 1, 3]],
      md3: [['2026-06-28T21:00:00Z', 0, 3], ['2026-06-28T21:00:00Z', 1, 2]],
    },
    K: {
      md1: [['2026-06-18T21:00:00Z', 0, 1], ['2026-06-18T21:00:00Z', 2, 3]],
      md2: [['2026-06-23T18:00:00Z', 0, 2], ['2026-06-23T18:00:00Z', 1, 3]],
      md3: [['2026-06-29T21:00:00Z', 0, 3], ['2026-06-29T21:00:00Z', 1, 2]],
    },
    L: {
      md1: [['2026-06-19T21:00:00Z', 0, 1], ['2026-06-19T21:00:00Z', 2, 3]],
      md2: [['2026-06-24T18:00:00Z', 0, 2], ['2026-06-24T18:00:00Z', 1, 3]],
      md3: [['2026-06-30T21:00:00Z', 0, 3], ['2026-06-30T21:00:00Z', 1, 2]],
    },
  };

  const matches = [];
  let matchNumber = 1;

  for (const [grp, teams] of Object.entries(groups)) {
    const sched = groupSchedule[grp];
    for (const [dateStr, i, j] of [...sched.md1, ...sched.md2, ...sched.md3]) {
      matches.push({
        id: uuidv4(),
        external_id: null,
        stage: 'GROUP_STAGE',
        match_number: matchNumber++,
        home_team: teams[i],
        away_team: teams[j],
        kickoff_at: ts(dateStr),
        status: 'SCHEDULED',
      });
    }
  }

  // Knockout stage — 32 matches total
  // Dates are approximate seeds; football-data.org sync will update them with exact times.

  // Round of 32 (16 matches): June 30 – July 3, 2026
  const r32 = [
    ['2026-06-30T18:00:00Z', '1º Grupo A', '3º Grupo C/D/E'],
    ['2026-06-30T21:00:00Z', '1º Grupo B', '3º Grupo A/C/D'],
    ['2026-07-01T18:00:00Z', '1º Grupo C', '3º Grupo B/E/F'],
    ['2026-07-01T21:00:00Z', '1º Grupo D', '3º Grupo A/B/F'],
    ['2026-07-01T22:00:00Z', '1º Grupo E', '3º Grupo G/H/I'],
    ['2026-07-02T18:00:00Z', '1º Grupo F', '3º Grupo J/K/L'],
    ['2026-07-02T21:00:00Z', '1º Grupo G', '3º Grupo H/I/J'],
    ['2026-07-02T22:00:00Z', '1º Grupo H', '3º Grupo G/K/L'],
    ['2026-07-03T15:00:00Z', '2º Grupo A', '2º Grupo B'],
    ['2026-07-03T18:00:00Z', '2º Grupo C', '2º Grupo D'],
    ['2026-07-03T21:00:00Z', '2º Grupo E', '2º Grupo F'],
    ['2026-07-03T22:00:00Z', '2º Grupo G', '2º Grupo H'],
    ['2026-07-04T15:00:00Z', '2º Grupo I', '2º Grupo J'],
    ['2026-07-04T18:00:00Z', '2º Grupo K', '2º Grupo L'],
    ['2026-07-04T21:00:00Z', '1º Grupo I', '2º Grupo L'],
    ['2026-07-04T22:00:00Z', '1º Grupo J', '1º Grupo K'],
  ];

  for (const [dateStr, home, away] of r32) {
    matches.push({
      id: uuidv4(),
      external_id: null,
      stage: 'ROUND_OF_32',
      match_number: matchNumber++,
      home_team: home,
      away_team: away,
      kickoff_at: ts(dateStr),
      status: 'SCHEDULED',
    });
  }

  // Round of 16 (8 matches): July 6–9, 2026
  const r16 = [
    ['2026-07-06T18:00:00Z', 'Vencedor R32-1', 'Vencedor R32-2'],
    ['2026-07-06T21:00:00Z', 'Vencedor R32-3', 'Vencedor R32-4'],
    ['2026-07-07T18:00:00Z', 'Vencedor R32-5', 'Vencedor R32-6'],
    ['2026-07-07T21:00:00Z', 'Vencedor R32-7', 'Vencedor R32-8'],
    ['2026-07-08T18:00:00Z', 'Vencedor R32-9', 'Vencedor R32-10'],
    ['2026-07-08T21:00:00Z', 'Vencedor R32-11', 'Vencedor R32-12'],
    ['2026-07-09T18:00:00Z', 'Vencedor R32-13', 'Vencedor R32-14'],
    ['2026-07-09T21:00:00Z', 'Vencedor R32-15', 'Vencedor R32-16'],
  ];

  for (const [dateStr, home, away] of r16) {
    matches.push({
      id: uuidv4(),
      external_id: null,
      stage: 'ROUND_OF_16',
      match_number: matchNumber++,
      home_team: home,
      away_team: away,
      kickoff_at: ts(dateStr),
      status: 'SCHEDULED',
    });
  }

  // Quarter Finals (4 matches): July 11–12, 2026
  const qf = [
    ['2026-07-11T18:00:00Z', 'Vencedor R16-1', 'Vencedor R16-2'],
    ['2026-07-11T21:00:00Z', 'Vencedor R16-3', 'Vencedor R16-4'],
    ['2026-07-12T18:00:00Z', 'Vencedor R16-5', 'Vencedor R16-6'],
    ['2026-07-12T21:00:00Z', 'Vencedor R16-7', 'Vencedor R16-8'],
  ];

  for (const [dateStr, home, away] of qf) {
    matches.push({
      id: uuidv4(),
      external_id: null,
      stage: 'QUARTER_FINALS',
      match_number: matchNumber++,
      home_team: home,
      away_team: away,
      kickoff_at: ts(dateStr),
      status: 'SCHEDULED',
    });
  }

  // Semi Finals (2 matches): July 15–16, 2026
  const sfAdjusted = [
    ['2026-07-15T21:00:00Z', 'Vencedor QF-1', 'Vencedor QF-2'],
    ['2026-07-16T21:00:00Z', 'Vencedor QF-3', 'Vencedor QF-4'],
  ];

  for (const [dateStr, home, away] of sfAdjusted) {
    matches.push({
      id: uuidv4(),
      external_id: null,
      stage: 'SEMI_FINALS',
      match_number: matchNumber++,
      home_team: home,
      away_team: away,
      kickoff_at: ts(dateStr),
      status: 'SCHEDULED',
    });
  }

  // Third place: July 19, 2026
  matches.push({
    id: uuidv4(),
    external_id: null,
    stage: 'THIRD_PLACE',
    match_number: matchNumber++,
    home_team: 'Perdedor SF-1',
    away_team: 'Perdedor SF-2',
    kickoff_at: ts('2026-07-19T15:00:00Z'),
    status: 'SCHEDULED',
  });

  // Final: July 19, 2026
  matches.push({
    id: uuidv4(),
    external_id: null,
    stage: 'FINAL',
    match_number: matchNumber++,
    home_team: 'Vencedor SF-1',
    away_team: 'Vencedor SF-2',
    kickoff_at: ts('2026-07-19T21:00:00Z'),
    status: 'SCHEDULED',
  });

  insertMany(matches);
  console.log(`Seeded ${matches.length} matches.`);
}

module.exports = { runMigrations };
