import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  UserCheck,
  UserX,
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
  XCircle,
  AlertCircle,
  Loader2,
  Search,
  Filter
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { QRCodeSVG } from 'qrcode.react';
import { getBaseUrl } from '../utils/api';

const StatCard = ({ title, value, icon: Icon, color, decorColor, subtitle }) => (
  <div className="admin-card p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden h-36 sm:h-40">
    <div className="flex justify-between items-start z-10">
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-3xl sm:text-4xl font-bold text-[#2B3674]">{value}</h3>
        {subtitle && (
          <p className="text-[11px] text-gray-500 font-semibold mt-1 flex items-center gap-1">
            {subtitle}
          </p>
        )}
      </div>
      <div className={`p-2.5 rounded-xl bg-gray-50 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
    {/* Decorative background circle */}
    <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-10 ${decorColor}`} />
  </div>
);

const DashboardPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalStudents: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    onTimeToday: 0,
    teachersPresentToday: 0,
    chartData: []
  });
  const [attendances, setAttendances] = useState([]);
  const [absentStudents, setAbsentStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [waStatus, setWaStatus] = useState({ status: 'loading', isConnected: false, hasQR: false, phoneInfo: null });
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [customIp, setCustomIp] = useState(localStorage.getItem('backend_url') || 'http://localhost:3001');

  // Filter & Search untuk tabel Absensi Terbaru
  const [statusFilter, setStatusFilter] = useState('SEMUA'); // 'SEMUA' | 'TEPAT_WAKTU' | 'TERLAMBAT' | 'TIDAK_ABSEN'
  const [searchQuery, setSearchQuery] = useState('');

  const handleSaveIp = () => {
    if (customIp.trim()) {
      let url = customIp.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'http://' + url;
      }
      localStorage.setItem('backend_url', url);
      alert('Alamat IP Server berhasil disimpan! Halaman akan dimuat ulang.');
      window.location.reload();
    }
  };

  const handleResetIp = () => {
    localStorage.removeItem('backend_url');
    setCustomIp('http://localhost:3001');
    alert('Alamat IP Server dikembalikan ke default. Halaman akan dimuat ulang.');
    window.location.reload();
  };

  const loadData = useCallback(async () => {
    try {
      const baseUrl = getBaseUrl();
      const [resStats, resAttendances, resAbsent] = await Promise.all([
        fetch(`${baseUrl}/api/dashboard/stats`),
        fetch(`${baseUrl}/api/dashboard/attendances`),
        fetch(`${baseUrl}/api/dashboard/absent-today`)
      ]);
      const dataStats = await resStats.json();
      const dataAttendances = await resAttendances.json();
      const dataAbsent = resAbsent.ok ? await resAbsent.json() : [];

      setStats(dataStats);
      setAttendances(Array.isArray(dataAttendances) ? dataAttendances : []);
      setAbsentStudents(Array.isArray(dataAbsent) ? dataAbsent : []);
    } catch (err) {
      console.error("Gagal fetch data", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Polling status WhatsApp setiap 10 detik
  const fetchWaStatus = useCallback(async () => {
    try {
      const baseUrl = getBaseUrl();
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

  // Menghitung filter list berdasarkan status dan pencarian nama/kelas
  const getDisplayItems = () => {
    let sourceList = [];
    if (statusFilter === 'TIDAK_ABSEN') {
      sourceList = absentStudents;
    } else if (statusFilter === 'TERLAMBAT') {
      sourceList = attendances.filter(a => a.status === 'TERLAMBAT');
    } else if (statusFilter === 'TEPAT_WAKTU') {
      sourceList = attendances.filter(a => a.status === 'TEPAT WAKTU');
    } else {
      // 'SEMUA': Tampilkan absensi terbaru yang sudah masuk
      sourceList = attendances;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      sourceList = sourceList.filter(item =>
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.class && item.class.toLowerCase().includes(q)) ||
        (item.nisn && item.nisn.includes(q))
      );
    }

    return sourceList;
  };

  const displayList = getDisplayItems();

  // Hitung jumlah untuk pill navigasi
  const onTimeCount = attendances.filter(a => a.status === 'TEPAT WAKTU').length;
  const lateCount = attendances.filter(a => a.status === 'TERLAMBAT').length;
  const absentCount = absentStudents.length;

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Top Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#2B3674]">Dashboard</h1>
            <p className="text-gray-400 text-sm mt-1">Sistem Absensi SMP Pesantren Hidayatut Tholibin</p>
          </div>

          {/* Clock Widget */}
          <div className="admin-card px-5 py-3.5 flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{formatDate(currentTime)}</p>
              <p className="text-2xl font-bold text-[#1B31BB] tracking-tighter">{formatTime(currentTime)} <span className="text-xs font-semibold text-gray-400">WIB</span></p>
            </div>
            <div className="p-2.5 bg-[#F4F7FE] text-[#1B31BB] rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* 4 Stat Cards: Hadir, Terlambat, Tidak Absen, Guru Hadir */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          <StatCard
            title="SISWA HADIR"
            value={stats.presentToday || 0}
            icon={Users}
            color="text-blue-600"
            decorColor="bg-blue-600"
            subtitle={`${stats.onTimeToday || 0} hadir tepat waktu`}
          />
          <StatCard
            title="SISWA TERLAMBAT"
            value={stats.lateToday || 0}
            icon={Clock}
            color="text-amber-500"
            decorColor="bg-amber-500"
            subtitle="Melebihi batas 07:15 WIB"
          />
          <StatCard
            title="TIDAK ABSEN"
            value={stats.absentToday || 0}
            icon={UserX}
            color="text-rose-500"
            decorColor="bg-rose-500"
            subtitle="Belum hadir / tidak absen hari ini"
          />
          <StatCard
            title="GURU HADIR"
            value={stats.teachersPresentToday || 0}
            icon={UserCheck}
            color="text-emerald-500"
            decorColor="bg-emerald-500"
            subtitle={`Dari total ${stats.totalTeachers || 0} guru`}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Fitur Absensi Terbaru dengan Filter & Status Lengkap */}
          <div className="lg:col-span-2 admin-card p-6 sm:p-8">
            {/* Header Absensi Terbaru */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-1.5 h-6 bg-[#1B31BB] rounded-full"></div>
                <div>
                  <h3 className="text-lg font-bold text-[#2B3674]">Absensi Terbaru</h3>
                  <p className="text-[11px] text-gray-400 font-medium">
                    Batas toleransi tepat waktu maksimal pukul <span className="font-bold text-amber-600">07:15 WIB</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => navigate('/admin/reports')}
                className="text-xs font-bold text-[#1B31BB] hover:underline flex items-center gap-1 cursor-pointer"
              >
                Lihat Rekap Lengkap <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
              {/* Tab Kategori Status: Semua, Tepat Waktu, Terlambat, Tidak Absen */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setStatusFilter('SEMUA')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${statusFilter === 'SEMUA'
                      ? 'bg-[#1B31BB] text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  Semua ({attendances.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('TEPAT_WAKTU')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${statusFilter === 'TEPAT_WAKTU'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Tepat Waktu ({onTimeCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('TERLAMBAT')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${statusFilter === 'TERLAMBAT'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                    }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Terlambat ({lateCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('TIDAK_ABSEN')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${statusFilter === 'TIDAK_ABSEN'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                    }`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Tidak Absen ({absentCount})</span>
                </button>
              </div>

              {/* Input Pencarian Santri */}
              <div className="relative min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama atau kelas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 focus:outline-none focus:border-[#1B31BB]"
                />
              </div>
            </div>

            {/* Tabel Absensi Terbaru */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] text-gray-400 font-bold uppercase tracking-widest border-b border-gray-100">
                    <th className="pb-3 px-2">WAKTU</th>
                    <th className="pb-3 px-2">NAMA LENGKAP</th>
                    <th className="pb-3 px-2">TIPE</th>
                    <th className="pb-3 px-2">STATUS KEHADIRAN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {displayList.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-12 text-center text-gray-400 text-xs font-semibold">
                        {statusFilter === 'TIDAK_ABSEN'
                          ? 'Alhamdulillah, semua siswa sudah melakukan absensi hari ini!'
                          : 'Tidak ada data absensi untuk kategori ini'}
                      </td>
                    </tr>
                  ) : (
                    displayList.slice(0, 10).map((item) => (
                      <tr key={item.id} className="group hover:bg-gray-50/70 transition-all">
                        {/* Kolom Waktu */}
                        <td className="py-3.5 px-2">
                          {item.timestamp ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-bold text-[#2B3674] font-mono">
                                {new Date(item.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\./g, ':')}
                              </span>
                              <span className="text-[9px] font-mono text-gray-400 bg-gray-100 px-1 py-0.5 rounded">
                                .{String(new Date(item.timestamp).getMilliseconds()).padStart(3, '0')}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-gray-400">
                              <span className="text-xs font-mono font-medium">—</span>
                              <span className="text-[10px] text-gray-400 font-semibold">(Belum Absen)</span>
                            </div>
                          )}
                        </td>

                        {/* Kolom Nama & Kelas */}
                        <td className="py-3.5 px-2">
                          <div>
                            <p className="text-sm font-bold text-[#2B3674] group-hover:text-[#1B31BB] transition-colors">
                              {item.name}
                            </p>
                            <p className="text-[10px] text-gray-400 font-semibold">
                              {item.class} • NISN: {item.nisn}
                            </p>
                          </div>
                        </td>

                        {/* Kolom Tipe */}
                        <td className="py-3.5 px-2">
                          <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase ${item.type === 'GURU'
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                              : 'bg-blue-50 text-blue-600 border border-blue-100'
                            }`}>
                            {item.type || 'SISWA'}
                          </span>
                        </td>

                        {/* Kolom Status (Tepat Waktu, Terlambat, Tidak Absen) */}
                        <td className="py-3.5 px-2">
                          {item.status === 'TERLAMBAT' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-[10px] font-bold text-amber-700 border border-amber-200/90 rounded-full uppercase tracking-wider">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>TERLAMBAT</span>
                            </span>
                          ) : item.status === 'TIDAK ABSEN' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-[10px] font-bold text-rose-700 border border-rose-200/90 rounded-full uppercase tracking-wider">
                              <XCircle className="w-3 h-3 text-rose-600" />
                              <span>TIDAK ABSEN</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-[10px] font-bold text-emerald-700 border border-emerald-200/90 rounded-full uppercase tracking-wider">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>TEPAT WAKTU</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {displayList.length > 10 && (
                <div className="pt-4 text-center border-t border-gray-100">
                  <p className="text-[11px] text-gray-400 font-medium">
                    Menampilkan 10 dari total {displayList.length} data. Klik <button onClick={() => navigate('/admin/reports')} className="text-[#1B31BB] font-bold hover:underline cursor-pointer">Lihat Rekap</button> untuk melihat seluruh data.
                  </p>
                </div>
              )}
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
                  <div className="flex justify-between items-center text-xs pt-2 border-t border-white/10">
                    <span className="text-white/60">Batas Absen Masuk</span>
                    <span className="font-mono font-bold text-amber-300">07:15 WIB</span>
                  </div>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-28 h-28 bg-white/5 rounded-full -mr-14 -mt-14" />
            </div>

            {/* Status WhatsApp */}
            <div className="admin-card p-6 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-4">
                <div className={`p-2 rounded-lg ${waStatus.isConnected ? 'bg-emerald-50 text-emerald-600' :
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
              <div className={`flex items-center gap-3 p-3 rounded-xl mb-3 ${waStatus.isConnected ? 'bg-emerald-50 border border-emerald-100' :
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
                  <p className={`text-xs font-bold ${waStatus.isConnected ? 'text-emerald-700' :
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

              {/* Tampilan QR Code untuk Scan Langsung dari Website */}
              {waStatus.hasQR && waStatus.qrCode && (
                <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-amber-100 shadow-sm mb-4">
                  <p className="text-[11px] font-black text-amber-700 uppercase tracking-widest mb-3">Scan QR di Bawah Ini:</p>
                  <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <QRCodeSVG value={waStatus.qrCode} size={180} level="M" includeMargin={true} />
                  </div>
                  <p className="text-[9px] text-gray-400 text-center mt-3 font-medium animate-pulse">
                    Masa berlaku QR terbatas. Silakan scan secepatnya.
                  </p>
                </div>
              )}

              {/* Instruksi jika belum login */}
              {(waStatus.hasQR || waStatus.status === 'disconnected') && !waStatus.isConnected && (
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Cara Aktivasi</p>
                  <ol className="text-[10px] text-amber-700 space-y-1 list-decimal list-inside">
                    {waStatus.hasQR ? (
                      <>
                        <li>Buka WhatsApp di HP Anda</li>
                        <li>Ketuk menu Titik 3 atau Pengaturan</li>
                        <li>Pilih "Perangkat Tertaut"</li>
                        <li>Scan QR Code yang tampil di atas langsung dari layar web!</li>
                      </>
                    ) : (
                      <>
                        <li>Pastikan server backend berjalan</li>
                        <li>Hubungkan backend dengan internet</li>
                        <li>Sistem akan memuat QR Code otomatis</li>
                      </>
                    )}
                  </ol>
                </div>
              )}

              {waStatus.isConnected && (
                <p className="text-[10px] text-gray-400 text-center">Notifikasi otomatis aktif ke semua wali murid</p>
              )}

              {/* Konfigurasi IP Backend (Jika Terputus) */}
              {!waStatus.isConnected && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => setShowApiConfig(!showApiConfig)}
                    className="text-[10px] font-bold text-gray-400 hover:text-pesantren-primary flex items-center gap-1 mx-auto transition-colors"
                  >
                    ⚙️ {showApiConfig ? 'Sembunyikan Pengaturan IP' : 'Pengaturan IP Server Backend'}
                  </button>
                  {showApiConfig && (
                    <div className="mt-3 space-y-2">
                      <p className="text-[9px] text-gray-400 font-medium">
                        Masukkan IP komputer server backend Anda jika tidak menggunakan localhost:
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customIp}
                          onChange={(e) => setCustomIp(e.target.value)}
                          placeholder="http://localhost:3001"
                          className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-mono outline-none focus:ring-1 focus:ring-pesantren-emerald"
                        />
                        <button
                          onClick={handleSaveIp}
                          className="px-3 py-1.5 bg-pesantren-primary hover:bg-pesantren-emerald text-white text-xs font-bold rounded-lg transition-colors active:scale-95 cursor-pointer"
                        >
                          Simpan
                        </button>
                      </div>
                      {localStorage.getItem('backend_url') && (
                        <button
                          onClick={handleResetIp}
                          className="text-[9px] text-red-500 hover:underline block font-semibold text-center mx-auto mt-1 cursor-pointer"
                        >
                          Reset ke Default
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default DashboardPage;
