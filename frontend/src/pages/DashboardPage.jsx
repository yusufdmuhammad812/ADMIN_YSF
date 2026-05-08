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
  Wifi
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

  useEffect(() => {
    loadData();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [loadData]);

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

          {/* System Info Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="admin-card p-8 bg-[#2D4696] text-white relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-lg font-bold mb-4">Informasi Sistem</h3>
                <p className="text-white/70 text-xs leading-relaxed mb-8">
                  Pastikan scanner QR Code terhubung dengan benar ke port USB untuk proses absensi yang lancar.
                </p>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/60">Database</span>
                    <span className="font-bold flex items-center gap-2">
                      PostgreSQL (Local) <Database className="w-3 h-3" />
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/60">Status</span>
                    <span className="font-bold flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                      Terhubung <Wifi className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
              {/* Decorative circles */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default DashboardPage;
