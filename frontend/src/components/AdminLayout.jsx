import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  QrCode, 
  Printer, 
  Users, 
  Contact, 
  FileText, 
  School, 
  Clock, 
  LogOut,
  ChevronRight,
  User
} from 'lucide-react';

const SidebarItem = ({ icon: Icon, label, path, active }) => (
  <Link 
    to={path} 
    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
      active 
        ? 'bg-white/10 text-white font-semibold' 
        : 'text-white/70 hover:text-white hover:bg-white/5'
    }`}
  >
    <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-white/70 group-hover:text-white'}`} />
    <span className="text-sm">{label}</span>
    {active && <div className="ml-auto w-1 h-4 bg-white rounded-full" />}
  </Link>
);

const AdminLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
    { icon: QrCode, label: 'Absensi Scan', path: '/admin/scan' },
    { icon: Printer, label: 'Cetak QR', path: '/admin/print-qr' },
    { icon: Users, label: 'Data Siswa', path: '/admin/students' },
    { icon: Contact, label: 'Data Guru', path: '/admin/teachers' },
    { icon: FileText, label: 'Rekap Laporan', path: '/admin/reports' },
    { icon: School, label: 'Identitas Sekolah', path: '/admin/identity' },
    { icon: Clock, label: 'Pengaturan Jam', path: '/admin/settings' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('isAdmin');
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-admin-bg font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-admin-sidebar flex flex-col fixed h-screen z-50">
        <div className="relative pt-10 pb-8 px-6 overflow-hidden bg-[#0f2040] shadow-xl border-b-2 border-white">
          {/* Variasi Mega Mendung (SVG Code - Works Instantly without file) */}
          <div className="absolute inset-0 opacity-[0.25] pointer-events-none" 
               style={{ 
                 backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 200 120\'%3E%3Cpath fill=\'%2360a5fa\' d=\'M50,80 Q10,80 10,50 Q10,20 50,20 Q65,20 75,35 Q90,5 130,5 Q170,5 170,45 Q170,80 130,80 Z\'/%3E%3Cpath fill=\'%233b82f6\' d=\'M55,75 Q15,75 15,50 Q15,25 55,25 Q70,25 80,40 Q95,10 130,10 Q165,10 165,45 Q165,75 130,75 Z\'/%3E%3Cpath fill=\'%231e3a8a\' d=\'M60,70 Q20,70 20,50 Q20,30 60,30 Q75,30 85,45 Q100,15 130,15 Q160,15 160,45 Q160,70 130,70 Z\'/%3E%3Cpath fill=\'%230f172a\' d=\'M65,65 Q25,65 25,50 Q25,35 65,35 Q80,35 90,50 Q105,20 130,20 Q155,20 155,45 Q155,65 130,65 Z\'/%3E%3C/svg%3E")',
                 backgroundSize: '150px',
                 backgroundRepeat: 'repeat',
                 backgroundPosition: 'top right'
               }}>
          </div>

          <div className="relative z-10 flex items-center gap-4 text-white">
             <div className="w-14 h-14 bg-white/10 p-0.5 rounded-full flex items-center justify-center flex-shrink-0 backdrop-blur-md border border-white/20 shadow-lg relative group cursor-pointer transition-transform hover:scale-105">
               <div className="w-full h-full rounded-full overflow-hidden bg-white/95">
                 <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin&backgroundColor=e2e8f0" alt="Avatar" className="w-full h-full object-cover" />
               </div>
             </div>
            <div className="flex flex-col drop-shadow-md">
              <h1 className="text-xl font-bold tracking-tight leading-tight text-white uppercase">Admin</h1>
              <div className="flex items-center mt-1">
                <span className="text-[10px] text-white/90 uppercase tracking-[0.2em] font-medium">Absensi QR</span>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <SidebarItem 
              key={item.path}
              icon={item.icon}
              label={item.label}
              path={item.path}
              active={currentPath === item.path}
            />
          ))}
        </nav>

        <div className="p-4 mt-auto">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-72 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
