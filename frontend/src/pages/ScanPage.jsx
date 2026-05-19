import { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Search, QrCode, Camera } from 'lucide-react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

import { getBaseUrl } from '../utils/api';

const ScanPage = () => {
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);
  const [isScanning, setIsScanning] = useState(true);
  const scannerRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);

  useEffect(() => {
    // Initialize scanner only once
    const html5QrCode = new Html5Qrcode("reader");
    scannerRef.current = html5QrCode;

    const startScanner = async () => {
      try {
        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        };

        await html5QrCode.start(
          { facingMode: "user" },
          config,
          async (decodedText) => {
            try {
              // Stop scanning immediately on success
              setIsScanning(false);
              setCameraActive(false);
              await html5QrCode.stop();

              const baseUrl = getBaseUrl();
              const response = await fetch(`${baseUrl}/api/scan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qr_code: decodedText })
              });

              const data = await response.json();

              if (!response.ok) {
                setError(data.error || "Gagal absen");
                setTimeout(() => { setError(null); setIsScanning(true); }, 3000);
              } else {
                setScanResult({
                  name: data.student.name,
                  nisn: data.student.nisn,
                  class: data.student.class,
                  time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                });
                setTimeout(() => { setScanResult(null); setIsScanning(true); }, 5000);
              }
            } catch (err) {
              console.error("Scan processing error:", err);
              setError("Gagal terhubung ke server");
              setTimeout(() => { setError(null); setIsScanning(true); }, 3000);
            }
          },
          () => { } // On success but no match yet
        );
        setCameraActive(true);
      } catch (err) {
        console.error("Camera start error:", err);
        // Don't set error state here to avoid blocking the UI, 
        // just show the "Camera off" state in the reader div if needed.
      }
    };

    if (isScanning && !scanResult) {
      startScanner();
    }

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(err => console.log("Stop error:", err));
      }
    };
  }, [isScanning, scanResult]);

  return (
    <div className="min-h-screen islamic-pattern flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none">
        <img
          src="/pesantren_hero.png"
          alt="Decor"
          className="w-full h-full object-cover opacity-10"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-pesantren-light/30 via-transparent to-pesantren-light"></div>
      </div>

      <div className="max-w-md w-full space-y-6 text-center relative z-10">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="space-y-1 mb-6"
        >
          <div className="flex justify-center mb-4">
            <img src="/logo.png" alt="Logo" className="w-32 h-32 sm:w-40 sm:h-40 object-contain mix-blend-multiply" />
          </div>
          <h1 className="text-3xl font-black text-pesantren-primary tracking-tight flex items-center justify-center gap-3">
            <QrCode className="w-8 h-8 text-pesantren-gold" />
            E-ABSENSI
          </h1>
          <p className="text-pesantren-emerald font-bold text-xs tracking-[0.2em] uppercase">SMP Pesantren Hidayatut Tholibin</p>
          <div className="h-1 w-12 bg-pesantren-gold mx-auto rounded-full mt-3"></div>
        </motion.div>

        {/* Scanner Card */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="glass-card overflow-hidden shadow-2xl"
        >
          <div className="p-4 text-center border-b border-gray-100 bg-white/50 flex items-center justify-center gap-2">
            <Camera className="w-4 h-4 text-pesantren-emerald" />
            <h2 className="font-bold text-gray-800 text-xs uppercase tracking-widest">Pindai QR Code Santri</h2>
          </div>

          <div className="relative p-6 bg-gray-50 flex justify-center items-center min-h-[300px]">
            <div className={`w-full max-w-[280px] aspect-square relative ${error ? 'opacity-20 grayscale' : 'opacity-100'}`}>
              <div id="reader" className="w-full h-full rounded-2xl overflow-hidden shadow-inner border-2 border-white bg-black"></div>

              {/* Overlay Overlay */}
              {isScanning && !scanResult && (
                <div className="absolute inset-0 pointer-events-none flex justify-center items-center z-10">
                  {/* Laser Line */}
                  <motion.div
                    animate={{ y: ["-40%", "40%"] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                    className="w-4/5 h-0.5 bg-pesantren-emerald rounded-full shadow-[0_0_15px_rgba(16,185,129,1)]"
                  />

                  {/* Corners */}
                  <div className="absolute top-4 left-4 w-10 h-10 border-t-4 border-l-4 border-white rounded-tl-xl"></div>
                  <div className="absolute top-4 right-4 w-10 h-10 border-t-4 border-r-4 border-white rounded-tr-xl"></div>
                  <div className="absolute bottom-4 left-4 w-10 h-10 border-b-4 border-l-4 border-white rounded-bl-xl"></div>
                  <div className="absolute bottom-4 right-4 w-10 h-10 border-b-4 border-r-4 border-white rounded-br-xl"></div>
                </div>
              )}

              {/* Status Camera Off */}
              {!cameraActive && isScanning && !error && (
                <div className="absolute inset-0 flex flex-col justify-center items-center text-white/50 bg-black/40 backdrop-blur-sm rounded-2xl">
                  <div className="animate-spin w-8 h-8 border-4 border-white/20 border-t-white rounded-full mb-2"></div>
                  <p className="text-[10px] font-bold uppercase tracking-widest">Memulai Kamera...</p>
                </div>
              )}
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-0 flex flex-col justify-center items-center text-center text-red-500 bg-white/90 backdrop-blur-sm p-6 rounded-2xl z-20"
                >
                  <XCircle className="w-12 h-12 mb-2" />
                  <p className="text-sm font-bold">{error}</p>
                  <button onClick={() => { setError(null); setIsScanning(true); }} className="mt-4 text-xs font-bold text-pesantren-primary underline">Coba Lagi</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Results Modal */}
        <AnimatePresence>
          {scanResult && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pesantren-primary/40 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white rounded-[2rem] shadow-2xl p-8 max-w-sm w-full text-center"
              >
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-gray-800 mb-1">Berhasil Hadir!</h3>
                <p className="text-sm font-medium text-pesantren-emerald mb-8 bg-emerald-50 inline-block px-3 py-1 rounded-full">{scanResult.time} WIB</p>
                <div className="bg-pesantren-light rounded-2xl p-5 space-y-4 text-left border border-pesantren-emerald/10">
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Nama Santri</p>
                    <p className="text-lg font-bold text-gray-800 leading-tight">{scanResult.name}</p>
                  </div>
                  <div className="pt-3 border-t border-pesantren-emerald/5 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Kelas</p>
                      <p className="font-bold text-gray-700">{scanResult.class}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">NISN</p>
                      <p className="font-bold text-gray-700">{scanResult.nisn}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="pt-4 flex flex-col items-center gap-6">
          <Link to="/cek" className="inline-flex items-center gap-2 bg-white/50 backdrop-blur-sm border border-pesantren-primary/10 px-4 py-2 rounded-full text-pesantren-primary/70 hover:text-pesantren-primary text-xs font-bold transition-all shadow-sm">
            <Search className="w-3.5 h-3.5" /> Wali Murid? Cek Kehadiran Di Sini
          </Link>

          <div className="bg-white p-3 rounded-2xl shadow-lg border border-gray-100 flex flex-col items-center gap-2">
            <QRCodeSVG value={window.location.href} size={80} />
            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Scan untuk Buka di HP</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ScanPage;
