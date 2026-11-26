const API_BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Кампании
  getCampaigns: () => request('/campaigns/'),
  createCampaign: (data) => request('/campaigns/', { method: 'POST', body: JSON.stringify(data) }),
  deleteCampaign: (id) => request(`/campaigns/${id}`, { method: 'DELETE' }),

  // Офферы (автокомплит)
  syncOffers: () => request('/campaigns/sync-offers', { method: 'POST' }),
  searchOffers: (q) => request(`/campaigns/offers?q=${encodeURIComponent(q)}`),

  // Потоки
  getStreams: (campaignId, pull = false) => request(`/streams/${campaignId}${pull ? '?pull=true' : ''}`),
  pushStreams: (campaignId, payload) => request(`/streams/${campaignId}/push`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
};