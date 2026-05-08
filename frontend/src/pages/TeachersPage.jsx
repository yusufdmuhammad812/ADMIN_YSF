import { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Download, 
  Upload, 
  Plus, 
  Search,
  MoreVertical,
  Trash2,
  Printer,
  UserSquare,
  Edit2
} from 'lucide-react';
import AdminLayout from '../components/AdminLayout';

const TeachersPage = () => {
  const [teachers, setTeachers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTeachers = useCallback(async () => {
    try {
      setIsLoading(true);
      const baseUrl = `http://${window.location.hostname}:3001`;
      const res = await fetch(`${baseUrl}/api/dashboard/teachers`);
      const data = await res.json();
      setTeachers(data);
    } catch (error) {
      console.error("Gagal mengambil data guru:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.nip.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus data ini?")) return;
    try {
      const baseUrl = `http://${window.location.hostname}:3001`;
      await fetch(`${baseUrl}/api/dashboard/teachers/${id}`, { method: 'DELETE' });
      fetchTeachers();
    } catch (error) {
      alert("Gagal menghapus data");
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-[#2B3674]">Data Guru</h1>
            <p className="text-gray-400 text-sm mt-1">Kelola data master guru dan generate QR Code</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 bg-white text-gray-600 px-4 py-2.5 rounded-xl text-xs font-bold border border-gray-100 shadow-sm hover:bg-gray-50 transition-all">
              <Download className="w-4 h-4" /> Template
            </button>
            <button className="flex items-center gap-2 bg-white text-emerald-500 px-4 py-2.5 rounded-xl text-xs font-bold border border-gray-100 shadow-sm hover:bg-emerald-50 transition-all">
              <Upload className="w-4 h-4" /> Upload Excel
            </button>
            <button className="flex items-center gap-2 bg-[#1B31BB] text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-800 transition-all">
              <Plus className="w-4 h-4" /> Tambah Guru
            </button>
          </div>
        </div>

        {/* Search and Table Card */}
        <div className="admin-card p-8">
          <div className="flex justify-between items-center mb-8">
            <div className="relative w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Cari nama, NIP, atau jabatan..." 
                className="w-full pl-12 pr-4 py-3 bg-[#F4F7FE] border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              TOTAL: <span className="text-[#2B3674]">{teachers.length} GURU</span>
            </p>
          </div>

          <div className="overflow-x-auto min-h-[300px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-64 text-gray-400 italic">Memuat data...</div>
            ) : filteredTeachers.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                  <UserSquare className="w-10 h-10" />
                </div>
                <p className="text-gray-400 text-sm italic">Tidak ada data guru ditemukan</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] text-gray-400 font-bold uppercase tracking-widest border-b border-gray-50">
                    <th className="pb-4 px-2">NAMA</th>
                    <th className="pb-4 px-2">NIP</th>
                    <th className="pb-4 px-2">JABATAN / KATEGORI</th>
                    <th className="pb-4 px-2 text-right">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredTeachers.map((teacher) => (
                    <tr key={teacher.id} className="group hover:bg-gray-50/50 transition-all">
                      <td className="py-4 px-2">
                        <span className="font-bold text-[#2B3674] text-sm">{teacher.name}</span>
                      </td>
                      <td className="py-4 px-2">
                        <span className="text-gray-500 text-xs font-medium">{teacher.nip}</span>
                      </td>
                      <td className="py-4 px-2">
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-bold ${
                          teacher.role.includes('Guru') ? 'bg-blue-50 text-blue-600' :
                          teacher.role.includes('Tendik') ? 'bg-purple-50 text-purple-600' :
                          'bg-emerald-50 text-emerald-600'
                        }`}>
                          {teacher.role}
                        </span>
                      </td>
                      <td className="py-4 px-2 text-right">
                        <div className="flex justify-end gap-2">
                          <button className="p-2 text-gray-400 hover:text-blue-600 transition-all">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(teacher.id)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default TeachersPage;
