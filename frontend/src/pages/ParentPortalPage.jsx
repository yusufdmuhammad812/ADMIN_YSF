import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, UserCircle, Clock, Calendar, CheckCircle, AlertCircle, ArrowLeft, Phone, User } from 'lucide-react';
import { Link } from 'react-router-dom';

import { getBaseUrl } from '../utils/api';

const ParentPortalPage = () => {
  const [parentPhone, setParentPhone] = useState('');
  const [studentName, setStudentName] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!parentPhone || !studentName) return;

    setLoading(true);
    setError('');
    setResults([]);

    try {
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/api/parent/check-secure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentPhone, studentName })
      });
      const data = await response.json();

      if (response.ok) {
        setResults(data);
      } else {
        setError(data.error || 'Data tidak ditemukan');
      }
    } catch (err) {
      setError('Gagal terhubung ke server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen islamic-pattern p-4 font-sans flex flex-col items-center relative overflow-hidden">
      {/* Background Hero Image */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.1 }}
        className="absolute inset-0 -z-10"
      >
        <img src="/pesantren_hero.png" alt="Pesantren" className="w-full h-full object-cover" />
      </motion.div>

      <div className="w-full max-w-lg relative z-10">
        {/* Back Link */}
        <Link to="/" className="inline-flex items-center gap-2 text-pesantren-primary/60 hover:text-pesantren-primary transition-colors text-[10px] font-black uppercase tracking-widest mb-10 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-pesantren-primary/5">
          <ArrowLeft className="w-3 h-3" /> Kembali ke Scanner
        </Link>

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-pesantren-primary tracking-tight">PORTAL WALI MURID</h1>
          <p className="text-xs font-bold text-pesantren-emerald tracking-[0.2em] uppercase mt-1">Cek Kehadiran Santri</p>
          <div className="h-1 w-10 bg-pesantren-gold mx-auto rounded-full mt-3"></div>
        </div>

        {/* Search Card */}
        <div className="glass-card p-8 mb-8 shadow-2xl shadow-pesantren-primary/5">
          <form onSubmit={handleSearch} className="flex flex-col gap-5">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">No. HP Orang Tua (WhatsApp)</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Contoh: 083148100602"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  className="w-full px-5 py-4 pl-12 bg-gray-50 border-0 rounded-[1.5rem] focus:ring-2 focus:ring-pesantren-emerald outline-none transition-all font-medium text-sm text-[#2B3674]"
                  required
                />
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-pesantren-primary/40" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Nama Lengkap Siswa</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Masukkan nama lengkap anak Anda"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full px-5 py-4 pl-12 bg-gray-50 border-0 rounded-[1.5rem] focus:ring-2 focus:ring-pesantren-emerald outline-none transition-all font-medium text-sm text-[#2B3674]"
                  required
                />
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-pesantren-primary/40" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-pesantren-primary hover:bg-pesantren-emerald text-white py-4 rounded-[1.5rem] font-bold shadow-xl shadow-pesantren-primary/30 transition-all flex justify-center items-center gap-2 disabled:opacity-50 active:scale-95 mt-2"
            >
              {loading ? 'Mencari...' : 'Periksa Kehadiran'}
            </button>
          </form>
        </div>

        {/* Result Area */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-600 shadow-sm"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </motion.div>
          )}

          {results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {results.map((result, index) => (
                <div key={index} className="glass-card overflow-hidden">
                  <div className="bg-pesantren-primary/5 p-4 border-b border-pesantren-primary/10 flex items-center gap-3">
                    <div className="p-2 bg-pesantren-primary rounded-xl text-white">
                      <UserCircle className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-gray-800">{result.name}</h3>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Kelas: {result.class}</p>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex flex-col items-center justify-center py-2">
                      {result.attendance ? (
                        <>
                          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                            <CheckCircle className="w-8 h-8" />
                          </div>
                          <h4 className="text-lg font-bold text-emerald-600 mb-1">Sudah Hadir</h4>
                          <div className="flex items-center gap-4 mt-4 w-full">
                            <div className="flex-1 bg-gray-50 p-3 rounded-2xl border border-gray-100 text-center">
                              <Clock className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                              <p className="text-[10px] text-gray-500 uppercase">Jam</p>
                              <p className="font-bold text-gray-800 text-sm">{new Date(result.attendance.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                            <div className="flex-1 bg-gray-50 p-3 rounded-2xl border border-gray-100 text-center">
                              <Calendar className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                              <p className="text-[10px] text-gray-500 uppercase">Hari</p>
                              <p className="font-bold text-gray-800 text-sm">{new Date(result.attendance.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-3">
                            <AlertCircle className="w-8 h-8" />
                          </div>
                          <h4 className="text-lg font-bold text-amber-600 mb-1">Belum Hadir</h4>
                          <p className="text-xs text-gray-500 text-center px-4">Santri belum melakukan scan hari ini.</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="mt-12 text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
            SMP Pesantren Hidayatut Tholibin
          </p>
        </footer>
      </div>
    </div>
  );
};

export default ParentPortalPage;
