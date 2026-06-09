'use strict';

const express = require('express');

// WC2026 group assignments (matches the seed data in migrations.js)
const WC_GROUPS = {
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

function buildTeamRow(name) {
  return { name, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 };
}

module.exports = function wcGroupsRoutes(db) {
  const router = express.Router();

  // GET /api/wc-groups
  router.get('/', (req, res) => {
    try {
      // Fetch all finished GROUP_STAGE matches
      const matches = db
        .prepare(
          `SELECT home_team, away_team, home_score, away_score
           FROM matches
           WHERE stage = 'GROUP_STAGE' AND status = 'FINISHED'
             AND home_score IS NOT NULL AND away_score IS NOT NULL`
        )
        .all();

      // Build standings per group
      const result = Object.entries(WC_GROUPS).map(([groupLetter, teams]) => {
        // Initialize team stats
        const stats = {};
        for (const t of teams) {
          stats[t] = buildTeamRow(t);
        }

        // Process finished matches that belong to this group
        for (const m of matches) {
          const home = stats[m.home_team];
          const away = stats[m.away_team];
          if (!home || !away) continue; // match doesn't belong to this group

          const hs = m.home_score;
          const as_ = m.away_score;

          home.played++;
          away.played++;
          home.gf += hs;
          home.ga += as_;
          away.gf += as_;
          away.ga += hs;

          if (hs > as_) {
            home.won++;
            home.points += 3;
            away.lost++;
          } else if (hs < as_) {
            away.won++;
            away.points += 3;
            home.lost++;
          } else {
            home.drawn++;
            away.drawn++;
            home.points += 1;
            away.points += 1;
          }
        }

        // Compute GD and sort
        const sorted = teams
          .map((t) => {
            const s = stats[t];
            s.gd = s.gf - s.ga;
            return s;
          })
          .sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.gd !== a.gd) return b.gd - a.gd;
            if (b.gf !== a.gf) return b.gf - a.gf;
            return a.name.localeCompare(b.name);
          });

        return { group: groupLetter, teams: sorted };
      });

      res.json({ groups: result });
    } catch (err) {
      console.error('wcgroups error', err);
      res.status(500).json({ error: 'Erro interno' });
    }
  });

  return router;
};
