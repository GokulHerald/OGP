import api from './axiosInstance.js';

export function getMatchesByTournament(tournamentId, round) {
  const params = round != null && round !== '' ? { round } : {};
  return api.get(`/matches/tournament/${tournamentId}`, { params });
}

export function submitStreamLink(matchId, streamUrl) {
  return api.post(`/matches/${matchId}/stream`, { streamUrl });
}

export function submitMatchProof(matchId, formData) {
  return api.post(`/matches/${matchId}/proof`, formData, {
    transformRequest: [
      (data, headers) => {
        delete headers['Content-Type'];
        return data;
      },
    ],
  });
}

export function setMatchResult(matchId, data) {
  return api.post(`/matches/${matchId}/result`, data);
}

export function getLeaderboard(tournamentId) {
  return api.get(`/leaderboard/tournament/${tournamentId}`);
}
