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
  Hash,
  MessageCircle,
  ChevronRight,
  Keyboard,
  X,
  ShieldCheck,
  Send,
  Zap,
  Flashlight,
  RefreshCw,
  Play
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

import { getBaseUrl } from '../utils/api';

// Pilihan Mode Kecepatan Scan untuk Antrean Santri
const SPEED_MODES = [
  { id: 'rush', label: 'Kilat 1.5s', sec: 1.5, desc: 'Untuk antrean padat santri' },
  { id: 'fast', label: 'Cepat 3s', sec: 3.0, desc: 'Ideal & terbaca jelas' },
  { id: 'relaxed', label: 'Santai 6s', sec: 6.0, desc: 'Verifikasi mendalam' }
];

// Audio feedback helper menggunakan Web Audio API (Tanpa latensi & file eksternal)
const playAttendanceSound = (alreadyScanned = false) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (alreadyScanned) {
      // Dua nada pemberitahuan lembut untuk santri yang sudah absen hari ini
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
      playTone(523.25, ctx.currentTime, 0.15);
      playTone(659.25, ctx.currentTime + 0.08, 0.15);
      playTone(783.99, ctx.currentTime + 0.16, 0.3);
    }
  } catch {
    // Abaikan jika browser membatasi Web Audio tanpa gesture awal
  }
};

