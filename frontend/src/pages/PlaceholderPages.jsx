import AdminLayout from '../components/AdminLayout';
import { Settings, QrCode, MapPin, Hash, Building2, BookOpen, Globe, School } from 'lucide-react';
import { motion } from 'framer-motion';

// ─── Identitas Sekolah ────────────────────────────────────────────────────────
const identityData = [
  { label: 'Nama Sekolah',             value: 'SMP PESANTREN HIDAYATUT THOLIBIN' },
  { label: 'NPSN',                     value: '70011841' },
  { label: 'Alamat',                   value: 'JL. TELING PLAMBANGAN' },
  { label: 'Desa / Kelurahan',         value: 'JAGAPURA KIDUL' },
  { label: 'Kecamatan / Kota',         value: 'KEC. GEGESIK' },
  { label: 'Kabupaten / Kota',         value: 'KAB. CIREBON' },
  { label: 'Provinsi',                 value: 'PROV. JAWA BARAT' },
  { label: 'Status Sekolah',           value: 'SWASTA' },
  { label: 'Bentuk Pendidikan',        value: 'SMP' },
];

export const IdentityPage = () => (
  <AdminLayout>
    <div className="max-w-3xl mx-auto space-y-8">

      {/* ── Header judul halaman ── */}
      <div>
        <h1 className="text-3xl font-bold text-[#2B3674]">Identitas Sekolah</h1>
        <p className="text-gray-400 text-sm mt-1">Profil dan data resmi sekolah</p>
      </div>

      {/* ── Card Utama ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="admin-card overflow-hidden"
      >
        {/* Banner atas — nama sekolah */}
        <div className="bg-gradient-to-r from-[#1B31BB] to-[#2D4696] px-8 py-6 text-center">
          <p className="text-white/60 text-[10px] font-bold uppercase tracking-[0.3em] mb-1">Profil Resmi</p>
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight">
            SMP PESANTREN
          </h2>
          <h2 className="text-2xl md:text-3xl font-black text-yellow-300 tracking-tight">
            HIDAYATUT THOLIBIN
          </h2>
          <div className="h-0.5 w-16 bg-yellow-300/60 mx-auto mt-3 rounded-full" />
        </div>

        {/* Logo sekolah */}
        <div className="flex justify-center py-8 bg-gradient-to-b from-[#2D4696]/5 to-white border-b border-gray-100">
          <div className="relative">
            {/* Lingkaran dekoratif di belakang logo */}
            <div className="absolute inset-0 rounded-full bg-yellow-50 scale-110 opacity-70 blur-sm" />
            <img
              src="/logo.png"
              alt="Logo SMP Pesantren Hidayatut Tholibin"
              className="relative w-40 h-40 object-contain drop-shadow-lg mix-blend-multiply"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            {/* Fallback jika logo tidak ada */}
            <div
              style={{ display: 'none' }}
              className="w-40 h-40 rounded-full bg-yellow-100 border-4 border-yellow-400 items-center justify-center"
            >
              <School className="w-20 h-20 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Tabel data identitas */}
        <div className="px-8 py-6">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-5 flex items-center gap-2">
            <div className="w-1 h-4 bg-[#1B31BB] rounded-full" />
            Data Identitas Sekolah
          </h3>

          <div className="space-y-0 divide-y divide-gray-50">
            {identityData.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start py-4 gap-4 group hover:bg-blue-50/30 -mx-4 px-4 rounded-lg transition-colors"
              >
                {/* Label */}
                <div className="w-48 flex-shrink-0">
                  <p className="text-xs font-semibold text-gray-400">{item.label}</p>
                </div>
                {/* Titik dua */}
                <span className="text-gray-300 font-bold flex-shrink-0">:</span>
                {/* Nilai */}
                <p className={`text-sm font-bold flex-1 ${
                  item.label === 'Nama Sekolah'
                    ? 'text-[#1B31BB]'
                    : item.label === 'NPSN'
                    ? 'text-[#2B3674] font-mono tracking-wider'
                    : 'text-[#2B3674]'
                }`}>
                  {item.value}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Footer card */}
        <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
            Data Pokok Pendidikan — DAPODIK
          </p>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <p className="text-[10px] font-bold text-emerald-600">Terverifikasi</p>
          </div>
        </div>
      </motion.div>

    </div>
  </AdminLayout>
);

// ─── Halaman Placeholder Lainnya ─────────────────────────────────────────────
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

export const SettingsPage  = () => <PlaceholderPage title="Pengaturan Jam"        icon={Settings} />;
export const AdminScanPage = () => <PlaceholderPage title="Absensi Scan (Admin)"  icon={QrCode}   />;

