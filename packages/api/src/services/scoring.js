'use strict';

const { v4: uuidv4 } = require('uuid');

const STAGE_MULTIPLIERS = {
  GROUP_STAGE: 1,
  ROUND_OF_32: 1.5,
  ROUND_OF_16: 2,
  QUARTER_FINALS: 3,
  SEMI_FINALS: 4,
  THIRD_PLACE: 3,
  FINAL: 5,
};

/**
 * Calculate score for a single prediction vs result.
 * @returns {{ base: number, bonuses: number, breakdown: string[] }}
 */
function calculateScore(homeGuess, awayGuess, homeResult, awayResult) {
  homeGuess = parseInt(homeGuess, 10);
  awayGuess = parseInt(awayGuess, 10);
  homeResult = parseInt(homeResult, 10);
  awayResult = parseInt(awayResult, 10);

  const breakdown = [];
  let base = 0;
  let bonuses = 0;

  const guessResult = Math.sign(homeGuess - awayGuess); // 1, 0, -1
  const actualResult = Math.sign(homeResult - awayResult);
  const guessDiff = homeGuess - awayGuess;
  const actualDiff = homeResult - awayResult;

  const exactScore = homeGuess === homeResult && awayGuess === awayResult;
  const correctResult = guessResult === actualResult;
  const correctDiff = guessDiff === actualDiff;

  if (exactScore) {
    base = 10;
    breakdown.push('Placar exato (+10)');
  } else if (correctResult && correctDiff) {
    base = 6;
    breakdown.push('Vencedor e saldo corretos (+6)');
  } else if (correctResult) {
    base = 3;
    breakdown.push('Vencedor correto (+3)');
  } else {
    base = 0;
    breakdown.push('Resultado errado (+0)');
  }

  // Bonus: both individual totals correct even if swapped
  const guessScores = [homeGuess, awayGuess].sort((a, b) => a - b);
  const actualScores = [homeResult, awayResult].sort((a, b) => a - b);
  if (!exactScore && guessScores[0] === actualScores[0] && guessScores[1] === actualScores[1]) {
    bonuses += 2;
    breakdown.push('Totais individuais corretos (invertidos) (+2)');
  }

  // Bonus: total goals correct
  if (homeGuess + awayGuess === homeResult + awayResult && !exactScore) {
    bonuses += 1;
    breakdown.push('Total de gols correto (+1)');
  }

  return { base, bonuses, breakdown };
}

/**
 * Recalculate all scores for every prediction of a given match in a group.
 * Also handles streak bonus.
 */
function recalculateGroupScores(db, groupId, matchId) {
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
  if (!match || match.home_score === null || match.away_score === null) return;

  const multiplier = STAGE_MULTIPLIERS[match.stage] || 1;

  const predictions = db
    .prepare('SELECT * FROM predictions WHERE group_id = ? AND match_id = ?')
    .all(groupId, matchId);

  const upsertScore = db.prepare(`
    INSERT INTO scores (id, user_id, group_id, match_id, base_points, bonus_points, multiplier, final_points)
    VALUES (@id, @userId, @groupId, @matchId, @base, @bonuses, @multiplier, @final)
    ON CONFLICT(user_id, group_id, match_id) DO UPDATE SET
      base_points = @base,
      bonus_points = @bonuses,
      multiplier = @multiplier,
      final_points = @final
  `);

  const run = db.transaction(() => {
    for (const pred of predictions) {
      const { base, bonuses } = calculateScore(
        pred.home_guess,
        pred.away_guess,
        match.home_score,
        match.away_score
      );

      // Streak bonus: every 3 consecutive non-zero results = +1
      const streakBonus = getStreakBonus(db, pred.user_id, groupId, matchId, base > 0);

      const totalBase = base;
      const totalBonus = bonuses + streakBonus;
      const final = Math.round((totalBase + totalBonus) * multiplier);

      upsertScore.run({
        id: uuidv4(),
        userId: pred.user_id,
        groupId: groupId,
        matchId: matchId,
        base: totalBase,
        bonuses: totalBonus,
        multiplier,
        final,
      });
    }
  });

  run();
}

/**
 * Count consecutive correct results to award streak bonus.
 * Every 3 consecutive correct calls = +1 bonus point.
 */
function getStreakBonus(db, userId, groupId, currentMatchId, currentCorrect) {
  // Get last scores for this user in this group, ordered by match kickoff
  const recentScores = db.prepare(`
    SELECT s.final_points, s.base_points, m.kickoff_at
    FROM scores s
    JOIN matches m ON m.id = s.match_id
    WHERE s.user_id = ? AND s.group_id = ? AND s.match_id != ?
    ORDER BY m.kickoff_at DESC
    LIMIT 5
  `).all(userId, groupId, currentMatchId);

  // Count current streak (consecutive base_points > 0)
  let streak = currentCorrect ? 1 : 0;
  for (const score of recentScores) {
    if (score.base_points > 0) {
      streak++;
    } else {
      break;
    }
  }

  // Award +1 for every 3 in a streak
  return Math.floor(streak / 3);
}

module.exports = { calculateScore, recalculateGroupScores, STAGE_MULTIPLIERS };
