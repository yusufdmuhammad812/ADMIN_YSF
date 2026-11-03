import { useEffect, useState, useCallback, useRef } from 'react';
import { 
  Printer, 
  Search, 
  Download, 
  FileText, 
  Users, 
  Contact, 
  ChevronDown, 
  FileSpreadsheet, 
  QrCode, 
  CreditCard, 
  Check, 
  RefreshCw, 
  Archive,
  Sparkles,
  Layers
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import QRCode from 'qrcode';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import AdminLayout from '../components/AdminLayout';
import { getBaseUrl } from '../utils/api';

const PrintQRPage = () => {
  const [dataList, setDataList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('siswa'); // siswa, guru
  const [selectedClass, setSelectedClass] = useState('Semua Kelas');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(null);

  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const baseUrl = getBaseUrl();
      const endpoint = category === 'siswa' ? '/api/dashboard/students' : '/api/dashboard/teachers';
      const res = await fetch(`${baseUrl}${endpoint}`);
      const data = await res.json();
      setDataList(Array.isArray(data) ? data : []);
      setSelectedIds([]);
      setSelectedClass('Semua Kelas');
    } catch (err) {
      console.error("Gagal fetch data", err);
      setDataList([]);
    } finally {
      setIsLoading(false);
    }
  }, [category]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Extract unique classes
  const uniqueClasses = ['Semua Kelas', ...new Set(dataList.map(s => s.class).filter(Boolean))].sort();

  // Filtered dataset
  const filteredData = dataList.filter(item => {
    const matchesSearch = 
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (item.nisn && item.nisn.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.nip && item.nip.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesClass = 
      category !== 'siswa' || selectedClass === 'Semua Kelas' || item.class === selectedClass;

    return matchesSearch && matchesClass;
  });

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

  // Helper: Reliable file download via Blob (bypasses browser async blocking)
  const triggerBlobDownload = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 1000);
  };

  // Helper: Generate standalone high-res QR code PNG data URL in memory
  const getQrDataUrl = async (text) => {
    return await QRCode.toDataURL(String(text || ''), {
      width: 400,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
  };

  // Single QR PNG Download
  const downloadQrPng = async (item) => {
    try {
      const code = item.qr_code || item.nisn || item.nip || String(item.id);
      const dataUrl = await getQrDataUrl(code);
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const safeName = (item.name || 'Santri').replace(/[^a-zA-Z0-9]/g, '_');
      const prefix = item.class ? `${item.class}_` : '';
      triggerBlobDownload(blob, `QR_${category}_${prefix}${item.nisn || item.nip || item.id}_${safeName}.png`);
    } catch (err) {
      console.error("Gagal unduh QR PNG", err);
      alert("Gagal mengunduh gambar QR.");
    }
  };

  // Helper: Generate ID Card Canvas with pure in-memory QR image
  const generateCardCanvas = async (item, cat) => {
    const width = 600;
    const height = 900;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Card background
    const radius = 28;
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(width - radius, 0);
    ctx.quadraticCurveTo(width, 0, width, radius);
    ctx.lineTo(width, height - radius);
    ctx.quadraticCurveTo(width, height, width - radius, height);
    ctx.lineTo(radius, height);
    ctx.quadraticCurveTo(0, height, 0, height - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    // Card Border
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#2D4696';
    ctx.stroke();

    // Header Banner
    ctx.save();
    ctx.clip();
    const grad = ctx.createLinearGradient(0, 0, width, 180);
    grad.addColorStop(0, '#1E3A8A');
    grad.addColorStop(1, '#2D4696');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, 180);

    // Gold Accent Line
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(0, 174, width, 6);

    // Header Text
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.fillText('SMP PESANTREN HIDAYATUT THOLIBIN', width / 2, 55);

    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.fillStyle = '#FDE68A';
    ctx.fillText('KARTU PRESENSI ' + (cat === 'siswa' ? 'SANTRI' : 'GURU'), width / 2, 90);

    ctx.font = '13px Arial, sans-serif';
    ctx.fillStyle = '#E0E7FF';
    ctx.fillText('Sistem Presensi Digital & Notifikasi WhatsApp', width / 2, 120);
    ctx.restore();

    // QR Box
    const qrBoxX = 150;
    const qrBoxY = 220;
    const qrBoxSize = 300;
    ctx.fillStyle = '#F8FAFC';
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 16);
    } else {
      ctx.rect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize);
    }
    ctx.fill();
    ctx.stroke();

    // Load QR in memory and draw
    const code = item.qr_code || item.nisn || item.nip || String(item.id);
    const qrDataUrl = await getQrDataUrl(code);
    const img = new Image();
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
      img.src = qrDataUrl;
    });
    ctx.drawImage(img, qrBoxX + 25, qrBoxY + 25, qrBoxSize - 50, qrBoxSize - 50);

    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SCAN UNTUK PRESENSI', width / 2, 560);

    // Info Container
    const infoY = 590;
    const infoHeight = 220;
    ctx.fillStyle = '#F1F5F9';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(40, infoY, width - 80, infoHeight, 16);
    } else {
      ctx.rect(40, infoY, width - 80, infoHeight);
    }
    ctx.fill();

    // Name
    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.textAlign = 'center';
    let displayName = (item.name || '').toUpperCase();
    if (displayName.length > 28) {
      ctx.font = 'bold 19px Arial, sans-serif';
    }
    ctx.fillText(displayName, width / 2, infoY + 50);

    // Details
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.fillStyle = '#2563EB';
    const line1 = cat === 'siswa'
      ? `NISN: ${item.nisn || '-'}  •  KELAS: ${item.class || '-'}`
      : `NIP: ${item.nip || '-'}  •  ROLE: ${item.role || '-'}`;
    ctx.fillText(line1, width / 2, infoY + 95);

    if (item.parent_phone) {
      ctx.font = '14px Arial, sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText(`No. WA: ${item.parent_phone}`, width / 2, infoY + 135);
    }

    if (item.parent_name) {
      ctx.font = '13px Arial, sans-serif';
      ctx.fillStyle = '#64748B';
      ctx.fillText(`Wali: ${item.parent_name}`, width / 2, infoY + 168);
    }

    // Bottom Bar
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, height - 50, width, 50);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Kartu ini wajib dibawa setiap kegiatan presensi santri/guru', width / 2, height - 20);

    return canvas;
  };

  // Single ID Card PNG Download
  const downloadCardPng = async (item) => {
    try {
      const canvas = await generateCardCanvas(item, category);
      if (!canvas) return;
      canvas.toBlob((blob) => {
        if (!blob) return;
        const safeName = (item.name || 'Santri').replace(/[^a-zA-Z0-9]/g, '_');
        const prefix = item.class ? `${item.class}_` : '';
        triggerBlobDownload(blob, `Kartu_${category}_${prefix}${item.nisn || item.nip || item.id}_${safeName}.png`);
      }, 'image/png');
    } catch (err) {
      console.error("Gagal unduh kartu PNG", err);
      alert("Gagal mengunduh kartu digital.");
    }
  };

  // BULK QR CODE DOWNLOAD (ZIP)
  const downloadBulkQrZip = async (items, isAll = false) => {
    if (!items || items.length === 0) {
      alert("Tidak ada data untuk diunduh.");
      return;
    }

    try {
      setIsExporting(true);
      setExportProgress({ current: 0, total: items.length, message: 'Menyiapkan file ZIP kode QR...' });

      const zip = new JSZip();
      const folderName = `Barcode_QR_${category.toUpperCase()}_${items.length}_DATA`;
      const folder = zip.folder(folderName);

      // Manifest text file
      let textManifest = `=================================================\r\n`;
      textManifest += `SMP PESANTREN HIDAYATUT THOLIBIN\r\n`;
      textManifest += `DAFTAR KODE QR / BARCODE PRESENSI ${category.toUpperCase()}\r\n`;
      textManifest += `Tanggal Ekspor : ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')}\r\n`;
      textManifest += `Total Data     : ${items.length} ${category === 'siswa' ? 'Santri' : 'Guru'}\r\n`;
      textManifest += `=================================================\r\n\r\n`;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        setExportProgress({ 
          current: i + 1, 
          total: items.length, 
          message: `Memproses QR (${i + 1}/${items.length}): ${item.name}` 
        });

        const code = item.qr_code || item.nisn || item.nip || String(item.id);
        const dataUrl = await getQrDataUrl(code);
        const base64Data = dataUrl.split(',')[1];
        
        const prefix = item.class ? `${item.class}_` : '';
        const safeName = (item.name || '').replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `QR_${prefix}${item.nisn || item.nip || item.id}_${safeName}.png`;

        folder.file(filename, base64Data, { base64: true });

        textManifest += `${i + 1}. [${item.class || item.role || '-'}] ${item.name} | Kode: ${code} | File: ${filename}\r\n`;
      }

      folder.file(`DAFTAR_KODE_QR.txt`, textManifest);

      setExportProgress({ current: items.length, total: items.length, message: 'Mengompres file ZIP...' });
      const content = await zip.generateAsync({ type: 'blob' });
      
      const dateStr = new Date().toISOString().split('T')[0];
      const zipName = isAll
        ? `KESELURUHAN_QR_CODE_${category.toUpperCase()}_${items.length}_DATA_${dateStr}.zip`
        : `Kumpulan_QR_Code_${category.toUpperCase()}_${items.length}_DATA_${dateStr}.zip`;

      triggerBlobDownload(content, zipName);
    } catch (err) {
      console.error("Gagal unduh ZIP QR", err);
      alert("Terjadi kesalahan saat membuat file ZIP QR: " + err.message);
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  // BULK ID CARDS DOWNLOAD (ZIP)
  const downloadBulkCardsZip = async (items, isAll = false) => {
    if (!items || items.length === 0) {
      alert("Tidak ada data untuk diunduh.");
      return;
    }

    try {
      setIsExporting(true);
      setExportProgress({ current: 0, total: items.length, message: 'Menyiapkan kartu digital...' });

      const zip = new JSZip();
      const folderName = `Kartu_Presensi_${category.toUpperCase()}_${items.length}_DATA`;
      const folder = zip.folder(folderName);

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        setExportProgress({ 
          current: i + 1, 
          total: items.length, 
          message: `Menggambar kartu (${i + 1}/${items.length}): ${item.name}` 
        });

        const canvas = await generateCardCanvas(item, category);
        if (canvas) {
          const dataUrl = canvas.toDataURL('image/png');
          const base64Data = dataUrl.split(',')[1];
          const prefix = item.class ? `${item.class}_` : '';
          const safeName = (item.name || '').replace(/[^a-zA-Z0-9]/g, '_');
          const filename = `Kartu_${prefix}${item.nisn || item.nip || item.id}_${safeName}.png`;
          folder.file(filename, base64Data, { base64: true });
        }
      }

      setExportProgress({ current: items.length, total: items.length, message: 'Mengompres file ZIP kartu...' });
      const content = await zip.generateAsync({ type: 'blob' });
      
      const dateStr = new Date().toISOString().split('T')[0];
      const zipName = isAll
        ? `KESELURUHAN_Kartu_Presensi_${category.toUpperCase()}_${items.length}_DATA_${dateStr}.zip`
        : `Kumpulan_Kartu_Presensi_${category.toUpperCase()}_${items.length}_DATA_${dateStr}.zip`;

      triggerBlobDownload(content, zipName);
    } catch (err) {
      console.error("Gagal unduh ZIP Kartu", err);
      alert("Terjadi kesalahan saat membuat file ZIP kartu: " + err.message);
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  // EXCEL DOWNLOAD (.xlsx)
  const downloadExcel = (items, isAll = false) => {
    if (!items || items.length === 0) {
      alert("Tidak ada data untuk diunduh.");
      return;
    }

    const exportData = items.map((item, index) => {
      if (category === 'siswa') {
        return {
          'No': index + 1,
          'Nama Lengkap': item.name,
          'NISN': item.nisn,
          'Kelas': item.class,
          'Kode Barcode / QR': item.qr_code || item.nisn,
          'Nama Orang Tua / Wali': item.parent_name || '-',
          'No WhatsApp Ortu': item.parent_phone || '-'
        };
      } else {
        return {
          'No': index + 1,
          'Nama Lengkap': item.name,
          'NIP': item.nip,
          'Jabatan / Role': item.role,
          'Kode Barcode / QR': item.qr_code || item.nip,
          'No WhatsApp': item.parent_phone || '-'
        };
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 32 },
      { wch: 18 },
      { wch: 14 },
      { wch: 24 },
      { wch: 26 },
      { wch: 20 }
    ];

    const workbook = XLSX.utils.book_new();
    const sheetName = category === 'siswa' ? 'Data Santri' : 'Data Guru';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = isAll
      ? `KESELURUHAN_Data_Barcode_${category === 'siswa' ? 'Santri' : 'Guru'}_${items.length}_DATA_${dateStr}.xlsx`
      : `Data_Barcode_${category === 'siswa' ? 'Santri' : 'Guru'}_${items.length}_DATA_${dateStr}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  };

  // PDF / PRINT CARDS (Offline Safe using in-memory QR)
  const printCards = async (items) => {
    if (!items || items.length === 0) {
      alert("Silakan pilih minimal satu data.");
      return;
    }

    setIsExporting(true);
    setExportProgress({ current: 0, total: items.length, message: 'Menyiapkan lembar print...' });

    const itemsWithQr = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const code = item.qr_code || item.nisn || item.nip || String(item.id);
      const qrDataUrl = await getQrDataUrl(code);
      itemsWithQr.push({ ...item, qrDataUrl });
    }

    setIsExporting(false);
    setExportProgress(null);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Popup diblokir oleh browser. Harap izinkan popup agar kartu bisa dicetak.");
      return;
    }

    const cardsHtml = itemsWithQr.map(item => `
      <div class="qr-card">
        <div class="card-header">
          <div class="school-badge">HT</div>
          <div class="school-title">
            <h3>SMP PESANTREN HIDAYATUT THOLIBIN</h3>
            <p>KARTU PRESENSI ${category === 'siswa' ? 'SANTRI' : 'GURU'}</p>
          </div>
        </div>
        <div class="gold-line"></div>
        <div class="qr-container">
          <img src="${item.qrDataUrl}" alt="Barcode/QR" class="qr-img" />
          <span class="qr-tip">SCAN UNTUK PRESENSI</span>
        </div>
        <div class="card-body">
          <h4 class="name">${item.name}</h4>
          <div class="badge-info">
            ${category === 'siswa' 
              ? '<b>NISN:</b> ' + (item.nisn || '-') + ' &bull; <b>KELAS:</b> ' + (item.class || '-') 
              : '<b>NIP:</b> ' + (item.nip || '-') + ' &bull; <b>ROLE:</b> ' + (item.role || '-')}
          </div>
          ${item.parent_phone ? `<p class="phone">WA: ${item.parent_phone}</p>` : ''}
        </div>
        <div class="card-footer">
          Harap selalu membawa kartu ini saat presensi
        </div>
      </div>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Cetak Kartu Presensi - ${new Date().toLocaleDateString('id-ID')}</title>
          <style>
            * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f1f5f9; padding: 20px; margin: 0; }
            .print-actions { margin-bottom: 20px; text-align: center; }
            .btn-print { background: #2563eb; color: white; border: none; padding: 10px 24px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 14px; margin-right: 10px; }
            .btn-close { background: #64748b; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; }
            .print-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 16px;
              max-width: 800px;
              margin: 0 auto;
            }
            .qr-card {
              background: #ffffff;
              border: 2px solid #2D4696;
              border-radius: 12px;
              overflow: hidden;
              text-align: center;
              page-break-inside: avoid;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
              display: flex;
              flex-direction: column;
              position: relative;
            }
            .card-header {
              background: linear-gradient(135deg, #1E3A8A, #2D4696);
              color: white;
              padding: 12px 10px 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 10px;
            }
            .school-badge {
              background: #F59E0B;
              color: #1E3A8A;
              font-weight: 900;
              font-size: 13px;
              width: 30px;
              height: 30px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
              border: 2px solid white;
            }
            .school-title h3 { margin: 0; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; }
            .school-title p { margin: 2px 0 0; font-size: 9px; font-weight: 700; color: #FDE68A; }
            .gold-line { height: 3px; background: #F59E0B; }
            .qr-container {
              padding: 12px 10px 6px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
            .qr-img {
              width: 140px;
              height: 140px;
              display: block;
              border: 1px solid #E2E8F0;
              border-radius: 8px;
              padding: 4px;
              background: #fff;
            }
            .qr-tip {
              display: block;
              font-size: 8px;
              color: #64748b;
              font-weight: bold;
              letter-spacing: 1px;
              margin-top: 4px;
            }
            .card-body {
              padding: 4px 12px 10px;
              flex-grow: 1;
            }
            .name {
              margin: 4px 0 4px;
              color: #1E293B;
              font-size: 13px;
              font-weight: 800;
              text-transform: uppercase;
            }
            .badge-info {
              display: inline-block;
              background: #EFF6FF;
              color: #1E40AF;
              border-radius: 6px;
              padding: 3px 8px;
              font-size: 10px;
              margin-top: 2px;
            }
            .phone {
              margin: 4px 0 0;
              font-size: 9px;
              color: #64748B;
              font-weight: 600;
            }
            .card-footer {
              background: #0F172A;
              color: #94A3B8;
              font-size: 8px;
              padding: 4px;
              text-align: center;
            }
            @media print {
              body { background: white; padding: 0; margin: 0; }
              .print-actions { display: none; }
              .print-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 8mm;
                max-width: 100%;
                padding: 6mm;
              }
              .qr-card {
                border: 1.5px solid #2D4696;
                box-shadow: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-actions">
            <button class="btn-print" onclick="window.print()">🖨️ Cetak Sekarang / Simpan PDF</button>
            <button class="btn-close" onclick="window.close()">Tutup</button>
          </div>
          <div class="print-grid">
            ${cardsHtml}
          </div>
          <script>
            setTimeout(() => {
              window.print();
            }, 400);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Active items selected or filtered
  const activeSelectedItems = selectedIds.length > 0 
    ? dataList.filter(s => selectedIds.includes(s.id))
    : filteredData;

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-[#2B3674]">Cetak & Unduh Barcode</h1>
              <span className="px-2.5 py-1 text-xs font-semibold bg-blue-100 text-[#1B31BB] rounded-full">
                QR & Barcode
              </span>
            </div>
            <p className="text-gray-400 text-sm mt-1">
              Unduh dan cetak seluruh kode QR atau kartu presensi santri & guru (ZIP, PNG, PDF, Excel)
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 relative">
            {/* Direct Quick Button: Download KESELURUHAN QR Code (ZIP) */}
            <button 
              onClick={() => downloadBulkQrZip(dataList, true)}
              disabled={isExporting || dataList.length === 0}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-900/20 cursor-pointer disabled:opacity-50"
              title={`Unduh SEMUA (${dataList.length}) gambar kode QR dalam satu file ZIP`}
            >
              <Archive className="w-4 h-4" />
              <span>Download Semua QR ({dataList.length})</span>
            </button>

            {/* Quick Print Button */}
            <button 
              onClick={() => printCards(activeSelectedItems)}
              disabled={isExporting || activeSelectedItems.length === 0}
              className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:text-blue-600 hover:border-blue-300 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
              title="Cetak kartu langsung atau simpan sebagai file PDF"
            >
              <Printer className="w-4 h-4 text-blue-600" />
              <span>Cetak ({selectedIds.length > 0 ? selectedIds.length : `${activeSelectedItems.length}`})</span>
            </button>

            {/* Comprehensive Menu Download Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsDropdownOpen(prev => !prev)}
                disabled={isExporting}
                className="flex items-center gap-2.5 bg-gradient-to-r from-[#1B31BB] to-[#2D4696] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-blue-900/20 hover:from-blue-700 hover:to-blue-900 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Menu Download</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Options */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-88 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* SECTION 1: KESELURUHAN (ALL DATA) */}
                  <div className="px-3 py-2 bg-emerald-50/70 rounded-xl mb-2 border border-emerald-100/80">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> KESELURUHAN DATA ({dataList.length} DATA)
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-200/60 text-emerald-900 rounded">
                        Semua {category === 'siswa' ? 'Santri' : 'Guru'}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-700 mt-1 font-medium">
                      Unduh seluruh data tanpa perlu memilih satu per satu
                    </p>
                  </div>

                  <div className="space-y-1">
                    {/* 1.1 Download KESELURUHAN QR Code ZIP */}
                    <button
                      onClick={() => { setIsDropdownOpen(false); downloadBulkQrZip(dataList, true); }}
                      className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-emerald-50 transition-all text-left group cursor-pointer"
                    >
                      <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg group-hover:scale-105 transition-transform">
                        <QrCode className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-gray-800 group-hover:text-emerald-700">
                            Download Keseluruhan QR Code (ZIP)
                          </p>
                          <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded-full">
                            Semua {dataList.length}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400">
                          Semua file gambar QR code santri/guru dalam 1 file ZIP
                        </p>
                      </div>
                    </button>

                    {/* 1.2 Download KESELURUHAN Kartu ID ZIP */}
                    <button
                      onClick={() => { setIsDropdownOpen(false); downloadBulkCardsZip(dataList, true); }}
                      className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-amber-50 transition-all text-left group cursor-pointer"
                    >
                      <div className="p-2 bg-amber-100 text-amber-700 rounded-lg group-hover:scale-105 transition-transform">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-800 group-hover:text-amber-700">
                          Download Keseluruhan Kartu Digital (ZIP)
                        </p>
                        <p className="text-[10px] text-gray-400">
                          Desain kartu presensi lengkap seluruh {dataList.length} santri/guru
                        </p>
                      </div>
                    </button>

                    {/* 1.3 Download KESELURUHAN Excel */}
                    <button
                      onClick={() => { setIsDropdownOpen(false); downloadExcel(dataList, true); }}
                      className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-blue-50 transition-all text-left group cursor-pointer"
                    >
                      <div className="p-2 bg-blue-100 text-blue-700 rounded-lg group-hover:scale-105 transition-transform">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-800 group-hover:text-blue-700">
                          Download Excel Keseluruhan Data (.xlsx)
                        </p>
                        <p className="text-[10px] text-gray-400">
                          Rekap semua daftar santri & string kode barcode
                        </p>
                      </div>
                    </button>

                    {/* 1.4 Cetak KESELURUHAN PDF */}
                    <button
                      onClick={() => { setIsDropdownOpen(false); printCards(dataList); }}
                      className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-red-50 transition-all text-left group cursor-pointer border-b border-gray-100 pb-2 mb-1"
                    >
                      <div className="p-2 bg-red-100 text-red-700 rounded-lg group-hover:scale-105 transition-transform">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-800 group-hover:text-red-700">
                          Cetak Keseluruhan Kartu Presensi (PDF)
                        </p>
                        <p className="text-[10px] text-gray-400">
                          Buka lembar cetak A4 seluruh {dataList.length} data
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* SECTION 2: DATA TERPILIH / FILTER */}
                  <div className="px-3 py-1.5 mt-2 mb-1 flex items-center justify-between">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      DATA TERPILIH / FILTER ({selectedIds.length > 0 ? `${selectedIds.length} Terpilih` : `${filteredData.length} Tampil`})
                    </p>
                  </div>

                  <div className="space-y-1">
                    <button
                      onClick={() => { setIsDropdownOpen(false); downloadBulkQrZip(activeSelectedItems, false); }}
                      className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-gray-100 text-xs font-semibold text-gray-700 cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <QrCode className="w-3.5 h-3.5 text-[#1B31BB]" /> Download QR Terpilih
                      </span>
                      <span className="text-[10px] font-bold text-gray-400">{activeSelectedItems.length} file</span>
                    </button>

                    <button
                      onClick={() => { setIsDropdownOpen(false); downloadBulkCardsZip(activeSelectedItems, false); }}
                      className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-gray-100 text-xs font-semibold text-gray-700 cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <CreditCard className="w-3.5 h-3.5 text-amber-600" /> Download Kartu Terpilih
                      </span>
                      <span className="text-[10px] font-bold text-gray-400">{activeSelectedItems.length} file</span>
                    </button>

                    <button
                      onClick={() => { setIsDropdownOpen(false); printCards(activeSelectedItems); }}
                      className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-gray-100 text-xs font-semibold text-gray-700 cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Printer className="w-3.5 h-3.5 text-red-600" /> Cetak Kartu Terpilih
                      </span>
                      <span className="text-[10px] font-bold text-gray-400">{activeSelectedItems.length} data</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Card */}
        <div className="admin-card p-6 md:p-8">
          {/* Filters Bar */}
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-6">
            {/* Category Switcher */}
            <div className="flex gap-2 p-1.5 bg-[#F4F7FE] rounded-xl w-full sm:w-auto">
              <button 
                onClick={() => setCategory('siswa')}
                className={`flex-1 sm:flex-initial px-5 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${category === 'siswa' ? 'bg-white text-[#2B3674] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Users className="w-4 h-4" /> 
                <span>Siswa / Santri</span>
                {category === 'siswa' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-[#1B31BB]">
                    {dataList.length}
                  </span>
                )}
              </button>
              <button 
                onClick={() => setCategory('guru')}
                className={`flex-1 sm:flex-initial px-5 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${category === 'guru' ? 'bg-white text-[#2B3674] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Contact className="w-4 h-4" /> 
                <span>Guru / Staf</span>
                {category === 'guru' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-[#1B31BB]">
                    {dataList.length}
                  </span>
                )}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto flex-1 lg:max-w-xl justify-end">
              {/* Class Filter (only for siswa) */}
              {category === 'siswa' && uniqueClasses.length > 1 && (
                <div className="w-full sm:w-44">
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full bg-[#F4F7FE] px-3.5 py-2.5 rounded-xl text-xs font-bold border-none text-[#2B3674] focus:ring-2 focus:ring-blue-500 cursor-pointer outline-none"
                  >
                    {uniqueClasses.map(cls => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Search Box */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder={`Cari ${category === 'siswa' ? 'nama, NISN, atau kelas' : 'nama atau NIP'}...`} 
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F4F7FE] border-none rounded-xl text-xs focus:ring-2 focus:ring-blue-500 transition-all text-gray-700 outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Selection Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 py-3 px-4 bg-[#F8FAFC] rounded-xl border border-gray-100 mb-6">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <button 
                onClick={selectAll}
                className="font-bold text-[#1B31BB] hover:underline cursor-pointer flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" /> Pilih Semua Yang Tampil ({filteredData.length})
              </button>
              {selectedIds.length > 0 && (
                <>
                  <span className="text-gray-300">|</span>
                  <button 
                    onClick={deselectAll}
                    className="font-bold text-red-500 hover:underline cursor-pointer"
                  >
                    Batalkan Pilihan
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-gray-500">
                Terpilih: <span className="font-bold text-[#1B31BB]">{selectedIds.length}</span> dari {filteredData.length} data tampil (Total: {dataList.length})
              </p>
            </div>
          </div>

          {/* Grid of Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {isLoading ? (
               <div className="col-span-full py-20 text-center text-gray-400">
                 <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                 <p className="text-xs font-bold">Memuat data barcode...</p>
               </div>
            ) : filteredData.length === 0 ? (
               <div className="col-span-full py-20 text-center text-gray-400 font-bold uppercase text-xs">
                 Data tidak ditemukan
               </div>
            ) : (
              filteredData.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                return (
                  <div 
                    key={item.id}
                    className={`bg-white rounded-2xl p-5 border-2 transition-all relative flex flex-col justify-between ${
                      isSelected 
                        ? 'border-[#2D4696] bg-blue-50/15 shadow-md ring-2 ring-blue-500/20' 
                        : 'border-gray-100 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    {/* Top Row: Info & Checkbox */}
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 pr-2">
                          <h4 className="font-bold text-[#2B3674] text-sm leading-snug line-clamp-1" title={item.name}>
                            {item.name}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-[#1B31BB]">
                              {category === 'siswa' ? `NISN: ${item.nisn}` : `NIP: ${item.nip || '-'}`}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                              {category === 'siswa' ? item.class : item.role}
                            </span>
                          </div>
                        </div>

                        {/* Select Toggle */}
                        <button
                          type="button"
                          onClick={() => toggleSelect(item.id)}
                          className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#2D4696] border-[#2D4696] text-white shadow-sm'
                              : 'border-gray-300 hover:border-blue-400 bg-white text-transparent'
                          }`}
                          title={isSelected ? 'Batalkan pilihan' : 'Pilih data ini'}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </button>
                      </div>

                      {/* Barcode/QR Display Box */}
                      <div className="bg-[#F8FAFC] p-4 rounded-xl border border-gray-100 flex flex-col items-center justify-center relative mb-4">
                        <QRCodeCanvas
                          id={`qr-canvas-${item.id}`}
                          value={item.qr_code || item.nisn || item.nip || String(item.id)}
                          size={130}
                          level="H"
                          marginSize={1}
                        />
                        <span className="text-[10px] font-mono font-bold text-gray-400 mt-2 tracking-wider">
                          {item.qr_code || item.nisn || item.nip}
                        </span>
                      </div>
                    </div>

                    {/* Quick Single Download Actions */}
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-1.5">
                      <button
                        type="button"
                        onClick={() => downloadQrPng(item)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-[#F4F7FE] hover:bg-blue-100 text-[#1B31BB] rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                        title="Download gambar QR Code (.png)"
                      >
                        <Download className="w-3 h-3" />
                        <span>QR PNG</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadCardPng(item)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                        title="Download kartu digital lengkap (.png)"
                      >
                        <CreditCard className="w-3 h-3" />
                        <span>Kartu</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => printCards([item])}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                        title="Cetak kartu untuk santri ini"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Progress Modal */}
      {exportProgress && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-[#1B31BB] flex items-center justify-center mx-auto animate-spin">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-[#2B3674] text-base">Sedang Memproses Unduhan</h3>
              <p className="text-xs text-gray-500 mt-1">{exportProgress.message}</p>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-[#2D4696] h-full transition-all duration-200 rounded-full" 
                style={{ width: `${Math.round((exportProgress.current / exportProgress.total) * 100)}%` }}
              />
            </div>
            <p className="text-[11px] font-bold text-gray-400">
              {exportProgress.current} dari {exportProgress.total} file ({Math.round((exportProgress.current / exportProgress.total) * 100)}%)
            </p>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default PrintQRPage;
