import { useEffect, useState, useCallback } from 'react';
import { 
  Printer, 
  Search, 
  Download, 
  FileText, 
  Image as ImageIcon,
  CheckCircle2
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import AdminLayout from '../components/AdminLayout';

const PrintQRPage = () => {
  const [dataList, setDataList] = useState([]); // Will store students or teachers
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('siswa'); // siswa, guru
  const [exportFormat, setExportFormat] = useState('pdf'); // pdf, png
  const [selectedIds, setSelectedIds] = useState([]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const baseUrl = `http://${window.location.hostname}:3001`;
      const endpoint = category === 'siswa' ? '/api/dashboard/students' : '/api/dashboard/teachers';
      const res = await fetch(`${baseUrl}${endpoint}`);
      const data = await res.json();
      setDataList(data);
      setSelectedIds([]); // Clear selection when category changes
    } catch (err) {
      console.error("Gagal fetch data", err);
    } finally {
      setIsLoading(false);
    }
  }, [category]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedIds(filteredData.map(s => s.id));
  };

  const deselectAll = () => {
    setSelectedIds([]);
  };

  const handleExport = () => {
    if (selectedIds.length === 0) {
      alert("Silakan pilih minimal satu data untuk diekspor.");
      return;
    }

    const selectedData = dataList.filter(s => selectedIds.includes(s.id));

    if (exportFormat === 'pdf') {
      const printWindow = window.open('', '_blank');
      const cardsHtml = selectedData.map(item => `
        <div class="qr-card">
          <div class="card-header">
            <h3>KARTU ABSENSI QR</h3>
            <p>SMP Pesantren Hidayatut Tholibin</p>
          </div>
          <div class="qr-container">
            <div id="qr-${item.id}"></div>
          </div>
          <div class="card-footer">
            <h4>${item.name}</h4>
            <p>${category === 'siswa' ? 'NISN: ' + item.nisn + ' | KELAS: ' + item.class : 'NIP: ' + item.nip + ' | ROLE: ' + item.role}</p>
          </div>
        </div>
      `).join('');

      printWindow.document.write(`
        <html>
          <head>
            <title>Export Kartu QR - ${new Date().toLocaleDateString()}</title>
            <style>
              body { font-family: 'Poppins', sans-serif; background: #f0f2f5; padding: 20px; }
              .print-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
              .qr-card { 
                background: white; border: 2px solid #2D4696; border-radius: 15px; 
                padding: 20px; text-align: center; width: 300px; margin: auto;
                page-break-inside: avoid;
              }
              .card-header h3 { margin: 0; color: #2D4696; font-size: 16px; }
              .card-header p { margin: 2px 0 15px; font-size: 10px; color: #666; font-weight: bold; }
              .qr-container { padding: 10px; background: white; display: inline-block; border: 1px dashed #ccc; border-radius: 10px; }
              .card-footer h4 { margin: 15px 0 2px; color: #333; font-size: 14px; text-transform: uppercase; }
              .card-footer p { margin: 0; font-size: 10px; color: #888; font-weight: bold; }
              @media print {
                body { background: white; padding: 0; }
                .print-grid { gap: 10mm; }
                .qr-card { border: 1px solid #eee; }
              }
            </style>
          </head>
          <body>
            <div class="print-grid">
              ${cardsHtml}
            </div>
            <script src="https://cdn.jsdelivr.net/npm/qrcode_js@1.0.0/qrcode.min.js"></script>
            <script>
              ${selectedData.map(s => `
                new QRCode(document.getElementById("qr-${s.id}"), {
                  text: "${s.qr_code}",
                  width: 150,
                  height: 150,
                  colorDark : "#000000",
                  colorLight : "#ffffff",
                  correctLevel : QRCode.CorrectLevel.H
                });
              `).join('')}
              setTimeout(() => {
                window.print();
                window.close();
              }, 1000);
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      // PNG Export logic - Download each selected as PNG
      alert("Fitur ekspor PNG akan mengunduh satu per satu kode QR terpilih.");
      selectedData.forEach((item, index) => {
        setTimeout(() => {
          const svg = document.querySelector(`[key="${item.id}"] svg`);
          if (svg) {
            const svgData = new XMLSerializer().serializeToString(svg);
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            const img = new Image();
            img.onload = () => {
              canvas.width = img.width;
              canvas.height = img.height;
              ctx.drawImage(img, 0, 0);
              const pngFile = canvas.toDataURL("image/png");
              const downloadLink = document.createElement("a");
              downloadLink.download = `QR_${item.name.replace(/\s+/g, '_')}.png`;
              downloadLink.href = pngFile;
              downloadLink.click();
            };
            img.src = "data:image/svg+xml;base64," + btoa(svgData);
          }
        }, index * 500); // Stagger downloads to avoid browser blocks
      });
    }
  };

  const filteredData = dataList.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (item.nisn && item.nisn.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (item.nip && item.nip.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-[#2B3674]">Export Kartu QR</h1>
            <p className="text-gray-400 text-sm mt-1">Pilih data untuk diunduh sebagai file PDF siap cetak</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Format Toggle */}
            <div className="flex gap-2 p-1 bg-white rounded-xl border border-gray-100 shadow-sm">
               <button 
                onClick={() => setExportFormat('pdf')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold transition-all ${exportFormat === 'pdf' ? 'bg-[#F4F7FE] text-[#1B31BB]' : 'text-gray-400'}`}
               >
                 <FileText className="w-3 h-3" /> PDF
               </button>
               <button 
                onClick={() => setExportFormat('png')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold transition-all ${exportFormat === 'png' ? 'bg-[#F4F7FE] text-[#1B31BB]' : 'text-gray-400'}`}
               >
                 <ImageIcon className="w-3 h-3" /> PNG
               </button>
            </div>

            <button 
              onClick={handleExport}
              className="flex items-center gap-2 bg-[#2D4696] text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-800 transition-all"
            >
              <Download className="w-4 h-4" /> Export {exportFormat.toUpperCase()} ({selectedIds.length})
            </button>
          </div>
        </div>

        {/* Content Card */}
        <div className="admin-card p-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
            <div className="flex gap-2 p-1.5 bg-[#F4F7FE] rounded-xl w-64">
              <button 
                onClick={() => setCategory('siswa')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${category === 'siswa' ? 'bg-white text-[#2B3674] shadow-sm' : 'text-gray-400'}`}
              >
                <Users className="w-4 h-4" /> Siswa
              </button>
              <button 
                onClick={() => setCategory('guru')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${category === 'guru' ? 'bg-white text-[#2B3674] shadow-sm' : 'text-gray-400'}`}
              >
                <Contact className="w-4 h-4" /> Guru
              </button>
            </div>

            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder={`Cari ${category === 'siswa' ? 'siswa (nama/NIS/kelas)' : 'guru (nama/NIP/jabatan)'}...`} 
                className="w-full pl-12 pr-4 py-3 bg-[#F4F7FE] border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Selection Controls */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-4">
              <button 
                onClick={selectAll}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                Pilih Semua di Halaman Ini
              </button>
              <button 
                onClick={deselectAll}
                className="text-xs font-bold text-red-500 hover:underline"
              >
                Batalkan Semua {category === 'siswa' ? 'Siswa' : 'Guru'}
              </button>
            </div>
            <p className="text-xs font-bold text-gray-400">
              Terpilih <span className="text-[#1B31BB]">{selectedIds.length} item</span>
            </p>
          </div>

          {/* Grid of Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
               <div className="col-span-full py-20 text-center text-gray-300">Loading...</div>
            ) : filteredData.length === 0 ? (
               <div className="col-span-full py-20 text-center text-gray-300 font-bold uppercase text-xs">Data tidak ditemukan</div>
            ) : (
              filteredData.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => toggleSelect(item.id)}
                  className={`admin-card p-6 border-2 transition-all cursor-pointer relative group ${selectedIds.includes(item.id) ? 'border-blue-500 bg-blue-50/20' : 'border-transparent hover:border-gray-200'}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-[#2B3674]">{item.name}</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                        {category === 'siswa' ? `NIS: ${item.nisn} • ${item.class}` : `NIP: ${item.nip} • ${item.role}`}
                      </p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedIds.includes(item.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-200 group-hover:border-gray-300'}`}>
                      {selectedIds.includes(item.id) && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-center">
                    <QRCodeSVG value={item.qr_code} size={120} level="H" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

// Mock components to avoid missing imports in this scope
const Users = ({ className }) => <FileText className={className} />;
const Contact = ({ className }) => <FileText className={className} />;

export default PrintQRPage;
