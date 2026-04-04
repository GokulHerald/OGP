import api from './axiosInstance.js';

export function getAllTournaments(params = {}) {
  return api.get('/tournaments', { params });
}

export function getTournamentById(id) {
  return api.get(`/tournaments/${id}`);
}

export function createTournament(data) {
  return api.post('/tournaments', data);
}

export function registerForTournament(id) {
  return api.post(`/tournaments/${id}/register`);
}

export function startTournament(id) {
  return api.post(`/tournaments/${id}/start`);
}

export function registerSquad(tournamentId, body) {
  return api.post(`/tournaments/${tournamentId}/squads`, body);
}

export function setBrWinner(tournamentId, teamId) {
  return api.post(`/tournaments/${tournamentId}/br-winner`, { teamId });
}
