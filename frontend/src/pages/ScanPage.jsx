import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ScanLine, XCircle, BookOpen } from 'lucide-react';

const ScanPage = () => {
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);
  const [isScanning, setIsScanning] = useState(true);
  const scannerRef = useRef(null);

  useEffect(() => {
    let html5QrCode;
    
    if (isScanning && !scannerRef.current) {
      html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;
      
      const qrCodeSuccessCallback = (decodedText, decodedResult) => {
        // Handle on success condition with the decoded message.
        setScanResult(decodedText);
        setIsScanning(false);
        html5QrCode.stop().then(() => {
          scannerRef.current = null;
          
          // Dummy data for visual presentation
          // In real implementation, this will fetch from backend
          
          // Auto reset after 3 seconds
          setTimeout(() => {
            setScanResult(null);
            setIsScanning(true);
          }, 3000);
        }).catch((err) => {
          console.error("Failed to stop scanner", err);
        });
      };

      const qrCodeErrorCallback = (errorMessage) => {
        // Handle scan error (typically ignored as it scans constantly)
      };

      html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        qrCodeSuccessCallback,
        qrCodeErrorCallback
      ).catch((err) => {
        console.error("Error starting scanner", err);
        setError("Kamera tidak dapat diakses. Pastikan izin kamera diberikan.");
      });
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => {
          scannerRef.current = null;
        }).catch(err => console.log("Stop failed", err));
      }
    };
  }, [isScanning]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-pesantren-light to-white p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-pesantren-emerald/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 bg-pesantren-gold/10 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md z-10 flex flex-col gap-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="inline-flex items-center justify-center p-3 bg-pesantren-primary/10 rounded-full mb-2"
          >
            <BookOpen className="w-8 h-8 text-pesantren-primary" />
          </motion.div>
          <motion.h1 
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-2xl font-bold text-pesantren-primary"
          >
            Sistem Absensi
          </motion.h1>
          <motion.p 
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-sm text-gray-500"
          >
            SMP Pesantren Hidayatut Tholibin
          </motion.p>
        </div>

        {/* Scanner Card */}
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="glass-card overflow-hidden relative"
        >
          <div className="p-6 text-center border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Scan QR Code Siswa</h2>
            <p className="text-xs text-gray-400 mt-1">Arahkan kamera ke QR Code pada ID Card</p>
          </div>

          <div className="relative p-6 bg-black/5 flex justify-center items-center min-h-[300px]">
            <div className={`w-full relative ${error ? 'hidden' : 'block'}`}>
              {/* QR Reader Div */}
              <div id="reader" className="w-full rounded-2xl overflow-hidden shadow-inner"></div>
              
              {/* Scanning Overlay Animation */}
              {isScanning && !scanResult && (
                <div className="absolute inset-0 pointer-events-none flex justify-center items-center z-10">
                  <motion.div 
                    animate={{ 
                      y: ["-40%", "40%"],
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 1.5, 
                      ease: "linear",
                      repeatType: "reverse"
                    }}
                    className="w-3/4 h-1 bg-pesantren-emerald rounded-full shadow-[0_0_10px_rgba(16,185,129,0.8)]"
                  />
                </div>
              )}
            </div>
            
            {error && (
              <div className="absolute inset-0 flex flex-col justify-center items-center text-center text-red-500 bg-black/5 p-6 rounded-2xl">
                <XCircle className="w-12 h-12 mb-2" />
                <p className="text-sm">{error}</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Result Feedback Overlay */}
        <AnimatePresence>
          {scanResult && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-white/60 backdrop-blur-sm"
            >
              <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border border-pesantren-emerald/20">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                  className="w-20 h-20 bg-pesantren-emerald/10 rounded-full flex items-center justify-center mx-auto mb-4 text-pesantren-emerald"
                >
                  <CheckCircle2 className="w-10 h-10" />
                </motion.div>
                
                <h3 className="text-2xl font-bold text-gray-800 mb-1">Berhasil Absen!</h3>
                <p className="text-sm text-gray-500 mb-6">{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</p>
                
                <div className="bg-gray-50 rounded-2xl p-4 space-y-3 text-left">
                  <div>
                    <p className="text-xs text-gray-400">Nama Lengkap</p>
                    <p className="font-semibold text-gray-800">Ahmad Farhan</p> {/* Dummy Data */}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Kelas</p>
                    <p className="font-semibold text-gray-800">VIII - B</p> {/* Dummy Data */}
                  </div>
                </div>

                <p className="text-xs text-pesantren-primary mt-6 flex items-center justify-center gap-1">
                  <ScanLine className="w-3 h-3" /> Siap untuk scan berikutnya...
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ScanPage;
