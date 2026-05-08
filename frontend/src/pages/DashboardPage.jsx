import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  UserCheck, 
  Clock, 
  Calendar,
  LayoutDashboard, 
  RefreshCw,
  ArrowRight,
  Database,
  Wifi,
  MessageCircle,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';

const StatCard = ({ title, value, icon: Icon, color, decorColor }) => (
  <div className="admin-card p-6 flex flex-col justify-between relative overflow-hidden h-40">
    <div className="flex justify-between items-start z-10">
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-4xl font-bold text-[#2B3674]">{value}</h3>
      </div>
      <div className={`p-2 rounded-lg bg-gray-50 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
    {/* Decorative background circle */}
    <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-10 ${decorColor}`} />
  </div>
);

const DashboardPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalStudents: 0, presentToday: 0, absentToday: 0, chartData: [] });
  const [attendances, setAttendances] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [waStatus, setWaStatus] = useState({ status: 'loading', isConnected: false, hasQR: false, phoneInfo: null });

  const loadData = useCallback(async () => {
    try {
      const baseUrl = `http://${window.location.hostname}:3001`;
      const [resStats, resAttendances] = await Promise.all([
        fetch(`${baseUrl}/api/dashboard/stats`),
        fetch(`${baseUrl}/api/dashboard/attendances`)
      ]);
      const dataStats = await resStats.json();
      const dataAttendances = await resAttendances.json();
      
      setStats(dataStats);
      setAttendances(dataAttendances);
    } catch (err) {
      console.error("Gagal fetch data", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Polling status WhatsApp setiap 10 detik
  const fetchWaStatus = useCallback(async () => {
    try {
      const baseUrl = `http://${window.location.hostname}:3001`;
      const res = await fetch(`${baseUrl}/api/wa/status`);
      if (res.ok) {
        const data = await res.json();
        setWaStatus(data);
      }
    } catch {
      setWaStatus({ status: 'disconnected', isConnected: false, hasQR: false, phoneInfo: null });
    }
  }, []);

  useEffect(() => {
    loadData();
    fetchWaStatus();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const waTimer = setInterval(fetchWaStatus, 10000);
    return () => { clearInterval(timer); clearInterval(waTimer); };
  }, [loadData, fetchWaStatus]);

  const formatDate = (date) => {
    return date.toLocaleDateString('id-ID', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('id-ID', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false
    }).replace(/\./g, ':');
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Top Header Section */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-[#2B3674]">Dashboard</h1>
            <p className="text-gray-400 text-sm mt-1">Selamat datang di Sistem Absensi Sekolah</p>
          </div>
          
          {/* Clock Widget */}
          <div className="admin-card px-6 py-4 flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{formatDate(currentTime)}</p>
              <p className="text-2xl font-bold text-[#1B31BB] tracking-tighter">{formatTime(currentTime)}</p>
            </div>
            <div className="p-3 bg-[#F4F7FE] text-[#1B31BB] rounded-xl">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            title="SISWA HADIR" 
            value={stats.presentToday} 
            icon={Users} 
            color="text-blue-600"
            decorColor="bg-blue-600"
          />
          <StatCard 
            title="GURU HADIR" 
            value="0" 
            icon={UserCheck} 
            color="text-emerald-500"
            decorColor="bg-emerald-500"
          />
          <StatCard 
            title="SISWA TERLAMBAT" 
            value="0" 
            icon={Clock} 
            color="text-orange-400"
            decorColor="bg-orange-400"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Attendance Table */}
          <div className="lg:col-span-2 admin-card p-8">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-lg font-bold text-[#2B3674] flex items-center gap-2">
                <div className="w-1.5 h-6 bg-[#1B31BB] rounded-full"></div>
                Absensi Terbaru
              </h3>
              <button 
                onClick={() => navigate('/admin/reports')}
                className="text-xs font-bold text-[#1B31BB] hover:underline flex items-center gap-1"
              >
                Lihat Semua <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] text-gray-400 font-bold uppercase tracking-widest border-b border-gray-50">
                    <th className="pb-4 px-2">WAKTU</th>
                    <th className="pb-4 px-2">NAMA</th>
                    <th className="pb-4 px-2">TIPE</th>
                    <th className="pb-4 px-2">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {attendances.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-10 text-center text-gray-300 text-xs font-bold uppercase">Belum ada data</td>
                    </tr>
                  ) : (
                    attendances.slice(0, 5).map((item) => (
                      <tr key={item.id} className="group hover:bg-gray-50/50 transition-all">
                        <td className="py-4 px-2">
                          <p className="text-xs font-bold text-[#2B3674]">
                            {new Date(item.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':')}
                          </p>
                        </td>
                        <td className="py-4 px-2">
                          <div>
                            <p className="text-sm font-bold text-[#2B3674]">{item.name}</p>
                            <p className="text-[10px] text-gray-400 font-bold">{item.class}</p>
                          </div>
                        </td>
                        <td className="py-4 px-2">
                          <span className="px-3 py-1 bg-blue-50 text-[10px] font-bold text-blue-500 rounded-full uppercase">
                            SISWA
                          </span>
                        </td>
                        <td className="py-4 px-2">
                          <span className="px-3 py-1 bg-orange-50 text-[10px] font-bold text-orange-400 rounded-full uppercase">
                            HADIR
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* System Info + WA Status Cards */}
          <div className="lg:col-span-1 space-y-6">
            {/* Info Sistem */}
            <div className="admin-card p-6 bg-[#2D4696] text-white relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-sm font-bold mb-3">Informasi Sistem</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/60">Database</span>
                    <span className="font-bold flex items-center gap-2">
                      PostgreSQL <Database className="w-3 h-3" />
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/60">Backend</span>
                    <span className="font-bold flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                      Online <Wifi className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-28 h-28 bg-white/5 rounded-full -mr-14 -mt-14" />
            </div>

            {/* Status WhatsApp */}
            <div className="admin-card p-6 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-4">
                <div className={`p-2 rounded-lg ${
                  waStatus.isConnected ? 'bg-emerald-50 text-emerald-600' :
                  waStatus.hasQR ? 'bg-amber-50 text-amber-500' :
                  waStatus.status === 'connecting' ? 'bg-blue-50 text-blue-500' :
                  waStatus.status === 'loading' ? 'bg-gray-50 text-gray-400' :
                  'bg-red-50 text-red-400'
                }`}>
                  <MessageCircle className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#2B3674]">Notifikasi WhatsApp</h3>
              </div>

              {/* Indikator Status */}
              <div className={`flex items-center gap-3 p-3 rounded-xl mb-3 ${
                waStatus.isConnected ? 'bg-emerald-50 border border-emerald-100' :
                waStatus.hasQR ? 'bg-amber-50 border border-amber-100' :
                waStatus.status === 'connecting' ? 'bg-blue-50 border border-blue-100' :
                waStatus.status === 'loading' ? 'bg-gray-50 border border-gray-100' :
                'bg-red-50 border border-red-100'
              }`}>
                {waStatus.isConnected && <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
                {waStatus.hasQR && <Smartphone className="w-5 h-5 text-amber-500 flex-shrink-0 animate-pulse" />}
                {waStatus.status === 'connecting' && <Loader2 className="w-5 h-5 text-blue-500 flex-shrink-0 animate-spin" />}
                {waStatus.status === 'loading' && <Loader2 className="w-5 h-5 text-gray-400 flex-shrink-0 animate-spin" />}
                {(waStatus.status === 'disconnected' && !waStatus.hasQR) && <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
                
                <div>
                  <p className={`text-xs font-bold ${
                    waStatus.isConnected ? 'text-emerald-700' :
                    waStatus.hasQR ? 'text-amber-700' :
                    waStatus.status === 'connecting' ? 'text-blue-700' :
                    waStatus.status === 'loading' ? 'text-gray-500' :
                    'text-red-600'
                  }`}>
                    {waStatus.isConnected && '✅ Terhubung & Aktif'}
                    {waStatus.hasQR && '📱 Menunggu Scan QR'}
                    {waStatus.status === 'connecting' && '🔄 Menghubungkan...'}
                    {waStatus.status === 'loading' && 'Memuat status...'}
                    {(waStatus.status === 'disconnected' && !waStatus.hasQR && !waStatus.isConnected) && '❌ Terputus'}
                  </p>
                  {waStatus.isConnected && waStatus.phoneInfo && (
                    <p className="text-[10px] text-emerald-600 mt-0.5">{waStatus.phoneInfo.name || 'WhatsApp Terhubung'}</p>
                  )}
                </div>
              </div>

              {/* Instruksi jika belum login */}
              {(waStatus.hasQR || waStatus.status === 'disconnected') && !waStatus.isConnected && (
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Cara Aktivasi</p>
                  <ol className="text-[10px] text-amber-700 space-y-1 list-decimal list-inside">
                    <li>Buka terminal server backend</li>
                    <li>Akan muncul QR Code</li>
                    <li>Buka WhatsApp di HP</li>
                    <li>Titik 3 → Perangkat Tertaut</li>
                    <li>Scan QR Code tersebut</li>
                  </ol>
                </div>
              )}

              {waStatus.isConnected && (
                <p className="text-[10px] text-gray-400 text-center">Notifikasi otomatis aktif ke semua wali murid</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default DashboardPage;
