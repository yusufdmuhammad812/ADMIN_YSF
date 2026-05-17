import { useEffect, useState, useCallback } from 'react';
import { 
  FileText, 
  Download, 
  Search,
  Calendar,
  Filter,
  ChevronDown
} from 'lucide-react';
import AdminLayout from '../components/AdminLayout';

const ReportsPage = () => {
  const [attendances, setAttendances] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reportType, setReportType] = useState('harian'); // harian, bulanan
  const [category, setCategory] = useState('siswa'); // siswa, guru
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('Semua Kelas');

  const loadData = useCallback(async () => {
    try {
      const baseUrl = `http://${window.location.hostname}:3001`;
      const res = await fetch(`${baseUrl}/api/dashboard/attendances`);
      const data = await res.json();
      setAttendances(data);
    } catch (err) {
      console.error("Gagal fetch data", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const uniqueClasses = ['Semua Kelas', ...new Set(attendances.map(a => a.class).filter(Boolean))].sort();

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-[#2B3674]">Rekap Laporan</h1>
            <p className="text-gray-400 text-sm mt-1">Lihat dan cetak laporan absensi berkala</p>
          </div>
          
          <div className="flex items-center gap-3 print:hidden">
             <select 
               value={selectedClass}
               onChange={(e) => setSelectedClass(e.target.value)}
               className="bg-white px-4 py-2.5 rounded-xl text-xs font-bold border border-gray-100 shadow-sm cursor-pointer hover:bg-gray-50 transition-all outline-none text-gray-600 appearance-none pr-8 relative"
               style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7em top 50%', backgroundSize: '.65em auto' }}
             >
               {uniqueClasses.map(cls => (
                 <option key={cls} value={cls}>{cls}</option>
               ))}
             </select>
            <button onClick={handleExportPDF} className="flex items-center gap-2 bg-emerald-500 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-emerald-900/20 hover:bg-emerald-600 transition-all">
              <Download className="w-4 h-4" /> Export PDF
            </button>
          </div>
        </div>

        {/* Filter Card */}
        <div className="admin-card p-8 print:hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Jenis Laporan */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">JENIS LAPORAN</p>
              <div className="flex gap-2 p-1.5 bg-[#F4F7FE] rounded-xl">
                <button 
                  onClick={() => setReportType('harian')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${reportType === 'harian' ? 'bg-white text-[#2B3674] shadow-sm' : 'text-gray-400'}`}
                >
                  Harian
                </button>
                <button 
                  onClick={() => setReportType('bulanan')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${reportType === 'bulanan' ? 'bg-white text-[#2B3674] shadow-sm' : 'text-gray-400'}`}
                >
                  Bulanan
                </button>
              </div>
            </div>

            {/* Kategori */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">KATEGORI</p>
              <div className="flex gap-2 p-1.5 bg-[#F4F7FE] rounded-xl">
                <button 
                  onClick={() => setCategory('siswa')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${category === 'siswa' ? 'bg-white text-[#2B3674] shadow-sm' : 'text-gray-400'}`}
                >
                  Siswa
                </button>
                <button 
                  onClick={() => setCategory('guru')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${category === 'guru' ? 'bg-white text-[#2B3674] shadow-sm' : 'text-gray-400'}`}
                >
                  Guru
                </button>
              </div>
            </div>

            {/* Pilih Tanggal */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">PILIH TANGGAL</p>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="date" 
                  className="w-full pl-12 pr-4 py-3 bg-[#F4F7FE] border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all font-medium text-[#2B3674]"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Table Preview Card */}
        <div className="admin-card p-8 print:shadow-none print:border-none print:p-0">
          <h3 className="text-lg font-bold text-[#2B3674] mb-8 print:text-black">
            Laporan Harian - {selectedClass} - {new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] text-gray-400 font-bold uppercase tracking-widest border-b border-gray-50">
                  <th className="pb-4 px-2">NO</th>
                  <th className="pb-4 px-2">NAMA</th>
                  <th className="pb-4 px-2 text-center">KELAS</th>
                  <th className="pb-4 px-2 text-center">JAM MASUK</th>
                  <th className="pb-4 px-2 text-center">JAM PULANG</th>
                  <th className="pb-4 px-2 text-right">KETERANGAN</th>
                </tr>
              </thead>
                <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  <tr><td colSpan="6" className="py-10 text-center text-gray-300">Loading...</td></tr>
                ) : (() => {
                  // Filter out duplicates (same student, same day)
                  const uniqueAttendances = [];
                  const seenStudents = new Set();
                  
                  // Sort by timestamp ascending to get the first scan
                  const sortedAttendances = [...attendances].sort((a, b) => 
                    new Date(a.timestamp) - new Date(b.timestamp)
                  );

                  sortedAttendances.forEach(item => {
                    const dateStr = new Date(item.timestamp).toISOString().split('T')[0];
                    const key = `${item.nisn}-${dateStr}`;
                    
                    const matchesClass = selectedClass === 'Semua Kelas' || item.class === selectedClass;
                    
                    if (dateStr === selectedDate && matchesClass && !seenStudents.has(key)) {
                      uniqueAttendances.push(item);
                      seenStudents.add(key);
                    }
                  });

                  if (uniqueAttendances.length === 0) {
                    return <tr><td colSpan="6" className="py-10 text-center text-gray-300 font-bold uppercase text-xs">Belum ada data</td></tr>;
                  }

                  return uniqueAttendances.map((item, index) => (
                    <tr key={item.id} className="group hover:bg-gray-50/50 transition-all">
                      <td className="py-4 px-2 text-xs font-bold text-gray-400">{index + 1}</td>
                      <td className="py-4 px-2">
                        <p className="text-sm font-bold text-[#2B3674]">{item.name}</p>
                      </td>
                      <td className="py-4 px-2 text-center">
                        <p className="text-sm font-medium text-gray-600">{item.class}</p>
                      </td>
                      <td className="py-4 px-2 text-center">
                        <p className="text-sm font-bold text-[#2B3674]">
                           {new Date(item.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':')}
                        </p>
                      </td>
                      <td className="py-4 px-2 text-center">
                        <p className="text-sm font-medium text-gray-300">-</p>
                      </td>
                      <td className="py-4 px-2 text-right">
                        <span className="px-3 py-1 bg-emerald-50 text-[9px] font-bold text-emerald-500 rounded-lg uppercase">
                          HADIR
                        </span>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ReportsPage;
