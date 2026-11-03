/**
 * api.js — Utilitas untuk mendapatkan Base URL API Backend
 * Mendukung akses lokal PC, jaringan Wi-Fi HP, GitHub Pages, dan Vercel
 */
export const getBaseUrl = () => {
  // 1. Cek parameter URL ?backend=... atau ?api=... untuk kemudahan scan dari HP
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const backendParam = params.get('backend') || params.get('api');
    if (backendParam) {
      let clean = backendParam.trim();
      if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        clean = 'http://' + clean;
      }
      localStorage.setItem('backend_url', clean);
      return clean;
    }
  }

  // 2. Cek apakah ada custom backend URL yang disimpan di localStorage
  const savedUrl = localStorage.getItem('backend_url');
  if (savedUrl) return savedUrl;

  const hostname = window.location.hostname;

  // 3. Jika diakses dari localhost di komputer itu sendiri
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }

  // 4. Jika diakses via IP jaringan lokal (misal: 192.168.x.x dari HP di Wi-Fi yang sama)
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    return `http://${hostname}:3001`;
  }

  // 5. Jika diakses dari domain online (GitHub Pages / Vercel):
  // Default ke IP Wi-Fi server lokal agar HP yang terkoneksi Wi-Fi pesantren langsung terhubung
  const DEFAULT_LOCAL_IP = '192.168.100.4';
  return `http://${DEFAULT_LOCAL_IP}:3001`;
};
