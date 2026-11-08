// Iisang lugar para sa lahat ng tawag sa backend.
const BASE = '/api';

export function getToken() {
  return localStorage.getItem('agrilease_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('agrilease_token', token);
  else localStorage.removeItem('agrilease_token');
}

// api('/equipment?page=1')
// api('/equipment', { method: 'POST', formData })   para sa may image upload
// api('/equipment/3/archive', { method: 'PATCH' })
export async function api(path, { method = 'GET', body, formData } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (formData) {
    payload = formData; // huwag lagyan ng Content-Type, ang browser ang bahala
  } else if (body) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(BASE + path, { method, headers, body: payload });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data.error || (data.errors && data.errors.join(' ')) || 'May nangyaring error.';
    throw new Error(message);
  }
  return data;
}
