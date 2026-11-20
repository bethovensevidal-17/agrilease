// API configuration shared by fetch requests and uploaded-file URLs.
// Production: set VITE_API_URL (e.g. https://api.example.com/api).
// Optional VITE_API_ORIGIN is the backend origin for /uploads assets.
const configuredApiUrl = import.meta.env.VITE_API_URL || '/api';
export const API_BASE = configuredApiUrl.replace(/\/$/, '');

const configuredOrigin = import.meta.env.VITE_API_ORIGIN;
export const API_ORIGIN = (configuredOrigin || (configuredApiUrl.startsWith('http')
  ? configuredApiUrl.replace(/\/api\/?$/, '')
  : '')).replace(/\/$/, '');

export function assetUrl(path) {
  if (!path) return '';
  if (/^(?:https?:)?\/\//i.test(path) || path.startsWith('data:')) return path;
  return `${API_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}
