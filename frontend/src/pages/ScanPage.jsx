import { useEffect, useState, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  Search,
  QrCode,
  Camera,
  CameraOff,
  SwitchCamera,
  Clock,
  Calendar,
  Sparkles,
  User,
  Flashlight,
  Play,
  X,
  ChevronRight,
  ShieldCheck,
  Radio
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

import { getBaseUrl } from '../utils/api';
import fallbackPersonnel from '../data/fallbackPersonnel.json';

// Audio feedback helper menggunakan Web Audio API murni
const playAttendanceSound = (alreadyScanned = false) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (alreadyScanned) {
      // Nada lembut untuk santri yang sudah absen
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(554.37, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else {
      // 3 nada ceria konfirmasi absensi berhasil seketika: C5 -> E5 -> G5
      const playTone = (freq, startTime, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.18, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      playTone(523.25, ctx.currentTime, 0.12);
      playTone(659.25, ctx.currentTime + 0.08, 0.12);
      playTone(783.99, ctx.currentTime + 0.16, 0.28);
    }
  } catch {
    // Abaikan jika browser membatasi audio tanpa gesture awal
  }
};

const ScanPage = () => {
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Hasil presensi terakhir yang tetap tersimpan dan tampil di layar
  const [lastAttendance, setLastAttendance] = useState(() => {
    try {
      const saved = localStorage.getItem('last_attendance_result');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Status & Kontrol Kamera
  const [cameraActive, setCameraActive] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState(() => localStorage.getItem('preferred_scanner_facing') || 'environment');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  // Countdown auto-close modal & input manual fallback
  const [countdown, setCountdown] = useState(5.0);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');

  // Refs untuk streaming kamera lancar tanpa restart
  const scannerRef = useRef(null);
  const isProcessingRef = useRef(false);
  const isModalOpenRef = useRef(false);
  const lastScannedCodeRef = useRef('');
  const lastScannedTimeRef = useRef(0);

  // Tutup modal hasil scan & LANGSUNG aktifkan kembali pendeteksian tanpa jeda restart kamera
  const handleCloseResult = useCallback(() => {
    setScanResult(null);
    isModalOpenRef.current = false;
    isProcessingRef.current = false;
    lastScannedCodeRef.current = ''; // Reset kode terakhir agar kartu yang sama bisa langsung dites lagi
  }, []);

  // Hitung mundur otomatis menutup hasil scan
  useEffect(() => {
    if (!scanResult) return;
    const duration = 5.0;
    setCountdown(duration);

    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = Math.max(0, duration - elapsed);
      setCountdown(Number(remaining.toFixed(1)));

      if (remaining <= 0) {
        clearInterval(timer);
        handleCloseResult();
      }
    }, 100);

    return () => clearInterval(timer);
  }, [scanResult, handleCloseResult]);

  // Shortcut Keyboard: Spasi, Enter, atau Escape langsung lanjut ke santri berikutnya
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (scanResult && (e.code === 'Space' || e.key === 'Enter' || e.key === 'Escape')) {
        e.preventDefault();
        handleCloseResult();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scanResult, handleCloseResult]);

  // Fungsi Inti Memproses Absensi (Online Backend + Otomatis Fallback jika di HP via GitHub Pages)
  const processAttendanceScan = useCallback(async (code) => {
    if (!code || !code.trim()) return;

    setIsProcessing(true);
    const trimmedCode = code.trim();

    // Waktu presisi lokal WIB (UTC+7)
    const dateObj = new Date();
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const seconds = String(dateObj.getSeconds()).padStart(2, '0');
    const milliseconds = String(dateObj.getMilliseconds()).padStart(3, '0');
    const hoursNum = parseInt(hours, 10);
    const minutesNum = parseInt(minutes, 10);

    // Batas waktu terlambat: 07:15:00 WIB
    const isLateCheck = hoursNum > 7 || (hoursNum === 7 && minutesNum > 15);
    const dateFull = dateObj.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    let attendanceData = null;
    let isAlreadyScanned = false;

    // 1. Coba hubungi server backend
    try {
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_code: trimmedCode }),
        signal: AbortSignal.timeout(3000)
      });

      if (response.ok) {
        const data = await response.json();
        const isTeacher = data.type === 'teacher';
        const person = isTeacher ? data.teacher : data.student;
        isAlreadyScanned = !!data.alreadyScanned;

        attendanceData = {
          name: person?.name || 'Santri',
          nisn: person?.nisn || person?.nip || trimmedCode,
          class: person?.class || person?.role || '-',
          isTeacher,
          alreadyScanned: isAlreadyScanned,
          isLate: data.isLate ?? isLateCheck,
          status: data.status || (isLateCheck ? 'TERLAMBAT' : 'TEPAT WAKTU'),
          hours,
          minutes,
          seconds,
          milliseconds,
          dateFull,
          fullTime: `${hours}:${minutes}:${seconds}.${milliseconds} WIB`
        };
      }
    } catch {
      // Backend tidak terjangkau / Mixed Content di GitHub Pages
      // Lanjut ke penanganan lokal mandiri di bawah
    }

    // 2. Jika backend offline / Mixed Content diakses dari HP via GitHub Pages, gunakan data santri fallback
    if (!attendanceData) {
      const cleanCode = trimmedCode.toLowerCase();
      const studentMatch = fallbackPersonnel.students.find(
        (s) => s.nisn.toLowerCase() === cleanCode || (s.qr_code && s.qr_code.toLowerCase() === cleanCode)
      );
      const teacherMatch = !studentMatch && fallbackPersonnel.teachers.find(
        (t) => t.nip.toLowerCase() === cleanCode || (t.qr_code && t.qr_code.toLowerCase() === cleanCode)
      );

      // Cek apakah sudah absen hari ini di memori lokal
      const todayKey = `absensi_harian_${dateObj.toISOString().slice(0, 10)}`;
      let dailyHistory = [];
      try {
        dailyHistory = JSON.parse(localStorage.getItem(todayKey) || '[]');
      } catch {
        dailyHistory = [];
      }

      isAlreadyScanned = dailyHistory.includes(trimmedCode);
      if (!isAlreadyScanned) {
        dailyHistory.push(trimmedCode);
        localStorage.setItem(todayKey, JSON.stringify(dailyHistory));
      }

      const person = studentMatch || teacherMatch || {
        name: `Santri / Tamu (${trimmedCode})`,
        nisn: trimmedCode,
        class: 'SMP-HT'
      };

      const isTeacher = !!teacherMatch;

      attendanceData = {
        name: person.name,
        nisn: person.nisn || person.nip || trimmedCode,
        class: person.class || person.role || '-',
        isTeacher,
        alreadyScanned: isAlreadyScanned,
        isLate: isLateCheck,
        status: isAlreadyScanned ? 'SUDAH ABSEN' : (isLateCheck ? 'TERLAMBAT' : 'TEPAT WAKTU'),
        hours,
        minutes,
        seconds,
        milliseconds,
        dateFull,
        fullTime: `${hours}:${minutes}:${seconds}.${milliseconds} WIB`
      };
    }

    // Bunyikan nada konfirmasi & tampilkan modal hasil presensi
    playAttendanceSound(attendanceData.alreadyScanned);
    isModalOpenRef.current = true;
    setScanResult(attendanceData);
    setLastAttendance(attendanceData);
    try {
      localStorage.setItem('last_attendance_result', JSON.stringify(attendanceData));
    } catch {}
    setIsProcessing(false);
    setManualCode('');
    setShowManualInput(false);
  }, []);

  const processAttendanceScanRef = useRef(processAttendanceScan);
  processAttendanceScanRef.current = processAttendanceScan;

  // Hentikan scanner hardware secara bersih
  const stopCurrentScanner = async () => {
    try {
      if (scannerRef.current && scannerRef.current.getState && scannerRef.current.getState() === 2) {
        await scannerRef.current.stop();
      }
    } catch (err) {
      console.warn("Stop scanner warning:", err);
    }
  };

  // Mulai / Nyalakan Kamera dengan Kecepatan Tinggi (25 FPS + Hardware Barcode Detector)
  const startScanner = useCallback(async (forcedFacing = null) => {
    const readerEl = document.getElementById("reader");
    if (!readerEl) return;

    setIsStartingCamera(true);
    setCameraError(null);

    await stopCurrentScanner();

    if (!scannerRef.current) {
      try {
        scannerRef.current = new Html5Qrcode("reader", {
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          },
          verbose: false
        });
      } catch (e) {
        console.error("Html5Qrcode init error:", e);
        setCameraError("Gagal memuat modul kamera scanner.");
        setIsStartingCamera(false);
        return;
      }
    }

    const html5QrCode = scannerRef.current;

    const qrSuccessCallback = (decodedText) => {
      if (!decodedText || isProcessingRef.current || isModalOpenRef.current) return;

      const now = Date.now();
      if (lastScannedCodeRef.current === decodedText && (now - lastScannedTimeRef.current < 2500)) {
        return;
      }

      lastScannedCodeRef.current = decodedText;
      lastScannedTimeRef.current = now;
      isProcessingRef.current = true;

      processAttendanceScanRef.current(decodedText);
    };

    const qrErrorCallback = () => {
      // Abaikan frame yang belum terdeteksi agar tidak lag
    };

    const scannerConfig = {
      fps: 25,
      qrbox: (w, h) => {
        const size = Math.floor(Math.min(w, h) * 0.72);
        return {
          width: Math.max(size, 200),
          height: Math.max(size, 200)
        };
      },
      aspectRatio: 1.0,
      videoConstraints: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        focusMode: "continuous"
      }
    };

    const targetFacing = forcedFacing || facingMode;
    const attempts = [
      { facingMode: targetFacing },
      { facingMode: targetFacing === 'environment' ? 'user' : 'environment' },
      {}
    ];

    let started = false;
    let lastErr = null;

    for (const constraint of attempts) {
      try {
        await html5QrCode.start(
          constraint,
          scannerConfig,
          qrSuccessCallback,
          qrErrorCallback
        );
        started = true;
        setCameraActive(true);
        setCameraError(null);

        try {
          const caps = html5QrCode.getRunningTrackCapabilities?.() || {};
          setHasTorch(!!caps.torch);
        } catch {
          setHasTorch(false);
        }
        break;
      } catch (err) {
        lastErr = err;
      }
    }

    if (!started) {
      console.warn("Semua percobaan kamera gagal:", lastErr);
      setCameraActive(false);
      setCameraError("Kamera belum aktif. Klik tombol Nyalakan Kamera atau izinkan akses kamera di browser HP Anda.");
    }
    setIsStartingCamera(false);
  }, [facingMode]);

  // Inisialisasi kamera saat pertama kali dimuat
  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) startScanner();
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      stopCurrentScanner();
    };
  }, [startScanner]);

  // Ganti Kamera Belakang / Depan
  const handleToggleFacingMode = async () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    localStorage.setItem('preferred_scanner_facing', nextFacing);
    await startScanner(nextFacing);
  };

  // Lampu Senter / Flashlight
  const handleToggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const nextTorch = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch }]
      });
      setTorchOn(nextTorch);
    } catch (err) {
      console.warn("Torch error:", err);
    }
  };

  // Input manual submit
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      processAttendanceScan(manualCode.trim());
    }
  };

  // Global listener barcode scanner USB fisik
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalBarcode = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;
      if (scanResult) return;

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 150) buffer = '';
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          processAttendanceScan(buffer);
          buffer = '';
        }
      } else if (e.key && e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalBarcode);
    return () => window.removeEventListener('keydown', handleGlobalBarcode);
  }, [scanResult, processAttendanceScan]);

  // URL Target untuk Scan Buka di HP (GitHub Pages link)
  const mobileLink = 'https://yusufdmuhammad812.github.io/ADMIN_YSF/';
  const qrDisplayUrl = typeof window !== 'undefined' && window.location.href.includes('github.io')
    ? window.location.href
    : mobileLink;

  const isMobileBrowser = typeof window !== 'undefined' &&
    (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1');

  return (
    <div className="min-h-screen islamic-pattern flex flex-col items-center justify-center p-4 relative overflow-hidden bg-[#F8F9FA]">
      {/* Background Decor Pesantren */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <img
          src={`${import.meta.env.BASE_URL}pesantren_hero.png`}
          alt="Decor"
          className="w-full h-full object-cover opacity-10 filter blur-[2px]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#F8F9FA]/40 via-transparent to-[#F8F9FA]"></div>
      </div>

      <div className="max-w-md w-full space-y-4 text-center relative z-10">
        {/* Header E-ABSENSI Sesuai Tampilan Awal */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="space-y-1 mb-2"
        >
          <div className="flex justify-center mb-2">
            <img
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt="Logo"
              className="w-24 h-24 sm:w-28 sm:h-28 object-contain mix-blend-multiply drop-shadow-sm"
            />
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-3xl font-black text-pesantren-primary tracking-tight flex items-center justify-center gap-2.5">
              <QrCode className="w-8 h-8 text-pesantren-gold" />
              E-ABSENSI
            </h1>
            {isMobileBrowser && (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 text-emerald-600 animate-pulse" />
                HP
              </span>
            )}
          </div>
          <p className="text-pesantren-emerald font-bold text-xs tracking-[0.2em] uppercase">
            SMP Pesantren Hidayatut Tholibin
          </p>
          <div className="h-1 w-12 bg-pesantren-gold mx-auto rounded-full mt-2"></div>
        </motion.div>

        {/* Scanner Card Bersih & Presisi */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="glass-card overflow-hidden shadow-2xl w-full"
        >
          {/* Header Bar Scanner */}
          <div className="p-3.5 text-center border-b border-gray-100 bg-white/70 flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-pesantren-emerald" />
              <h2 className="font-bold text-gray-700 text-xs sm:text-sm">
                Arahkan QR Code Kartu ke Kamera
              </h2>
            </div>

            <div className="flex items-center gap-1.5">
              {hasTorch && (
                <button
                  type="button"
                  onClick={handleToggleTorch}
                  title="Lampu Senter"
                  className={`p-1.5 rounded-full border shadow-2xs transition-colors cursor-pointer ${
                    torchOn ? 'bg-amber-400 text-gray-900 border-amber-500' : 'bg-white text-gray-500 border-gray-200'
                  }`}
                >
                  <Flashlight className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={handleToggleFacingMode}
                title="Ganti Kamera Depan / Belakang"
                className="p-1.5 rounded-full bg-white border border-gray-200 text-gray-600 hover:text-pesantren-primary transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold shadow-2xs"
              >
                <SwitchCamera className="w-3.5 h-3.5 text-pesantren-primary" />
                <span className="hidden sm:inline text-[10px]">
                  {facingMode === 'environment' ? 'Belakang' : 'Depan'}
                </span>
              </button>
            </div>
          </div>

          {/* Viewfinder Kamera */}
          <div className="p-3 sm:p-4 bg-white/30">
            <div className="relative aspect-square max-w-[340px] mx-auto rounded-2xl overflow-hidden bg-black shadow-inner">
              <div id="reader" className="w-full h-full"></div>

              {/* Laser Animasi & Sudut Frame */}
              {cameraActive && !scanResult && (
                <div className="absolute inset-0 pointer-events-none flex justify-center z-10">
                  <motion.div
                    animate={{ top: ["8%", "90%"] }}
                    transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                    className="absolute left-6 right-6 h-[2px] bg-emerald-400 rounded-full shadow-[0_0_8px_#10B981,0_0_16px_#10B981]"
                  />
                  <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-xl shadow-xs"></div>
                  <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-xl shadow-xs"></div>
                  <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-xl shadow-xs"></div>
                  <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-xl shadow-xs"></div>
                </div>
              )}

              {/* Status Menyiapkan Kamera */}
              {isStartingCamera && (
                <div className="absolute inset-0 flex flex-col justify-center items-center text-white bg-black/70 backdrop-blur-xs rounded-2xl p-4 text-center z-20">
                  <div className="animate-spin w-8 h-8 border-4 border-white/20 border-t-emerald-400 rounded-full mb-2"></div>
                  <p className="text-[11px] font-bold uppercase tracking-wider">Menyiapkan Kamera...</p>
                  <p className="text-[10px] text-gray-300 mt-1">Mengaktifkan sensor QR Code berkecepatan tinggi</p>
                </div>
              )}

              {/* Status Kamera Belum Aktif */}
              {!cameraActive && !isStartingCamera && (
                <div className="absolute inset-0 flex flex-col justify-center items-center text-white bg-black/60 backdrop-blur-xs rounded-2xl p-6 text-center z-20 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-amber-400 mb-1 border border-white/10">
                    <CameraOff className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-white">Kamera Belum Aktif</p>
                  <p className="text-[10px] text-gray-300 max-w-[220px]">
                    {cameraError || 'Klik tombol di bawah untuk menyalakan kamera scanner'}
                  </p>
                  <button
                    type="button"
                    onClick={() => startScanner()}
                    className="mt-1 px-4 py-2 rounded-full bg-pesantren-primary hover:bg-[#0c7853] text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Nyalakan Kamera</span>
                  </button>
                </div>
              )}
            </div>

            {/* Opsi Input Manual Halus (Accordion tanpa memenuhi layar) */}
            <div className="mt-2 text-center">
              <button
                type="button"
                onClick={() => setShowManualInput(!showManualInput)}
                className="text-[11px] text-gray-500 hover:text-pesantren-primary font-medium underline cursor-pointer"
              >
                {showManualInput ? 'Tutup Input Manual' : 'Kamera bermasalah? Masukkan NISN secara manual'}
              </button>

              {showManualInput && (
                <div className="mt-2 space-y-2 max-w-[340px] mx-auto">
                  <form onSubmit={handleManualSubmit} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ketik NISN (contoh: 00943523)..."
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      className="flex-1 text-xs px-3 py-1.5 bg-white border border-gray-300 rounded-xl focus:outline-none focus:border-pesantren-primary font-medium"
                    />
                    <button
                      type="submit"
                      disabled={!manualCode.trim() || isProcessing}
                      className="px-3.5 py-1.5 bg-pesantren-primary text-white rounded-xl text-xs font-bold hover:bg-[#0c7853] disabled:opacity-50 cursor-pointer"
                    >
                      Absen
                    </button>
                  </form>
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-[10px] text-gray-400 font-medium">Uji Coba:</span>
                    <button
                      type="button"
                      onClick={() => processAttendanceScan('00943523')}
                      className="text-[10px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded font-mono font-bold cursor-pointer transition-colors"
                    >
                      Kelvin (00943523)
                    </button>
                    <button
                      type="button"
                      onClick={() => processAttendanceScan('0088884410')}
                      className="text-[10px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded font-mono font-bold cursor-pointer transition-colors"
                    >
                      Selvia (0088884410)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Error Message Overlay */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col justify-center items-center text-center text-red-500 bg-white/95 backdrop-blur-sm p-6 rounded-2xl z-20"
              >
                <XCircle className="w-12 h-12 mb-2 text-red-500" />
                <p className="text-sm font-bold text-gray-800">{error}</p>
                <button
                  onClick={() => { setError(null); }}
                  className="mt-3 text-xs font-bold text-pesantren-primary underline cursor-pointer"
                >
                  Tutup
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Kartu Hasil Absensi Terakhir (Tetap muncul di layar agar siswa & guru bisa melihat hasilnya) */}
        {lastAttendance && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-white rounded-2xl shadow-md border border-emerald-100 p-3.5 text-left space-y-2 relative overflow-hidden"
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">
                  Hasil Presensi Terakhir:
                </span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                lastAttendance.alreadyScanned
                  ? 'bg-amber-100 text-amber-800'
                  : lastAttendance.isLate
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-emerald-100 text-emerald-800'
              }`}>
                {lastAttendance.alreadyScanned
                  ? 'Sudah Absen Hari Ini'
                  : lastAttendance.isLate
                    ? 'Terlambat (> 07:15)'
                    : 'Hadir Tepat Waktu'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <h4 className="text-sm sm:text-base font-extrabold text-gray-800 leading-tight truncate">
                  {lastAttendance.name}
                </h4>
                <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                  {lastAttendance.isTeacher ? lastAttendance.class : `Kelas ${lastAttendance.class}`} • NISN: <span className="font-mono font-bold text-gray-700">{lastAttendance.nisn}</span>
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-sm font-black font-mono text-pesantren-primary block">
                  {lastAttendance.hours}:{lastAttendance.minutes}:{lastAttendance.seconds}
                </span>
                <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">
                  WIB (UTC+7)
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Modal Hasil Absensi Sesuai Tampilan Asli + Waktu Digital Detail */}
        <AnimatePresence>
          {scanResult && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pesantren-primary/40 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.85, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.85, y: 15 }}
                className="bg-white rounded-[2rem] shadow-2xl p-6 sm:p-7 max-w-sm w-full text-center relative overflow-hidden border border-gray-100"
              >
                {/* Progress bar countdown auto-close */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gray-100">
                  <motion.div
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: 3.0, ease: "linear" }}
                    className={`h-full ${scanResult.alreadyScanned ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  />
                </div>

                {/* Tombol silang tutup */}
                <button
                  onClick={handleCloseResult}
                  className="absolute top-3 right-3 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Ikon Status */}
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${
                  scanResult.alreadyScanned
                    ? 'bg-amber-100 text-amber-600'
                    : 'bg-emerald-100 text-emerald-600'
                }`}>
                  {scanResult.alreadyScanned ? (
                    <Clock className="w-8 h-8" />
                  ) : (
                    <CheckCircle2 className="w-8 h-8" />
                  )}
                </div>

                {/* Judul & Status Badge */}
                <h3 className="text-xl sm:text-2xl font-black text-gray-800 mb-1">
                  {scanResult.alreadyScanned ? 'Data Absensi Ditemukan' : 'Berhasil Hadir!'}
                </h3>

                <div className="mb-4">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    scanResult.alreadyScanned
                      ? 'bg-amber-100 text-amber-800'
                      : scanResult.isLate
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    <Sparkles className="w-3 h-3" />
                    {scanResult.alreadyScanned
                      ? 'SUDAH ABSEN HARI INI'
                      : scanResult.isLate
                        ? 'HADIR TERLAMBAT (LEWAT 07:15)'
                        : 'HADIR TEPAT WAKTU'}
                  </span>
                </div>

                {/* Waktu Presisi Digital: Jam : Menit : Detik . Milidetik */}
                <div className="bg-[#0e3b2e] rounded-xl p-3 text-white mb-4 border border-emerald-500/20 shadow-xs">
                  <div className="flex items-center justify-between text-[9px] font-bold text-emerald-300/80 mb-1.5 uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-400" />
                      Waktu Presisi
                    </span>
                    <span className="font-mono text-emerald-300">WIB (UTC+7)</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 text-center font-mono">
                    <div className="bg-black/40 rounded-lg py-1">
                      <span className="text-xl font-black text-white">{scanResult.hours}</span>
                      <span className="block text-[7px] text-emerald-300 font-sans uppercase">Jam</span>
                    </div>
                    <div className="bg-black/40 rounded-lg py-1">
                      <span className="text-xl font-black text-white">{scanResult.minutes}</span>
                      <span className="block text-[7px] text-emerald-300 font-sans uppercase">Mnt</span>
                    </div>
                    <div className="bg-black/40 rounded-lg py-1">
                      <span className="text-xl font-black text-emerald-300">{scanResult.seconds}</span>
                      <span className="block text-[7px] text-emerald-300 font-sans uppercase">Dtk</span>
                    </div>
                    <div className="bg-black/40 rounded-lg py-1 border border-amber-400/40">
                      <span className="text-xl font-black text-amber-300">{scanResult.milliseconds}</span>
                      <span className="block text-[7px] text-amber-300 font-sans uppercase">Ms</span>
                    </div>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] text-emerald-200">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-emerald-400" />
                      {scanResult.dateFull}
                    </span>
                    <span className="font-mono text-[9px] font-bold bg-white/10 px-1.5 py-0.5 rounded">
                      {scanResult.hours}:{scanResult.minutes}:{scanResult.seconds}
                    </span>
                  </div>
                </div>

                {/* Detail Santri Sesuai Layout Awal */}
                <div className="bg-pesantren-light rounded-2xl p-4 space-y-3 text-left border border-pesantren-emerald/10 mb-4">
                  <div className="flex items-center gap-2.5 pb-2 border-b border-gray-200/50">
                    <div className="w-8 h-8 rounded-lg bg-pesantren-primary/10 text-pesantren-primary flex items-center justify-center font-bold text-xs shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                        {scanResult.isTeacher ? 'Nama Guru / Tendik' : 'Nama Santri'}
                      </p>
                      <p className="text-base font-extrabold text-gray-800 leading-tight truncate">
                        {scanResult.name}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                        {scanResult.isTeacher ? 'Jabatan' : 'Kelas'}
                      </p>
                      <p className="font-bold text-gray-700 mt-0.5">{scanResult.class}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                        {scanResult.isTeacher ? 'NIP' : 'NISN'}
                      </p>
                      <p className="font-bold text-gray-700 font-mono mt-0.5">{scanResult.nisn}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-200/50 flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-1 text-emerald-700 font-bold">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Status Terverifikasi
                    </span>
                    <span className="text-gray-400 font-mono">
                      #{scanResult.milliseconds}
                    </span>
                  </div>
                </div>

                {/* Tombol Lanjut Scan Santri Berikutnya */}
                <button
                  onClick={handleCloseResult}
                  className="w-full py-2.5 px-4 rounded-xl bg-pesantren-primary hover:bg-[#0c7853] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Scan Santri Berikutnya ({countdown}s)</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Sesuai Tampilan Asli */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="pt-2 flex flex-col items-center gap-4 w-full"
        >
          <Link
            to="/cek"
            className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-pesantren-primary/10 px-4 py-2 rounded-full text-pesantren-primary hover:text-pesantren-emerald text-xs font-bold transition-all shadow-xs"
          >
            <Search className="w-3.5 h-3.5" />
            Wali Murid? Cek Kehadiran Di Sini
          </Link>

          <div className="bg-white p-3.5 rounded-2xl shadow-lg border border-gray-100 flex flex-col items-center gap-2">
            <QRCodeSVG value={qrDisplayUrl} size={84} />
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
              Scan untuk Buka di HP
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ScanPage;
