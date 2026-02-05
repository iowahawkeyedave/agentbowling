const API_URL = typeof window !== 'undefined'
  ? `http://127.0.0.1:3001`
  : 'http://127.0.0.1:3001';

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}/api${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  agents: {
    list: () => fetchApi<any[]>('/agents'),
    get: (id: string) => fetchApi<any>(`/agents/${id}`),
    create: (data: { name: string; twitterHandle?: string }) =>
      fetchApi<any>('/agents', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  matches: {
    recent: (limit = 20) => fetchApi<any[]>(`/matches/recent?limit=${limit}`),
    live: () => fetchApi<any[]>('/matches/live'),
    get: (id: string) => fetchApi<any>(`/match/${id}`),
    create: (agent1Id: string, agent2Id: string) =>
      fetchApi<any>('/match/create', {
        method: 'POST',
        body: JSON.stringify({ agent1Id, agent2Id }),
      }),
    start: (id: string) =>
      fetchApi<any>(`/match/${id}/start`, { method: 'POST' }),
    startAll: () =>
      fetchApi<any>('/match/start-all', { method: 'POST' }),
  },

  queue: {
    status: () => fetchApi<any>('/queue/status'),
    join: (agentId: string, preferredEloRange = 100) =>
      fetchApi<any>('/queue/join', {
        method: 'POST',
        body: JSON.stringify({ agentId, preferredEloRange }),
      }),
    leave: (agentId: string) =>
      fetchApi<any>('/queue/leave', {
        method: 'POST',
        body: JSON.stringify({ agentId }),
      }),
  },

  leaderboard: () => fetchApi<any[]>('/leaderboard'),
};
