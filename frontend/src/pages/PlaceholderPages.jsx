import AdminLayout from '../components/AdminLayout';
import { Settings, School, Printer, QrCode } from 'lucide-react';

const PlaceholderPage = ({ title, icon: Icon }) => (
  <AdminLayout>
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-[#1B31BB] mb-6">
        <Icon className="w-12 h-12" />
      </div>
      <h1 className="text-2xl font-bold text-[#2B3674]">{title}</h1>
      <p className="text-gray-400 mt-2">Halaman ini sedang dalam pengembangan</p>
    </div>
  </AdminLayout>
);

export const IdentityPage = () => <PlaceholderPage title="Identitas Sekolah" icon={School} />;
export const SettingsPage = () => <PlaceholderPage title="Pengaturan Jam" icon={Settings} />;
export const AdminScanPage = () => <PlaceholderPage title="Absensi Scan (Admin)" icon={QrCode} />;
