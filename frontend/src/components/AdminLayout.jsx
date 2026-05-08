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
        <div className="p-8">
          <div className="flex items-center gap-3 text-white">
            <div className="p-2 bg-white/20 rounded-lg">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Absensi QR</h1>
              <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold">ADMINISTRATOR</p>
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

        <div className="p-6 mt-auto border-t border-white/10">
          <div className="flex items-center gap-3 px-4 py-3 text-white/80">
             <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
               <span className="text-xs font-bold">A</span>
             </div>
             <span className="text-sm font-medium">admin</span>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 mt-2 text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm">Keluar</span>
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
