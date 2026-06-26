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

  // Fix R32 kickoff dates (previously seeded as July 4+ instead of June 30+)
  const r32Fix = [
    ['2026-06-30T18:00:00Z', '2026-07-04T18:00:00Z'],
    ['2026-06-30T21:00:00Z', '2026-07-04T21:00:00Z'],
    ['2026-07-01T18:00:00Z', '2026-07-05T18:00:00Z'],
    ['2026-07-01T21:00:00Z', '2026-07-05T21:00:00Z'],
    ['2026-07-01T22:00:00Z', '2026-07-06T18:00:00Z'],
    ['2026-07-02T18:00:00Z', '2026-07-06T21:00:00Z'],
    ['2026-07-02T21:00:00Z', '2026-07-07T18:00:00Z'],
    ['2026-07-02T22:00:00Z', '2026-07-07T21:00:00Z'],
    ['2026-07-03T15:00:00Z', '2026-07-08T15:00:00Z'],
    ['2026-07-03T18:00:00Z', '2026-07-08T18:00:00Z'],
    ['2026-07-03T21:00:00Z', '2026-07-08T21:00:00Z'],
    ['2026-07-03T22:00:00Z', '2026-07-09T15:00:00Z'],
    ['2026-07-04T15:00:00Z', '2026-07-09T18:00:00Z'],
    ['2026-07-04T18:00:00Z', '2026-07-09T21:00:00Z'],
    ['2026-07-04T21:00:00Z', '2026-07-10T18:00:00Z'],
    ['2026-07-04T22:00:00Z', '2026-07-10T21:00:00Z'],
  ];
  const updateKickoff = db.prepare(
    "UPDATE matches SET kickoff_at = ? WHERE stage = 'ROUND_OF_32' AND kickoff_at = ? AND status = 'SCHEDULED'"
  );
  for (const [newDate, oldDate] of r32Fix) {
    updateKickoff.run(Math.floor(new Date(newDate).getTime() / 1000), Math.floor(new Date(oldDate).getTime() / 1000));
  }

  // Seed matches if empty
  const count = db.prepare('SELECT COUNT(*) as c FROM matches').get();
  if (count.c === 0) {
    seedMatches(db);
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
