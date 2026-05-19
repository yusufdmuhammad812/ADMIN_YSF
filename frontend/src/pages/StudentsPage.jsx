import { useEffect, useState, useCallback } from 'react';
import { 
  Users, 
  Download, 
  Upload, 
  Plus, 
  Search,
  MoreVertical,
  Trash2,
  Printer,
  Contact,
  Edit
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { getBaseUrl } from '../utils/api';

const StudentsPage = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Add Student State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: '',
    nisn: '',
    className: '',
    parentName: '',
    parentPhone: ''
  });

  // Edit Student State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editStudent, setEditStudent] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const baseUrl = getBaseUrl();
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

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      const baseUrl = getBaseUrl();
      const res = await fetch(`${baseUrl}/api/dashboard/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newStudent),
      });

      const data = await res.json();
      if (data.success) {
        alert("Siswa berhasil ditambahkan!");
        setIsAddModalOpen(false);
        setNewStudent({ name: '', nisn: '', className: '', parentName: '', parentPhone: '' });
        loadData(); // Refresh list
      } else {
        alert(data.error || "Gagal menambah siswa.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan sistem saat menyimpan data.");
    }
  };

  const handleDeleteStudent = async (id, name) => {
    if (!window.confirm(`Yakin ingin menghapus data ${name}? Semua riwayat absensinya juga akan ikut terhapus.`)) return;
    try {
      const baseUrl = getBaseUrl();
      const res = await fetch(`${baseUrl}/api/dashboard/students/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadData();
      } else {
        alert("Gagal menghapus siswa.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saat menghapus siswa.");
    }
  };

  const openEditModal = (student) => {
    setEditStudent({
      id: student.id,
      name: student.name,
      nisn: student.nisn,
      className: student.class,
      parentName: student.parent_name || '',
      parentPhone: student.parent_phone || ''
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    try {
      const baseUrl = getBaseUrl();
      const res = await fetch(`${baseUrl}/api/dashboard/students/${editStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editStudent.name,
          nisn: editStudent.nisn,
          class: editStudent.className,
          parent_name: editStudent.parentName,
          parent_phone: editStudent.parentPhone
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsEditModalOpen(false);
        setEditStudent(null);
        loadData();
      } else {
        alert(data.error || "Gagal mengupdate siswa.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan sistem saat update data.");
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          alert("File Excel kosong atau format tidak sesuai.");
          return;
        }

        const mappedStudents = data.map(item => {
          const name = item.name || item.Name || item.nama || item.Nama || '';
          const nisn = String(item.nisn || item.Nisn || item.NISN || item.nis || item.Nis || item.NIS || '');
          const className = String(item.class || item.Class || item.kelas || item.Kelas || item.className || '');
          const parentName = item.parentName || item.ParentName || item.nama_ortu || item.Nama_Ortu || item.wali || item.Wali || '';
          const parentPhone = String(item.parentPhone || item.ParentPhone || item.no_wa || item.No_Wa || item.No_WA || item.no_WA || item.parent_phone || '');
          
          return { name, nisn, className, parentName, parentPhone };
        });

        const validStudents = mappedStudents.filter(s => s.name && s.nisn);

        if (validStudents.length === 0) {
          alert("Tidak ada data siswa valid. Pastikan kolom Nama dan NISN terisi.");
          return;
        }

        const baseUrl = getBaseUrl();
        const res = await fetch(`${baseUrl}/api/dashboard/students/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ students: validStudents }),
        });

        const result = await res.json();
        if (result.success) {
          alert(`Berhasil mengimport ${result.count} data siswa baru!`);
          loadData();
        } else {
          alert(result.error || "Gagal mengimport data.");
        }
      } catch (error) {
        console.error(error);
        if (error.message.includes('fetch') || error.name === 'TypeError') {
          alert("Gagal terhubung ke server backend! Pastikan server backend lokal Anda sudah dinyalakan di port 3001.");
        } else {
          alert("Terjadi kesalahan saat memproses file Excel. Pastikan format sesuai template.");
        }
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

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
              <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
            </label>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 bg-[#1B31BB] text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-800 transition-all"
            >
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
                          <button onClick={() => navigate('/admin/print-qr')} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Cetak QR">
                            <Printer className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEditModal(student)} className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Edit Data">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteStudent(student.id, student.name)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Hapus Data">
                            <Trash2 className="w-4 h-4" />
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

      {/* Modal Tambah Siswa Manual */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-white/20">
            <div className="px-8 py-5 bg-[#1e293b] text-white flex justify-between items-center">
              <div>
                <h2 className="font-bold text-lg">Tambah Data Siswa</h2>
                <p className="text-[10px] text-gray-300 font-medium">Input data siswa secara manual</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-white/60 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
                ✕
              </button>
            </div>
            <form onSubmit={handleAddStudent} className="p-8 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Nama Lengkap Siswa</label>
                <input required type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} placeholder="Misal: Ahmad Syafiq" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">NIS / NISN</label>
                  <input required type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" value={newStudent.nisn} onChange={e => setNewStudent({...newStudent, nisn: e.target.value})} placeholder="Misal: 00928374" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Kelas</label>
                  <input required type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" value={newStudent.className} onChange={e => setNewStudent({...newStudent, className: e.target.value})} placeholder="Misal: 7A" />
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <p className="text-[11px] font-bold text-emerald-600 mb-4 uppercase tracking-widest flex items-center gap-2">
                  <Contact className="w-3 h-3" /> Data Orang Tua (Untuk Notifikasi WA)
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Nama Wali</label>
                    <input required type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" value={newStudent.parentName} onChange={e => setNewStudent({...newStudent, parentName: e.target.value})} placeholder="Misal: Bpk. Sugeng" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">No. WhatsApp</label>
                    <input required type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" value={newStudent.parentPhone} onChange={e => setNewStudent({...newStudent, parentPhone: e.target.value})} placeholder="Misal: 081234567890" />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 pt-6 mt-2">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 px-4 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all">Batal</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-[#1B31BB] text-white rounded-xl text-sm font-bold hover:bg-blue-800 shadow-lg shadow-blue-900/20 transition-all">Simpan Data Siswa</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Siswa Manual */}
      {isEditModalOpen && editStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-white/20">
            <div className="px-8 py-5 bg-[#1B31BB] text-white flex justify-between items-center">
              <div>
                <h2 className="font-bold text-lg">Edit Data Siswa</h2>
                <p className="text-[10px] text-blue-200 font-medium">Perbarui informasi siswa</p>
              </div>
              <button onClick={() => { setIsEditModalOpen(false); setEditStudent(null); }} className="text-white/60 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateStudent} className="p-8 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Nama Lengkap Siswa</label>
                <input required type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" value={editStudent.name} onChange={e => setEditStudent({...editStudent, name: e.target.value})} placeholder="Misal: Ahmad Syafiq" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">NIS / NISN</label>
                  <input required type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" value={editStudent.nisn} onChange={e => setEditStudent({...editStudent, nisn: e.target.value})} placeholder="Misal: 00928374" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Kelas</label>
                  <input required type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" value={editStudent.className} onChange={e => setEditStudent({...editStudent, className: e.target.value})} placeholder="Misal: 7A" />
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <p className="text-[11px] font-bold text-emerald-600 mb-4 uppercase tracking-widest flex items-center gap-2">
                  <Contact className="w-3 h-3" /> Data Orang Tua (Untuk Notifikasi WA)
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Nama Wali</label>
                    <input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" value={editStudent.parentName} onChange={e => setEditStudent({...editStudent, parentName: e.target.value})} placeholder="Misal: Bpk. Sugeng" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">No. WhatsApp</label>
                    <input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" value={editStudent.parentPhone} onChange={e => setEditStudent({...editStudent, parentPhone: e.target.value})} placeholder="Misal: 081234567890" />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 pt-6 mt-2">
                <button type="button" onClick={() => { setIsEditModalOpen(false); setEditStudent(null); }} className="flex-1 px-4 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all">Batal</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all">Simpan Perubahan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default StudentsPage;
