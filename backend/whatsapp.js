/**
 * whatsapp.js — Layanan WhatsApp Otomatis (Baileys)
 * Fungsi: Kirim notifikasi ke HP orang tua saat siswa scan QR absensi
 */

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    isJidBroadcast,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const path = require('path');
const fs = require('fs');
const pino = require('pino');

// ─── State Internal ─────────────────────────────────────────────────────────
let waSocket = null;
let waStatus = 'disconnected'; // 'disconnected' | 'connecting' | 'qr_ready' | 'connected'
let waQRCode = null;
let reconnectTimer = null;

const SESSION_DIR = path.join(__dirname, 'wa_session');

// Pastikan folder sesi ada
if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
}

// ─── Logger Senyap (suppress noise Baileys) ──────────────────────────────────
const logger = pino({ level: 'silent' });

// ─── Fungsi Utama: Sambungkan WhatsApp ──────────────────────────────────────
async function connectWhatsApp() {
    if (waStatus === 'connected') return;

    waStatus = 'connecting';
    console.log('🔌 Menghubungkan ke WhatsApp...');

    try {
        const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
        const { version } = await fetchLatestBaileysVersion();

        waSocket = makeWASocket({
            version,
            logger,
            printQRInTerminal: true, // QR tampil di terminal otomatis
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger),
            },
            getMessage: async () => undefined,
        });

        // ── Event: Update Kredensial (simpan sesi) ──
        waSocket.ev.on('creds.update', saveCreds);

        // ── Event: Update Koneksi ──
        waSocket.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                waStatus = 'qr_ready';
                waQRCode = qr;
                console.log('\n' + '═'.repeat(60));
                console.log('📱 SCAN QR CODE DI ATAS DENGAN WHATSAPP HP ANDA');
                console.log('   (Buka WhatsApp → Titik 3 → Perangkat Tertaut → Tautkan)');
                console.log('═'.repeat(60) + '\n');
            }

            if (connection === 'close') {
                waStatus = 'disconnected';
                waQRCode = null;
                const statusCode = (lastDisconnect?.error instanceof Boom)
                    ? lastDisconnect.error.output?.statusCode
                    : undefined;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                console.log(`❌ WhatsApp terputus. Kode: ${statusCode}. Reconnect: ${shouldReconnect}`);

                if (shouldReconnect) {
                    // Coba sambung ulang setelah 5 detik
                    if (reconnectTimer) clearTimeout(reconnectTimer);
                    reconnectTimer = setTimeout(() => {
                        console.log('🔄 Mencoba sambung ulang WhatsApp...');
                        connectWhatsApp();
                    }, 5000);
                } else {
                    console.log('🚪 Sesi WhatsApp telah logout. Hapus folder wa_session/ untuk login ulang.');
                    // Hapus sesi agar bisa login ulang
                    try {
                        fs.rmSync(SESSION_DIR, { recursive: true, force: true });
                        fs.mkdirSync(SESSION_DIR, { recursive: true });
                    } catch (e) { /* ignore */ }
                }
            }

            if (connection === 'open') {
                waStatus = 'connected';
                waQRCode = null;
                console.log('✅ WhatsApp berhasil terhubung! Notifikasi orang tua aktif.');
            }
        });

    } catch (err) {
        console.error('❌ Gagal menginisialisasi WhatsApp:', err.message);
        waStatus = 'disconnected';
        // Coba lagi setelah 10 detik
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connectWhatsApp, 10000);
    }
}

// ─── Fungsi: Format Nomor HP ke Format WhatsApp ──────────────────────────────
function formatPhoneForWA(phone) {
    if (!phone) return null;
    
    // Hapus semua karakter non-digit
    let cleaned = String(phone).replace(/\D/g, '');
    
    // Konversi format lokal ke internasional
    if (cleaned.startsWith('0')) {
        cleaned = '62' + cleaned.slice(1);
    } else if (cleaned.startsWith('8')) {
        cleaned = '62' + cleaned;
    }
    // Kalau sudah mulai dengan 62, biarkan
    
    // Format WhatsApp JID
    return cleaned + '@s.whatsapp.net';
}

// ─── Fungsi Utama: Kirim Pesan WhatsApp ─────────────────────────────────────
async function sendWhatsAppMessage(parentPhone, message) {
    if (waStatus !== 'connected' || !waSocket) {
        console.warn(`⚠️  WhatsApp belum terhubung (status: ${waStatus}). Pesan tidak terkirim.`);
        return { success: false, reason: 'not_connected' };
    }

    const jid = formatPhoneForWA(parentPhone);
    if (!jid) {
        console.warn('⚠️  Nomor HP orang tua tidak valid:', parentPhone);
        return { success: false, reason: 'invalid_phone' };
    }

    try {
        await waSocket.sendMessage(jid, { text: message });
        console.log(`📤 Pesan WA terkirim ke ${parentPhone} (${jid})`);
        return { success: true };
    } catch (err) {
        console.error(`❌ Gagal kirim WA ke ${parentPhone}:`, err.message);
        return { success: false, reason: err.message };
    }
}

// ─── Fungsi: Buat Pesan Absensi ──────────────────────────────────────────────
function buildAttendanceMessage(studentName, studentClass, nisn) {
    const now = new Date();
    const tanggal = now.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    const jam = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).replace('.', ':');

    return (
        `🕌 *ABSENSI SMP*\n` +
        `Pesantren Hidayatut Tholibin\n\n` +
        `✅ *${studentName}* telah hadir\n` +
        `📚 Kelas: *${studentClass}*\n` +
        `🆔 NISN: ${nisn}\n` +
        `📅 ${tanggal}\n` +
        `🕐 Pukul: *${jam} WIB*\n\n` +
        `_Pesan otomatis dari Sistem E-Absensi_`
    );
}

// ─── Fungsi: Dapatkan Status Koneksi ─────────────────────────────────────────
function getWhatsAppStatus() {
    return {
        status: waStatus,
        isConnected: waStatus === 'connected',
        hasQR: waStatus === 'qr_ready',
        qrCode: waStatus === 'qr_ready' ? waQRCode : null,
        phoneInfo: waSocket?.user ? {
            id: waSocket.user.id,
            name: waSocket.user.name
        } : null
    };
}

module.exports = {
    connectWhatsApp,
    sendWhatsAppMessage,
    buildAttendanceMessage,
    getWhatsAppStatus,
};