const ScanPage = () => {
  // Hasil presensi santri/guru
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Status & Pengaturan Kamera
  const [cameraActive, setCameraActive] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(() => localStorage.getItem('preferred_scanner_camera') || '');
  const [facingMode, setFacingMode] = useState(() => localStorage.getItem('preferred_scanner_facing') || 'environment');
  const [speedMode, setSpeedMode] = useState(() => localStorage.getItem('preferred_scanner_speed') || 'fast');

  // Fitur Hardware Kamera Tambahan
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [scanFlash, setScanFlash] = useState(false);
  const [showCameraMenu, setShowCameraMenu] = useState(false);

  // Countdown & Manual Input
  const [countdown, setCountdown] = useState(3.0);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');

  // Refs untuk menjaga streaming kamera tetap aktif tanpa restart
  const scannerRef = useRef(null);
  const isProcessingRef = useRef(false);
  const isModalOpenRef = useRef(false);
  const lastScannedCodeRef = useRef('');
  const lastScannedTimeRef = useRef(0);

  // Ambil durasi mode kecepatan saat ini
  const currentSpeed = SPEED_MODES.find(m => m.id === speedMode) || SPEED_MODES[1];

  // Helper cek apakah scanner sedang aktif
  const isScannerActive = () => {
    try {
      return scannerRef.current && typeof scannerRef.current.getState === 'function' && scannerRef.current.getState() === 2;
    } catch {
      return false;
    }
  };

  // Tutup modal hasil scan & LANGSUNG aktifkan kembali pendeteksian tanpa jeda restart kamera!
  const handleCloseResult = useCallback(() => {
    setScanResult(null);
    isModalOpenRef.current = false;
    isProcessingRef.current = false;
  }, []);

  // Countdown otomatis menutup hasil scan agar antrean berikutnya langsung jalan
  useEffect(() => {
    if (!scanResult) return;
    const duration = currentSpeed.sec;
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
  }, [scanResult, currentSpeed.sec, handleCloseResult]);

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

  // Fungsi Inti Memproses Absensi ke Server Backend
  const processAttendanceScan = useCallback(async (code) => {
    if (!code || !code.trim()) return;

    setIsProcessing(true);

    try {
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_code: code.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Gagal absen");
        playAttendanceSound(true);
        setTimeout(() => {
          setError(null);
          isProcessingRef.current = false;
          setIsProcessing(false);
        }, 2200);
        return;
      }

      // Waktu presisi sangat detail: Jam, Menit, Detik, Milidetik
      const rawTimestamp = data.attendance?.timestamp || new Date().toISOString();
      const dateObj = new Date(rawTimestamp);

      const hours = String(dateObj.getHours()).padStart(2, '0');
      const minutes = String(dateObj.getMinutes()).padStart(2, '0');
      const seconds = String(dateObj.getSeconds()).padStart(2, '0');
      const milliseconds = String(dateObj.getMilliseconds()).padStart(3, '0');

      const isTeacher = data.type === 'teacher';
      const person = isTeacher ? data.teacher : data.student;

      const dateFull = dateObj.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      // Bunyikan nada konfirmasi ceria seketika
      playAttendanceSound(data.alreadyScanned);

      // Buka modal hasil presensi
      isModalOpenRef.current = true;
      const hoursNum = parseInt(hours, 10);
      const minutesNum = parseInt(minutes, 10);
      const isLateCheck = data.isLate ?? (hoursNum > 7 || (hoursNum === 7 && minutesNum > 15));
      const statusValue = data.status || (isLateCheck ? 'TERLAMBAT' : 'TEPAT WAKTU');

      setScanResult({
        type: data.type || 'student',
        isTeacher,
        name: person?.name || 'Santri',
        nisn: person?.nisn || person?.nip || code.trim(),
        class: person?.class || person?.role || '-',
        alreadyScanned: !!data.alreadyScanned,
        status: statusValue,
        isLate: isLateCheck,
        attendanceId: data.attendance?.id || `ATT-${Date.now()}`,
        hours,
        minutes,
        seconds,
        milliseconds,
        fullTime: `${hours}:${minutes}:${seconds}.${milliseconds} WIB`,
        dateFull,
        timestamp: rawTimestamp,
      });

      setManualCode('');
      setShowManualInput(false);
    } catch (err) {
      console.error("Scan processing error:", err);
      setError("Gagal terhubung ke server");
      setTimeout(() => {
        setError(null);
        isProcessingRef.current = false;
        setIsProcessing(false);
      }, 2500);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const processAttendanceScanRef = useRef(processAttendanceScan);
  processAttendanceScanRef.current = processAttendanceScan;

  // Hentikan scanner hardware secara bersih jika diperlukan
  const stopCurrentScanner = async () => {
    try {
      if (scannerRef.current && isScannerActive()) {
        await scannerRef.current.stop();
      }
    } catch (err) {
      console.warn("Stop scanner error:", err);
    }
  };

  // Fungsi Mulai / Nyalakan Kamera dengan Optimalisasi Kecepatan Maksimal
  const startScanner = useCallback(async (forcedFacing = null, forcedCameraId = null) => {
    const readerEl = document.getElementById("reader");
    if (!readerEl) return;

    setIsStartingCamera(true);
    setCameraError(null);

    // Hentikan stream lama terlebih dahulu jika sedang aktif
    await stopCurrentScanner();

    // Buat instance Html5Qrcode dengan akselerasi hardware BarcodeDetector asli browser
    if (!scannerRef.current) {
      try {
        scannerRef.current = new Html5Qrcode("reader", {
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true // Deteksi hardware GPU kilat di Chrome / Android / Edge
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

    // Callback saat QR Code berhasil dibaca (Kamera TETAP MENYALA & STREAMING!)
    const qrSuccessCallback = (decodedText) => {
      // Jika modal sedang terbuka atau proses backend belum selesai, cegah scan dobel
      if (!decodedText || isProcessingRef.current || isModalOpenRef.current) return;

      const now = Date.now();
      // Cegah scan berulang untuk santri yang sama dalam 2.5 detik
      if (lastScannedCodeRef.current === decodedText && (now - lastScannedTimeRef.current < 2500)) {
        return;
      }

      lastScannedCodeRef.current = decodedText;
      lastScannedTimeRef.current = now;
      isProcessingRef.current = true;

      // Efek kilatan hijau visual pada viewfinder
      setScanFlash(true);
      setTimeout(() => setScanFlash(false), 350);

      // Proses absensi
      processAttendanceScanRef.current(decodedText);
    };

    const qrErrorCallback = () => {
      // Frame rutin non-matching diabaikan untuk menjaga performa 25 FPS
    };

    // Konfigurasi performa scan tinggi: 25 FPS, HD 720p, continuous autofocus
    const scannerConfig = {
      fps: 25,
      qrbox: (viewfinderWidth, viewfinderHeight) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        const size = Math.floor(minEdge * 0.74);
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
    const targetCameraId = forcedCameraId !== null ? forcedCameraId : selectedCameraId;

    // Urutan prioritas kamera agar PASTI berhasil menyala di segala perangkat (Laptop/HP/Tablet)
    const attempts = [];
    if (targetCameraId) {
      attempts.push({ deviceId: { exact: targetCameraId } });
    }
    if (targetFacing) {
      attempts.push({ facingMode: targetFacing });
      // Fallback ke arah kamera sebaliknya jika mode awal tidak didukung driver
      attempts.push({ facingMode: targetFacing === 'environment' ? 'user' : 'environment' });
    } else {
      attempts.push({ facingMode: 'environment' });
      attempts.push({ facingMode: 'user' });
    }
    // Fallback generik terakhir
    attempts.push({});

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

        // Deteksi fitur lampu senter / torch jika didukung HP
        try {
          const caps = html5QrCode.getRunningTrackCapabilities?.() || {};
          setHasTorch(!!caps.torch);
        } catch {
          setHasTorch(false);
        }
        break;
      } catch (err) {
        lastErr = err;
        console.warn("Camera start constraint attempt failed:", constraint, err);
      }
    }

    if (!started) {
      console.error("Semua percobaan kamera gagal:", lastErr);
      setCameraActive(false);
      setCameraError("Kamera belum aktif. Klik tombol 'Aktifkan Kamera' atau berikan izin kamera di browser.");
      setShowManualInput(true);
    }
    setIsStartingCamera(false);
  }, [facingMode, selectedCameraId]);

  // Deteksi daftar kamera hardware di perangkat saat awal load
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((deviceList) => {
        if (deviceList && deviceList.length > 0) {
          setCameras(deviceList);
        }
      })
      .catch((err) => {
        console.warn("Html5Qrcode.getCameras info:", err);
      });
  }, []);

  // Inisialisasi kamera satu kali saat halaman pertama dibuka
  useEffect(() => {
    let isMounted = true;

    const initTimer = setTimeout(() => {
      if (isMounted) {
        startScanner();
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(initTimer);
      stopCurrentScanner();
    };
  }, [startScanner]);

  // Ganti Kamera Depan / Belakang (Flip Camera)
  const handleToggleFacingMode = async () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    setSelectedCameraId('');
    localStorage.setItem('preferred_scanner_facing', nextFacing);
    localStorage.removeItem('preferred_scanner_camera');
    await startScanner(nextFacing, '');
  };

  // Pilih Kamera Spesifik (jika ada webcam USB atau banyak lensa)
  const handleSelectCameraDevice = async (deviceId) => {
    setSelectedCameraId(deviceId);
    setShowCameraMenu(false);
    localStorage.setItem('preferred_scanner_camera', deviceId);
    await startScanner(facingMode, deviceId);
  };

  // Ubah Kecepatan Scan Antrean (Kilat 1.5s / Cepat 3s / Santai 6s)
  const handleSpeedChange = (newMode) => {
    setSpeedMode(newMode);
    localStorage.setItem('preferred_scanner_speed', newMode);
  };

  // Saklar Lampu Senter / Flashlight untuk kondisi pencahayaan minim
  const handleToggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const nextTorch = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch }]
      });
      setTorchOn(nextTorch);
    } catch (err) {
      console.warn("Gagal mengubah status torch:", err);
    }
  };

  // Global listener untuk USB Barcode / QR Scanner Gun fisik
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalBarcode = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;
      if (scanResult) return;

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 150) {
        buffer = '';
      }
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

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      processAttendanceScan(manualCode.trim());
    }
  };

  return (
    <div className="min-h-screen islamic-pattern flex flex-col items-center justify-center px-4 py-6 relative overflow-hidden bg-[#F8F9FA]">
      {/* Background Decor santri */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <img
          src="/pesantren_hero.png"
          alt="Decor"
          className="w-full h-full object-cover opacity-[12%] filter blur-[6px]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#F8F9FA]/20 via-[#F8F9FA]/5 to-[#F8F9FA]"></div>
      </div>

      <div className="w-full max-w-[480px] flex flex-col justify-between items-center relative z-10 space-y-3">
        {/* Header E-ABSENSI */}
        <motion.div
          initial={{ y: -15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full text-center space-y-1"
        >
          <h1 className="text-2xl sm:text-3xl font-black text-pesantren-primary tracking-wider flex items-center justify-center gap-2">
            <QrCode className="w-7 h-7 text-pesantren-gold" />
            E-ABSENSI
          </h1>
          <p className="text-gray-500 font-bold text-[10px] sm:text-[11px] tracking-[0.22em] uppercase">
            SMP Pesantren Hidayatut Tholibin
          </p>
          <div className="h-[2px] w-10 bg-pesantren-gold mx-auto rounded-full mt-1.5"></div>
        </motion.div>

        {/* Toolbar Kamera & Mode Presensi Cepat */}
        <div className="w-full space-y-2">
          {/* Baris Status Kamera & Kontrol Cepat */}
          <div className="flex items-center justify-between w-full px-1">
            {/* Status Aktif Kamera */}
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                {cameraActive ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                )}
              </span>
              <span className="text-[11px] font-bold text-gray-700 tracking-wide">
                {cameraActive ? 'Kamera Aktif (25 FPS Cepat)' : isStartingCamera ? 'Menyiapkan Kamera...' : 'Kamera Belum Aktif'}
              </span>
            </div>

            {/* Tombol-Tombol Aksi Cepat */}
            <div className="flex items-center gap-1.5">
              {/* Tombol Balik Kamera (Depan / Belakang) */}
              <button
                type="button"
                onClick={handleToggleFacingMode}
                title={`Kamera saat ini: ${facingMode === 'environment' ? 'Belakang' : 'Depan'}. Klik untuk membalik.`}
                className="p-1.5 rounded-full bg-white border border-gray-200 text-gray-700 hover:text-pesantren-primary hover:border-pesantren-primary/40 shadow-2xs transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
              >
                <SwitchCamera className="w-3.5 h-3.5 text-pesantren-primary" />
                <span className="hidden sm:inline">{facingMode === 'environment' ? 'Belakang' : 'Depan'}</span>
              </button>

              {/* Lampu Senter / Torch (jika didukung perangkat) */}
              {hasTorch && (
                <button
                  type="button"
                  onClick={handleToggleTorch}
                  title="Nyalakan Lampu Senter"
                  className={`p-1.5 rounded-full border shadow-2xs transition-colors cursor-pointer ${torchOn
                    ? 'bg-amber-400 text-gray-900 border-amber-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:text-amber-500'
                    }`}
                >
                  <Flashlight className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Toggle Input Manual / Barcode Gun */}
              <button
                id="btn-manual-toggle"
                type="button"
                onClick={() => setShowManualInput((prev) => !prev)}
                className="text-[11px] font-bold text-pesantren-primary hover:text-emerald-700 flex items-center gap-1 bg-white border border-emerald-200/80 px-2.5 py-1 rounded-full shadow-2xs hover:bg-emerald-50 transition-colors cursor-pointer"
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span>{showManualInput ? 'Tutup' : 'Input Manual'}</span>
              </button>
            </div>
          </div>

          {/* Mode Kecepatan Antrean Selector */}
          <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-2xl border border-gray-200/70 shadow-2xs">
            <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1 uppercase tracking-wider">
              <Zap className="w-3 h-3 text-amber-500" />
              Kecepatan:
            </span>
            <div className="flex items-center gap-1">
              {SPEED_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => handleSpeedChange(mode.id)}
                  title={mode.desc}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-xl transition-all cursor-pointer ${speedMode === mode.id
                    ? 'bg-pesantren-primary text-white shadow-2xs'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pilihan Kamera Spesifik jika perangkat memiliki lebih dari 1 kamera */}
          {cameras.length > 1 && (
            <div className="relative text-left">
              <button
                type="button"
                onClick={() => setShowCameraMenu((prev) => !prev)}
                className="text-[10px] text-gray-500 hover:text-pesantren-primary font-medium flex items-center gap-1 px-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3 text-gray-400" />
                <span>Pilih Sumber Kamera Hardware ({cameras.length} terdeteksi)</span>
              </button>

              {showCameraMenu && (
                <div className="absolute top-6 left-0 right-0 bg-white rounded-xl shadow-lg border border-gray-200 p-2 z-30 space-y-1">
                  {cameras.map((cam, idx) => (
                    <button
                      key={cam.id || idx}
                      type="button"
                      onClick={() => handleSelectCameraDevice(cam.id)}
                      className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer truncate ${selectedCameraId === cam.id
                        ? 'bg-emerald-50 text-pesantren-primary font-bold'
                        : 'text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      {cam.label || `Kamera Hardware ${idx + 1}`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Form Input NISN / Barcode Gun Manual */}
          {showManualInput && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="w-full space-y-1.5"
            >
              <form
                id="form-manual-scan"
                onSubmit={handleManualSubmit}
                className="w-full bg-white p-2.5 rounded-2xl shadow-sm border border-emerald-200 flex items-center gap-2"
              >
                <input
                  id="input-manual-barcode"
                  type="text"
                  placeholder="Ketik NISN (contoh: 00943523) lalu Enter..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  autoFocus
                  className="flex-1 text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-pesantren-primary font-medium"
                />
                <button
                  id="btn-manual-submit"
                  type="submit"
                  disabled={!manualCode.trim() || isProcessing}
                  className="px-4 py-2 bg-pesantren-primary text-white rounded-xl text-xs font-bold hover:bg-[#0c7853] disabled:opacity-50 flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Absen</span>
                </button>
              </form>
              <div className="flex items-center gap-1.5 px-2">
                <span className="text-[10px] text-gray-400 font-semibold">Uji Coba Cepat:</span>
                <button
                  id="btn-demo-kelvin"
                  type="button"
                  onClick={() => processAttendanceScan('00943523')}
                  className="text-[10px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md font-mono font-bold cursor-pointer transition-colors"
                >
                  KELVIN (00943523)
                </button>
                <button
                  id="btn-demo-selvia"
                  type="button"
                  onClick={() => processAttendanceScan('0088884410')}
                  className="text-[10px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md font-mono font-bold cursor-pointer transition-colors"
                >
                  SELVIA (0088884410)
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Viewfinder Kamera Scanner: Frame presisi, responsif, dan halus */}
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="w-full flex-1 flex items-center justify-center"
        >
          <div className={`bg-white p-2 rounded-[28px] shadow-[0_12px_35px_rgba(0,0,0,0.08)] border transition-all duration-300 w-full h-[60vh] max-h-[480px] min-h-[350px] flex items-center justify-center relative ${scanFlash ? 'border-emerald-400 ring-4 ring-emerald-400/40' : 'border-white/70'
            }`}>
            <div className={`w-full h-full relative overflow-hidden rounded-[22px] bg-black ${error ? 'opacity-25 grayscale' : 'opacity-100'}`}>
              {/* Wadah Video Asli dari Html5Qrcode */}
              <div id="reader" className="w-full h-full"></div>

              {/* Garis Laser Animasi & Sudut Frame Presisi */}
              {cameraActive && !scanResult && (
                <div className="absolute inset-0 pointer-events-none flex justify-center z-10">
                  {/* Animasi Laser Bar bergerak naik-turun */}
                  <motion.div
                    animate={{ top: ["4%", "94%"] }}
                    transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                    className="absolute left-6 right-6 h-[3px] bg-emerald-400 rounded-full shadow-[0_0_10px_#10B981,0_0_20px_#10B981]"
                  />

                  {/* 4 Sudut Panduan Penempatan Kartu QR */}
                  <div className="absolute top-5 left-5 w-7 h-7 border-t-[3px] border-l-[3px] border-emerald-400 rounded-tl-lg shadow-sm"></div>
                  <div className="absolute top-5 right-5 w-7 h-7 border-t-[3px] border-r-[3px] border-emerald-400 rounded-tr-lg shadow-sm"></div>
                  <div className="absolute bottom-5 left-5 w-7 h-7 border-b-[3px] border-l-[3px] border-emerald-400 rounded-bl-lg shadow-sm"></div>
                  <div className="absolute bottom-5 right-5 w-7 h-7 border-b-[3px] border-r-[3px] border-emerald-400 rounded-br-lg shadow-sm"></div>

                  {/* Banner Bantuan di bagian bawah viewfinder */}
                  <div className="absolute bottom-3 inset-x-4 flex justify-center">
                    <span className="bg-black/60 backdrop-blur-md text-white/90 text-[10px] font-bold px-3 py-1 rounded-full border border-white/10 shadow-xs">
                      Arahkan QR Code Kartu Santri ke Dalam Kotak
                    </span>
                  </div>
                </div>
              )}

              {/* Status Menyiapkan Kamera */}
              {isStartingCamera && (
                <div className="absolute inset-0 flex flex-col justify-center items-center text-white bg-black/80 backdrop-blur-xs rounded-[22px] p-4 text-center z-20">
                  <div className="animate-spin w-9 h-9 border-4 border-white/20 border-t-emerald-400 rounded-full mb-2.5"></div>
                  <p className="text-xs font-bold uppercase tracking-wider text-white">Memulai Kamera Scanner...</p>
                  <p className="text-[10px] text-gray-300 mt-1 max-w-[240px]">
                    Mengoptimalkan sensor & pendeteksi QR code berkecepatan tinggi
                  </p>
                </div>
              )}

              {/* Tampilan Jika Kamera Belum Menyala / Izin Ditolak */}
              {!cameraActive && !isStartingCamera && (
                <div className="absolute inset-0 flex flex-col justify-center items-center text-white bg-gradient-to-b from-gray-950 via-gray-900 to-black rounded-[22px] p-6 text-center z-20 space-y-3">
                  <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-amber-400 mb-1 border border-white/10">
                    <CameraOff className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">Kamera Belum Aktif</h3>
                    <p className="text-[11px] text-gray-300 mt-1 max-w-[280px]">
                      {cameraError || 'Aktifkan kamera scanner agar dapat memindai QR code santri dengan cepat dan otomatis.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => startScanner()}
                    className="mt-2 px-5 py-2.5 rounded-full bg-pesantren-primary hover:bg-[#0c7853] text-white text-xs font-bold shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Aktifkan Kamera Sekarang</span>
                  </button>
                  <p className="text-[9px] text-gray-400">
                    Atau gunakan opsi <span className="text-emerald-400 font-semibold">Input Manual / Barcode Gun</span> di atas
                  </p>
                </div>
              )}
            </div>

            {/* Error Message Overlay */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-3 flex flex-col justify-center items-center text-center text-red-500 bg-white/95 backdrop-blur-sm p-6 rounded-[22px] z-30 shadow-md border border-red-100"
                >
                  <XCircle className="w-12 h-12 mb-2 text-red-500" />
                  <p className="text-sm font-bold text-gray-800">{error}</p>
                  <button
                    onClick={() => { setError(null); }}
                    className="mt-4 px-4 py-1.5 rounded-full bg-pesantren-primary text-white text-xs font-bold shadow-md hover:bg-[#0c7853] transition-colors"
                  >
                    Lanjutkan Scan
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Modal Hasil Presensi Presisi Tinggi (Waktu Detail Jam, Menit, Detik, Milidetik) */}
        <AnimatePresence>
          {scanResult && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md overflow-y-auto"
            >
              <motion.div
                initial={{ scale: 0.92, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.92, y: 15 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="bg-white rounded-[28px] shadow-2xl p-5 sm:p-6 max-w-sm sm:max-w-md w-full text-center border border-gray-100 relative overflow-hidden my-auto"
              >
                {/* Garis Progress Hitung Mundur Otomatis */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gray-100">
                  <motion.div
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: currentSpeed.sec, ease: "linear" }}
                    className={`h-full ${scanResult.alreadyScanned ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  />
                </div>

                {/* Tombol Tutup Silang di Kanan Atas */}
                <button
                  onClick={handleCloseResult}
                  className="absolute top-3 right-3 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  aria-label="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Ikon & Badge Status Absensi */}
                <div className="flex flex-col items-center mt-1 mb-3">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-2 shadow-sm ${scanResult.alreadyScanned
                    ? 'bg-amber-50 text-amber-600 border border-amber-200'
                    : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    }`}>
                    {scanResult.alreadyScanned ? (
                      <Clock className="w-7 h-7" />
                    ) : (
                      <CheckCircle2 className="w-7 h-7" />
                    )}
                  </div>

                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${scanResult.alreadyScanned
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
                        : 'BERHASIL HADIR (TEPAT WAKTU)'}
                  </span>

                  <h3 className="text-lg sm:text-xl font-black text-gray-800 mt-1">
                    {scanResult.alreadyScanned ? 'Data Absensi Ditemukan' : 'Absensi Berhasil!'}
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    {scanResult.alreadyScanned
                      ? 'Santri telah melakukan scan absensi sebelumnya'
                      : 'Waktu presisi santri berhasil dicatat ke sistem'}
                  </p>
                </div>

                {/* FITUR UTAMA: WAKTU PRESISI DETAIL (JAM, MENIT, DETIK, MILIDETIK) */}
                <div className="bg-gradient-to-br from-[#0a271e] via-[#0d362a] to-[#061e16] rounded-2xl p-4 text-white shadow-md border border-emerald-500/30 mb-4 text-left relative overflow-hidden">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-emerald-300/80 mb-2.5">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      Waktu Presisi Absensi
                    </span>
                    <span className="flex items-center gap-1 bg-emerald-500/20 px-2 py-0.5 rounded-full text-[9px] text-emerald-300 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      WIB (UTC+7)
                    </span>
                  </div>

                  {/* Digital Clock Breakdown: Jam : Menit : Detik . Milidetik */}
                  <div className="grid grid-cols-4 gap-1.5 items-center">
                    {/* JAM */}
                    <div className="bg-black/40 backdrop-blur-xs border border-white/10 rounded-xl py-2 px-1 text-center">
                      <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white block">
                        {scanResult.hours}
                      </span>
                      <span className="block text-[8px] font-bold tracking-widest text-emerald-300/80 uppercase mt-0.5">
                        JAM
                      </span>
                    </div>

                    {/* MENIT */}
                    <div className="bg-black/40 backdrop-blur-xs border border-white/10 rounded-xl py-2 px-1 text-center">
                      <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white block">
                        {scanResult.minutes}
                      </span>
                      <span className="block text-[8px] font-bold tracking-widest text-emerald-300/80 uppercase mt-0.5">
                        MENIT
                      </span>
                    </div>

                    {/* DETIK */}
                    <div className="bg-black/40 backdrop-blur-xs border border-emerald-500/40 rounded-xl py-2 px-1 text-center shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                      <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-emerald-300 block">
                        {scanResult.seconds}
                      </span>
                      <span className="block text-[8px] font-bold tracking-widest text-emerald-300 uppercase mt-0.5">
                        DETIK
                      </span>
                    </div>

                    {/* MILIDETIK (HIGHLIGHT) */}
                    <div className="bg-emerald-950/80 border border-amber-400/50 rounded-xl py-2 px-1 text-center shadow-[0_0_12px_rgba(251,191,36,0.25)]">
                      <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-amber-300 block">
                        {scanResult.milliseconds}
                      </span>
                      <span className="block text-[8px] font-black tracking-widest text-amber-300 uppercase mt-0.5">
                        MS
                      </span>
                    </div>
                  </div>

                  {/* Tanggal & Full Time String Footer */}
                  <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-emerald-200/90">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      {scanResult.dateFull}
                    </span>
                    <span className="font-mono text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded text-white tracking-wider">
                      {scanResult.hours}:{scanResult.minutes}:{scanResult.seconds}.{scanResult.milliseconds}
                    </span>
                  </div>
                </div>

                {/* Detail Santri Card */}
                <div className="bg-[#F8F9FA] rounded-2xl p-4 space-y-3 text-left border border-gray-100 mb-4">
                  <div className="flex items-center gap-3 pb-2.5 border-b border-gray-200/60">
                    <div className="w-9 h-9 rounded-xl bg-pesantren-primary/10 text-pesantren-primary flex items-center justify-center font-bold text-sm shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                        {scanResult.isTeacher ? 'Nama Guru / Tenaga Pengajar' : 'Nama Lengkap Santri'}
                      </p>
                      <p className="text-base font-extrabold text-gray-800 leading-tight truncate">
                        {scanResult.name}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                        {scanResult.isTeacher ? 'Jabatan' : 'Kelas'}
                      </p>
                      <p className="text-xs font-bold text-gray-800 mt-0.5">{scanResult.class}</p>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                        {scanResult.isTeacher ? 'NIP' : 'NISN'}
                      </p>
                      <p className="text-xs font-bold text-gray-800 font-mono mt-0.5">{scanResult.nisn}</p>
                    </div>
                  </div>

                  {/* Status Presensi & Info Notifikasi */}
                  <div className="pt-1 flex items-center justify-between text-[10px]">
                    {scanResult.isLate ? (
                      <span className="flex items-center gap-1 text-amber-700 font-bold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        Status: Terlambat (Lewat 07:15 WIB)
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Status: Hadir Tepat Waktu
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-gray-500 font-mono">
                      <Hash className="w-3 h-3 text-gray-400" />
                      Log #{scanResult.milliseconds}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 bg-emerald-50/70 p-2 rounded-xl border border-emerald-100/70">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-medium">
                      Notifikasi WhatsApp otomatis terkirim dengan jam & detik presisi.
                    </span>
                  </div>
                </div>

                {/* Tombol Utama Lanjut Scan Santri Berikutnya */}
                <button
                  onClick={handleCloseResult}
                  className="w-full py-3 px-4 rounded-xl bg-pesantren-primary hover:bg-[#0c7853] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Scan Santri Berikutnya ({countdown}s)</span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <p className="text-[9px] text-gray-400 mt-2">
                  Tekan <span className="font-bold text-gray-600">[Spasi]</span> atau klik tombol untuk langsung scan santri berikutnya
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Link & QR Buka di Smartphone */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full flex flex-col items-center gap-2.5 mt-1"
        >
          <Link
            to="/cek"
            className="inline-flex items-center gap-1.5 bg-white/95 border border-gray-200/80 px-4 py-1.5 rounded-full text-gray-600 hover:text-pesantren-primary text-xs font-bold transition-all shadow-xs"
          >
            <Search className="w-3.5 h-3.5 text-pesantren-primary" />
            Wali Murid? Cek Kehadiran Di Sini
          </Link>

          <div className="bg-white p-2 rounded-xl shadow-md border border-gray-100 flex items-center gap-3">
            <QRCodeSVG value={window.location.href} size={44} />
            <div>
              <p className="text-[9px] font-black text-gray-600 uppercase tracking-wider leading-none">Buka di Smartphone</p>
              <p className="text-[8px] font-semibold text-gray-400 mt-1 leading-none">Scan untuk akses cepat</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ScanPage;
