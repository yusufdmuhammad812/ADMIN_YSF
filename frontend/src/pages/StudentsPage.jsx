import { useEffect, useState, useCallback } from 'react';
import { 
  Users, 
  Download, 
  Upload, 
  Plus, 
  Search,
  MoreVertical,
  Trash2,
  Printer
} from 'lucide-react';
import * as XLSX from 'xlsx';
import AdminLayout from '../components/AdminLayout';

const StudentsPage = () => {
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    try {
      const baseUrl = `http://${window.location.hostname}:3001`;
      const res = await fetch(`${baseUrl}/api/dashboard/students`);
      const data = await res.json();
      setStudents(data);
    } catch (err) {
      console.error("Gagal fetch data", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.nisn.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.class.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-[#2B3674]">Data Siswa</h1>
            <p className="text-gray-400 text-sm mt-1">Kelola data master siswa dan generate QR Code</p>
          </div>
          
          <div className="flex items-center gap-3">
            <a 
              href="/Data_Santri_Import.xlsx" 
              download
              className="flex items-center gap-2 bg-white text-gray-600 px-4 py-2.5 rounded-xl text-xs font-bold border border-gray-100 shadow-sm hover:bg-gray-50 transition-all"
            >
              <Download className="w-4 h-4" /> Template
            </a>
            <label className="flex items-center gap-2 bg-white text-emerald-500 px-4 py-2.5 rounded-xl text-xs font-bold border border-gray-100 shadow-sm cursor-pointer hover:bg-emerald-50 transition-all">
              <Upload className="w-4 h-4" /> Upload Excel
              <input type="file" className="hidden" />
            </label>
            <button className="flex items-center gap-2 bg-[#1B31BB] text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-800 transition-all">
              <Plus className="w-4 h-4" /> Tambah Siswa
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
                placeholder="Cari nama, NIS, atau kelas..." 
                className="w-full pl-12 pr-4 py-3 bg-[#F4F7FE] border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              TOTAL: <span className="text-[#2B3674]">{filteredStudents.length} SISWA</span>
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] text-gray-400 font-bold uppercase tracking-widest border-b border-gray-50">
                  <th className="pb-4 px-2">NAMA / NIS</th>
                  <th className="pb-4 px-2">KELAS</th>
                  <th className="pb-4 px-2">GENDER</th>
                  <th className="pb-4 px-2 text-center">STATUS</th>
                  <th className="pb-4 px-2 text-right">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                   <tr><td colSpan="5" className="py-10 text-center text-gray-300">Loading...</td></tr>
                ) : filteredStudents.length === 0 ? (
                  <tr><td colSpan="5" className="py-10 text-center text-gray-300 font-bold uppercase text-xs">Data tidak ditemukan</td></tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr key={student.id} className="group hover:bg-gray-50/50 transition-all">
                      <td className="py-4 px-2">
                        <div>
                          <p className="text-sm font-bold text-[#2B3674]">{student.name}</p>
                          <p className="text-[10px] text-gray-400 font-bold">{student.nisn}</p>
                        </div>
                      </td>
                      <td className="py-4 px-2">
                        <p className="text-sm font-medium text-gray-600">{student.class}</p>
                      </td>
                      <td className="py-4 px-2">
                        <p className="text-sm font-medium text-gray-600">Laki-laki</p>
                      </td>
                      <td className="py-4 px-2 text-center">
                        <span className="px-3 py-1 bg-emerald-50 text-[10px] font-bold text-emerald-500 rounded-full uppercase">
                          AKTIF
                        </span>
                      </td>
                      <td className="py-4 px-2 text-right">
                        <div className="flex justify-end items-center gap-2">
                          <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                            <Printer className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default StudentsPage;
