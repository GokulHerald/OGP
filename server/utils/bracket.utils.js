const Bracket = require('../models/Bracket');
const Match = require('../models/Match');

async function generateBracket(tournament) {
  const players = [...tournament.registeredPlayers];

  // Fisher-Yates shuffle
  for (let i = players.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [players[i], players[j]] = [players[j], players[i]];
  }

  const totalRounds = Math.log2(players.length);
  const matchDocs = [];

  // Round 1 matches with actual players
  for (let i = 0; i < players.length; i += 2) {
    matchDocs.push({
      tournament: tournament._id,
      round: 1,
      matchNumber: i / 2 + 1,
      player1: players[i],
      player2: players[i + 1],
      status: 'pending',
    });
  }

  // Placeholder matches for rounds 2..totalRounds
  for (let round = 2; round <= totalRounds; round += 1) {
    const matchesInRound = players.length / Math.pow(2, round);
    for (let i = 0; i < matchesInRound; i += 1) {
      matchDocs.push({
        tournament: tournament._id,
        round,
        matchNumber: i + 1,
        player1: null,
        player2: null,
        status: 'pending',
      });
    }
  }

  const createdMatches = await Match.insertMany(matchDocs);

  const bracket = await Bracket.create({
    tournament: tournament._id,
    totalRounds,
    matches: createdMatches.map((match) => match._id),
    currentRound: 1,
    isComplete: false,
  });

  return bracket;
}

async function advanceWinner(matchId, winnerId) {
  const match = await Match.findById(matchId).populate('tournament');
  if (!match) {
    throw new Error('Match not found');
  }

  const p1 = match.player1 ? String(match.player1) : null;
  const p2 = match.player2 ? String(match.player2) : null;
  const winner = String(winnerId);

  if (winner !== p1 && winner !== p2) {
    throw new Error('Winner must be one of the match players');
  }

  match.winner = winnerId;
  match.status = 'completed';
  await match.save();

  const tournament = match.tournament;
  const bracket = await Bracket.findOne({ tournament: tournament._id });
  if (!bracket) {
    throw new Error('Bracket not found for tournament');
  }

  if (match.round === bracket.totalRounds) {
    bracket.isComplete = true;
    bracket.champion = winnerId;
    tournament.status = 'completed';
    await Promise.all([bracket.save(), tournament.save()]);
    return { isComplete: true, champion: winnerId };
  }

  const nextRound = match.round + 1;
  const nextMatchNumber = Math.ceil(match.matchNumber / 2);

  const nextMatch = await Match.findOne({
    tournament: tournament._id,
    round: nextRound,
    matchNumber: nextMatchNumber,
  });

  if (!nextMatch) {
    throw new Error('Next match not found');
  }

  if (match.matchNumber % 2 === 1) {
    nextMatch.player1 = winnerId;
  } else {
    nextMatch.player2 = winnerId;
  }
  await nextMatch.save();

  const currentRoundMatches = await Match.find({
    tournament: tournament._id,
    round: match.round,
  });

  const allCompleted = currentRoundMatches.every((m) => m.status === 'completed');
  if (allCompleted) {
    bracket.currentRound = match.round + 1;
    await bracket.save();
  }

  return { isComplete: false, nextMatch };
}

module.exports = { generateBracket, advanceWinner };
