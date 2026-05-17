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
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';

const TeachersPage = () => {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Add Teacher State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTeacher, setNewTeacher] = useState({
    name: '',
    nip: '',
    role: ''
  });

  // Edit Teacher State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTeacher, setEditTeacher] = useState(null);

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

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    try {
      const baseUrl = `http://${window.location.hostname}:3001`;
      const res = await fetch(`${baseUrl}/api/dashboard/teachers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTeacher),
      });
      const data = await res.json();
      if (data.success) {
        alert("Guru berhasil ditambahkan!");
        setIsAddModalOpen(false);
        setNewTeacher({ name: '', nip: '', role: '' });
        fetchTeachers();
      } else {
        alert(data.error || "Gagal menambah guru.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan sistem saat menyimpan data.");
    }
  };

  const openEditModal = (teacher) => {
    setEditTeacher({
      id: teacher.id,
      name: teacher.name,
      nip: teacher.nip,
      role: teacher.role
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateTeacher = async (e) => {
    e.preventDefault();
    try {
      const baseUrl = `http://${window.location.hostname}:3001`;
      const res = await fetch(`${baseUrl}/api/dashboard/teachers/${editTeacher.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editTeacher),
      });
      const data = await res.json();
      if (data.success) {
        setIsEditModalOpen(false);
        setEditTeacher(null);
        fetchTeachers();
      } else {
        alert(data.error || "Gagal mengupdate data.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan sistem saat update data.");
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Yakin ingin menghapus data ${name}?`)) return;
    try {
      const baseUrl = `http://${window.location.hostname}:3001`;
      const res = await fetch(`${baseUrl}/api/dashboard/teachers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchTeachers();
      } else {
        alert("Gagal menghapus data.");
      }
    } catch (error) {
      alert("Gagal menghapus data");
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      { name: 'Bpk. Ahmad Syafiq', nip: '198203001', role: 'Guru Mapel' },
      { name: 'Ibu Siti Khadijah', nip: '198504002', role: 'Wali Kelas' },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Guru");
    XLSX.writeFile(wb, "Template_Data_Guru.xlsx");
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

        // Send to backend
        const baseUrl = `http://${window.location.hostname}:3001`;
        const res = await fetch(`${baseUrl}/api/dashboard/teachers/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teachers: data }),
        });

        const result = await res.json();
        if (result.success) {
          alert(`Berhasil mengimport ${result.count} data guru baru!`);
          fetchTeachers();
        } else {
          alert(result.error || "Gagal mengimport data.");
        }
      } catch (error) {
        console.error(error);
        alert("Terjadi kesalahan saat memproses file Excel. Pastikan format sesuai template.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; // Reset input
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
            <button onClick={handleDownloadTemplate} className="flex items-center gap-2 bg-white text-gray-600 px-4 py-2.5 rounded-xl text-xs font-bold border border-gray-100 shadow-sm hover:bg-gray-50 transition-all">
              <Download className="w-4 h-4" /> Template
            </button>
            <label className="flex items-center gap-2 bg-white text-emerald-500 px-4 py-2.5 rounded-xl text-xs font-bold border border-gray-100 shadow-sm hover:bg-emerald-50 transition-all cursor-pointer">
              <Upload className="w-4 h-4" /> Upload Excel
              <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
            </label>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 bg-[#1B31BB] text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-800 transition-all"
            >
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
                          <button onClick={() => navigate('/admin/print-qr')} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Cetak QR">
                            <Printer className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEditModal(teacher)} className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Edit Data">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(teacher.id, teacher.name)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Hapus Data"
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

      {/* Modal Tambah Guru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-white/20">
            <div className="px-8 py-5 bg-[#1e293b] text-white flex justify-between items-center">
              <div>
                <h2 className="font-bold text-lg">Tambah Data Guru</h2>
                <p className="text-[10px] text-gray-300 font-medium">Input data guru secara manual</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-white/60 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">✕</button>
            </div>
            <form onSubmit={handleAddTeacher} className="p-8 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Nama Lengkap</label>
                <input required type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" value={newTeacher.name} onChange={e => setNewTeacher({...newTeacher, name: e.target.value})} placeholder="Misal: Bpk. Syafiq" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">NIP</label>
                  <input required type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" value={newTeacher.nip} onChange={e => setNewTeacher({...newTeacher, nip: e.target.value})} placeholder="Misal: 198203..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Jabatan</label>
                  <select required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" value={newTeacher.role} onChange={e => setNewTeacher({...newTeacher, role: e.target.value})}>
                    <option value="">Pilih Jabatan</option>
                    <option value="Guru Mapel">Guru Mapel</option>
                    <option value="Wali Kelas">Wali Kelas</option>
                    <option value="Tendik">Tendik</option>
                    <option value="Staff">Staff</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-6 mt-2 border-t border-gray-100">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 px-4 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all">Batal</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-[#1B31BB] text-white rounded-xl text-sm font-bold hover:bg-blue-800 shadow-lg shadow-blue-900/20 transition-all">Simpan Data</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Guru */}
      {isEditModalOpen && editTeacher && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-white/20">
            <div className="px-8 py-5 bg-[#1B31BB] text-white flex justify-between items-center">
              <div>
                <h2 className="font-bold text-lg">Edit Data Guru</h2>
                <p className="text-[10px] text-blue-200 font-medium">Perbarui informasi guru</p>
              </div>
              <button onClick={() => { setIsEditModalOpen(false); setEditTeacher(null); }} className="text-white/60 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">✕</button>
            </div>
            <form onSubmit={handleUpdateTeacher} className="p-8 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Nama Lengkap</label>
                <input required type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" value={editTeacher.name} onChange={e => setEditTeacher({...editTeacher, name: e.target.value})} placeholder="Misal: Bpk. Syafiq" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">NIP</label>
                  <input required type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" value={editTeacher.nip} onChange={e => setEditTeacher({...editTeacher, nip: e.target.value})} placeholder="Misal: 198203..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Jabatan</label>
                  <select required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" value={editTeacher.role} onChange={e => setEditTeacher({...editTeacher, role: e.target.value})}>
                    <option value="">Pilih Jabatan</option>
                    <option value="Guru Mapel">Guru Mapel</option>
                    <option value="Wali Kelas">Wali Kelas</option>
                    <option value="Tendik">Tendik</option>
                    <option value="Staff">Staff</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-6 mt-2 border-t border-gray-100">
                <button type="button" onClick={() => { setIsEditModalOpen(false); setEditTeacher(null); }} className="flex-1 px-4 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all">Batal</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all">Simpan Perubahan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default TeachersPage;
