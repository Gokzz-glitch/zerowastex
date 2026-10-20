const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  const json = await res.json()
  if (!res.ok) {
    throw new Error(json.error || `Request failed (${res.status})`)
  }
  return json
}

export const api = {
  getOverview: () => request('/api/dashboard/overview'),
  getBins: () => request('/api/bins'),
  getTaxonomy: () => request('/api/material-taxonomy'),
  getWorkflows: () => request('/api/workflow/records'),
  updateWorkflowStatus: (id, payload) => request(`/api/workflow/records/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  getWorkflowAudit: (id) => request(`/api/workflow/records/${id}/audit`),
  getInspections: () => request('/api/inspections'),
  createInspection: (payload) => request('/api/inspections', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateBinCollection: (id, payload) => request(`/api/bins/${id}/collection`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
}
