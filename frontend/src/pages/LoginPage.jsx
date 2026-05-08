import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, User } from 'lucide-react';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admintholibin') {
      localStorage.setItem('isAdmin', 'true');
      navigate('/admin');
    } else {
      setError('Username atau Password salah!');
    }
  };

  return (
    <div className="min-h-screen islamic-pattern flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Hero Image */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.1 }}
        className="absolute inset-0 -z-10"
      >
        <img src="/pesantren_hero.png" alt="Pesantren" className="w-full h-full object-cover" />
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white/95 backdrop-blur-xl rounded-[2rem] border border-white max-w-md w-full p-8 relative z-10 shadow-[0_20px_60px_-15px_rgba(20,83,45,0.2)]"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <img src="/logo.png" alt="Logo Pesantren" className="w-28 h-28 object-contain mix-blend-multiply transition-transform duration-500 hover:scale-105" />
          </div>
          <h2 className="text-3xl font-black text-pesantren-primary tracking-tight">ADMIN LOGIN</h2>
          <p className="text-[10px] font-bold text-pesantren-emerald tracking-[0.3em] uppercase mt-1">Hidayatut Tholibin</p>
          <div className="h-1 w-12 bg-pesantren-gold mx-auto rounded-full mt-4"></div>
        </div>

        {error && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-red-50 text-red-600 p-3 rounded-2xl text-xs font-bold text-center mb-6 border border-red-100 flex items-center justify-center gap-2"
          >
            <Lock className="w-3 h-3" /> {error}
          </motion.div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-4 w-4 text-pesantren-primary/40" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-12 w-full px-4 py-3.5 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-pesantren-emerald outline-none transition-all font-medium text-sm"
                placeholder="admin"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-pesantren-primary/40" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-12 w-full px-4 py-3.5 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-pesantren-emerald outline-none transition-all font-medium text-sm"
                placeholder="••••••••"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-pesantren-primary hover:bg-pesantren-emerald text-white py-4 rounded-2xl font-bold shadow-xl shadow-pesantren-primary/30 transition-all mt-6 active:scale-95"
          >
            Lanjut ke Dashboard
          </button>
        </form>

        <p className="mt-8 text-center text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
          SMP Pesantren Hidayatut Tholibin
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
