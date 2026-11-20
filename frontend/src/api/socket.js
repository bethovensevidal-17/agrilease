import { API_ORIGIN } from './config';

// URL ng WebSocket ng chat. Sa development, ipinapasa ng Vite proxy ang /ws sa backend (port 3000).
// Sa production, gagamitin ang VITE_API_ORIGIN kung may nakatakda; kung wala, ang kasalukuyang host.
export function chatSocketUrl() {
  const origin = API_ORIGIN || window.location.origin;
  return `${origin.replace(/^http/i, 'ws')}/ws`;
}
