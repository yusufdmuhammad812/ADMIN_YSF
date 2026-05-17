const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const {
    connectWhatsApp,
    sendWhatsAppMessage,
    buildAttendanceMessage,
    getWhatsAppStatus,
} = require('./whatsapp');

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// API Endpoint untuk scan QR
app.post('/api/scan', async (req, res) => {
    const { qr_code } = req.body;

    if (!qr_code) {
        return res.status(400).json({ error: "QR code is required" });
    }

    try {
        // Cari siswa berdasarkan qr_code
        const student = await prisma.student.findUnique({
            where: { qr_code }
        });

        if (!student) {
            return res.status(404).json({ error: "Data siswa tidak ditemukan" });
        }

        // Cek apakah sudah absen hari ini
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const existingAttendance = await prisma.attendance.findFirst({
            where: {
                studentId: student.id,
                timestamp: {
                    gte: today
                }
            }
        });

        if (existingAttendance) {
            return res.json({
                success: true,
                alreadyScanned: true,
                student: {
                    name: student.name,
                    nisn: student.nisn,
                    class: student.class
                }
            });
        }

        // Simpan absensi baru jika belum ada hari ini
        await prisma.attendance.create({
            data: {
                studentId: student.id
            }
        });

        // ── Kirim notifikasi WhatsApp ke orang tua ──────────────────────
        const waEnabled = process.env.WA_ENABLED !== 'false';
        if (waEnabled && student.parent_phone) {
            const pesan = buildAttendanceMessage(
                student.name,
                student.class,
                student.nisn
            );
            // Fire-and-forget: jangan block response meski WA gagal
            sendWhatsAppMessage(student.parent_phone, pesan)
                .then(result => {
                    if (result.success) {
                        console.log(`📱 Notif WA terkirim ke ortu ${student.name} (${student.parent_phone})`);
                    } else {
                        console.warn(`⚠️  Notif WA gagal untuk ${student.name}: ${result.reason}`);
                    }
                })
                .catch(err => console.error('WA send error:', err));
        }
        // ────────────────────────────────────────────────────────────────

        return res.json({
            success: true,
            student: {
                name: student.name,
                nisn: student.nisn,
                class: student.class
            }
        });

    } catch (error) {
        console.error("Error saat proses absensi:", error);
        return res.status(500).json({ error: "Terjadi kesalahan internal server" });
    }
});

// Endpoint untuk Dashboard
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const totalStudents = await prisma.student.count();
        
        // Menghitung siswa hadir hari ini
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        
        const attendancesToday = await prisma.attendance.count({
            where: {
                timestamp: {
                    gte: startOfDay
                }
            }
        });

        // Data grafik 7 hari terakhir
        const chartData = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const count = await prisma.attendance.count({
                where: {
                    timestamp: {
                        gte: date,
                        lt: nextDate
                    }
                }
            });

            chartData.push({
                name: date.toLocaleDateString('id-ID', { weekday: 'short' }),
                hadir: count
            });
        }

        return res.json({
            totalStudents,
            presentToday: attendancesToday,
            absentToday: totalStudents - attendancesToday,
            chartData
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Gagal mengambil statistik" });
    }
});

// Endpoint data siswa
app.get('/api/dashboard/students', async (req, res) => {
    try {
        const students = await prisma.student.findMany({
            orderBy: { updatedAt: 'desc' }
        });
        res.json(students);
    } catch (error) {
        res.status(500).json({ error: "Gagal mengambil data siswa" });
    }
});

// Endpoint tambah siswa
app.post('/api/dashboard/students', async (req, res) => {
    const { name, nisn, className, parentName, parentPhone } = req.body;
    
    if (!name || !nisn || !className || !parentPhone) {
        return res.status(400).json({ error: "Nama, NISN, Kelas, dan No WA Ortu harus diisi" });
    }

    try {
        const newStudent = await prisma.student.create({
            data: {
                name,
                nisn,
                class: className,
                qr_code: nisn,
                parent_name: parentName,
                parent_phone: parentPhone
            }
        });
        res.json({ success: true, student: newStudent });
    } catch (error) {
        console.error("Gagal tambah siswa:", error);
        res.status(500).json({ error: "Gagal menambah siswa (mungkin NISN sudah terdaftar)" });
    }
});

// Endpoint hapus siswa
app.delete('/api/dashboard/students/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.attendance.deleteMany({ where: { studentId: id } });
        await prisma.student.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Gagal menghapus siswa" });
    }
});

// Endpoint edit siswa
app.put('/api/dashboard/students/:id', async (req, res) => {
    const { id } = req.params;
    const { name, nisn, class: className, parent_name, parent_phone } = req.body;
    try {
        const student = await prisma.student.update({
            where: { id },
            data: { name, nisn, class: className, qr_code: nisn, parent_name, parent_phone }
        });
        res.json({ success: true, student });
    } catch (error) {
        res.status(500).json({ error: "Gagal memperbarui data siswa" });
    }
});

// Endpoint import siswa dari excel
app.post('/api/dashboard/students/import', async (req, res) => {
    const { students } = req.body;
    
    if (!students || !Array.isArray(students)) {
        return res.status(400).json({ error: "Data siswa tidak valid" });
    }

    try {
        const dataToInsert = students.map(s => ({
            name: s.name,
            nisn: s.nisn,
            class: s.className,
            qr_code: s.nisn,
            parent_name: s.parentName,
            parent_phone: String(s.parentPhone)
        }));

        // Insert data ke database, skip yang duplikat (NISN sama)
        const result = await prisma.student.createMany({
            data: dataToInsert,
            skipDuplicates: true
        });

        res.json({ success: true, count: result.count });
    } catch (error) {
        console.error("Gagal import siswa:", error);
        res.status(500).json({ error: "Gagal mengimport data siswa." });
    }
});

