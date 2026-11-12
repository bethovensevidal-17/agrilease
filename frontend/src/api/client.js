const BASE = 'http://localhost:3000/api';

export function getToken() {
  return localStorage.getItem('agrilease_token');
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('agrilease_token', token);
  } else {
    localStorage.removeItem('agrilease_token');
  }
}

export function getUser() {
  const user = localStorage.getItem('agrilease_user');
  return user ? JSON.parse(user) : null;
}

export function setUser(user) {
  if (user) {
    localStorage.setItem('agrilease_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('agrilease_user');
  }
}

export function clearAuth() {
  setToken(null);
  setUser(null);
}

export async function api(path, { method = 'GET', body, formData } = {}) {
  const headers = {};
  const token = getToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let payload;

  if (formData) {
    payload = formData;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const response = await fetch(BASE + path, {
    method,
    headers,
    body: payload,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error || data.message || 'May nangyaring error.'
    );
  }

  return data;
}

export async function getAuthenticatedFile(path) {
  const token = getToken();

  const response = await fetch(BASE + path, {
    method: 'GET',
    headers: token
      ? { Authorization: `Bearer ${token}` }
      : {},
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));

    throw new Error(
      data.message || data.error || 'Unable to open document.'
    );
  }

  return response.blob();
}
