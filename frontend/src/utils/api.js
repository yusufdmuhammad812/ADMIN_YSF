/**
 * api.js — Utilitas untuk mendapatkan Base URL API Backend
 */
export const getBaseUrl = () => {
  // Cek apakah ada custom backend URL yang disimpan di localStorage
  const savedUrl = localStorage.getItem('backend_url');
  if (savedUrl) return savedUrl;

  const hostname = window.location.hostname;
  
  // Jika diakses dari Vercel, default ke localhost:3001 (karena backend berjalan di komputer lokal)
  if (hostname.includes('vercel.app')) {
    return 'http://localhost:3001';
  }

  // Jika diakses lokal/IP lokal, sesuaikan dengan hostname yang diakses
  return `http://${hostname}:3001`;
};