// Endpoint cek mandiri wali murid (Bisa NISN atau Nama)
app.get('/api/parent/check/:query', async (req, res) => {
    const { query } = req.params;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
        const students = await prisma.student.findMany({
            where: {
                OR: [
                    { nisn: query },
                    { name: { contains: query, mode: 'insensitive' } }
                ]
            },
            include: {
                attendances: {
                    where: {
                        timestamp: {
                            gte: today
                        }
                    },
                    orderBy: { timestamp: 'desc' },
                    take: 1
                }
            }
        });

        if (students.length === 0) {
            return res.status(404).json({ error: "Santri tidak ditemukan. Pastikan NISN atau Nama benar." });
        }

        const results = students.map(s => ({
            name: s.name,
            class: s.class,
            attendance: s.attendances.length > 0 ? s.attendances[0] : null
        }));

        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Terjadi kesalahan server" });
    }
});

// Endpoint data absensi lengkap
app.get('/api/dashboard/attendances', async (req, res) => {
    try {
        const attendances = await prisma.attendance.findMany({
            include: { student: true },
            orderBy: { timestamp: 'desc' },
            take: 100
        });
        
        const formatted = attendances.map(a => ({
            id: a.id,
            name: a.student.name,
            nisn: a.student.nisn,
            class: a.student.class,
            qr_code: a.student.qr_code,
            timestamp: a.timestamp
        }));
        
        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: "Gagal mengambil data absensi" });
    }
});

// Endpoint data guru
app.get('/api/dashboard/teachers', async (req, res) => {
    try {
        const teachers = await prisma.teacher.findMany({
            orderBy: { updatedAt: 'desc' }
        });
        res.json(teachers);
    } catch (error) {
        res.status(500).json({ error: "Gagal mengambil data guru" });
    }
});

// Endpoint tambah guru
app.post('/api/dashboard/teachers', async (req, res) => {
    const { name, nip, role } = req.body;
    
    if (!name || !nip || !role) {
        return res.status(400).json({ error: "Nama, NIP, dan Jabatan harus diisi" });
    }

    try {
        const newTeacher = await prisma.teacher.create({
            data: {
                name,
                nip,
                role,
                qr_code: nip
            }
        });
        res.json({ success: true, teacher: newTeacher });
    } catch (error) {
        console.error("Gagal tambah guru:", error);
        res.status(500).json({ error: "Gagal menambah guru (mungkin NIP sudah terdaftar)" });
    }
});

// Endpoint hapus guru
app.delete('/api/dashboard/teachers/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.teacher.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Gagal menghapus guru" });
    }
});

// Endpoint edit guru
app.put('/api/dashboard/teachers/:id', async (req, res) => {
    const { id } = req.params;
    const { name, nip, role } = req.body;
    try {
        const teacher = await prisma.teacher.update({
            where: { id },
            data: { name, nip, role, qr_code: nip }
        });
        res.json({ success: true, teacher });
    } catch (error) {
        res.status(500).json({ error: "Gagal memperbarui data guru" });
    }
});

// Endpoint import guru dari excel
app.post('/api/dashboard/teachers/import', async (req, res) => {
    const { teachers } = req.body;
    
    if (!teachers || !Array.isArray(teachers)) {
        return res.status(400).json({ error: "Data guru tidak valid" });
    }

    try {
        const dataToInsert = teachers.map(t => ({
            name: t.name,
            nip: String(t.nip),
            role: t.role,
            qr_code: String(t.nip)
        }));

        // Insert data ke database, skip yang duplikat (NIP sama)
        const result = await prisma.teacher.createMany({
            data: dataToInsert,
            skipDuplicates: true
        });

        res.json({ success: true, count: result.count });
    } catch (error) {
        console.error("Gagal import guru:", error);
        res.status(500).json({ error: "Gagal mengimport data guru." });
    }
});

// Endpoint: Status Koneksi WhatsApp
app.get('/api/wa/status', (req, res) => {
    res.json(getWhatsAppStatus());
});

// Fungsi Backup Data Otomatis
const backupData = async () => {
    try {
        const students = await prisma.student.findMany();
        const backupPath = path.join(__dirname, 'backup_students.json');
        fs.writeFileSync(backupPath, JSON.stringify(students, null, 2));
        console.log(`✅ Backup otomatis berhasil disimpan ke ${backupPath}`);
    } catch (error) {
        console.error("❌ Gagal melakukan backup otomatis:", error);
    }
};

// Jalankan server
app.listen(port, async () => {
    console.log(`🚀 Backend API berjalan di http://localhost:${port}`);
    await backupData();

    // ── Inisialisasi Layanan WhatsApp ──────────────────────────────────
    const waEnabled = process.env.WA_ENABLED !== 'false';
    if (waEnabled) {
        console.log('📱 Memulai layanan notifikasi WhatsApp...');
        connectWhatsApp();
    } else {
        console.log('📵 Notifikasi WhatsApp dinonaktifkan (WA_ENABLED=false di .env)');
    }
    // ──────────────────────────────────────────────────────────────────
});
