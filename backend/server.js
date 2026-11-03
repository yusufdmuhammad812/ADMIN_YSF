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

// Helper untuk sanitasi nomor WhatsApp/telepon
const sanitizePhoneNumber = (phone) => {
    if (!phone) return "";
    let clean = String(phone).replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) {
        clean = '62' + clean.slice(1);
    }
    if (clean.length > 0 && !clean.startsWith('62')) {
        if (clean.startsWith('8')) {
            clean = '62' + clean;
        }
    }
    return clean;
};

// Helper evaluasi status kehadiran: Batas maksimal absensi tepat waktu adalah 07:15:00 WIB
const getAttendanceStatus = (timestamp, type = 'SISWA') => {
    if (!timestamp) return 'TIDAK ABSEN';

    const date = new Date(timestamp);
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jakarta',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
    });
    const parts = formatter.formatToParts(date);
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || 0, 10);
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || 0, 10);
    const second = parseInt(parts.find(p => p.type === 'second')?.value || 0, 10);

    // Batas maksimal absen tepat waktu: 07:15:00 WIB
    // Jika melebihi batas 07:15:00 WIB maka dinyatakan TERLAMBAT
    const isLate = (hour > 7) || (hour === 7 && (minute > 15 || (minute === 15 && second > 0)));
    return isLate ? 'TERLAMBAT' : 'TEPAT WAKTU';
};

app.use(cors());
app.use(express.json());

// API Endpoint untuk scan QR
app.post('/api/scan', async (req, res) => {
    const { qr_code } = req.body;

    if (!qr_code) {
        return res.status(400).json({ error: "QR code is required" });
    }

    try {
        const cleanCode = qr_code.trim();
        const noLeadingZeros = cleanCode.replace(/^0+/, '');

        // 1. Cari siswa berdasarkan qr_code, nisn, atau id (dengan toleransi leading zeros)
        let student = await prisma.student.findFirst({
            where: {
                OR: [
                    { qr_code: cleanCode },
                    { nisn: cleanCode },
                    { qr_code: noLeadingZeros },
                    { nisn: noLeadingZeros },
                    { id: cleanCode }
                ]
            }
        });

        if (!student && noLeadingZeros) {
            student = await prisma.student.findFirst({
                where: {
                    OR: [
                        { qr_code: { contains: noLeadingZeros } },
                        { nisn: { contains: noLeadingZeros } }
                    ]
                }
            });
        }

        if (student) {
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
                const existingStatus = getAttendanceStatus(existingAttendance.timestamp, 'SISWA');
                return res.json({
                    success: true,
                    alreadyScanned: true,
                    type: 'student',
                    status: existingStatus,
                    isLate: existingStatus === 'TERLAMBAT',
                    attendance: {
                        id: existingAttendance.id,
                        timestamp: existingAttendance.timestamp
                    },
                    student: {
                        name: student.name,
                        nisn: student.nisn,
                        class: student.class
                    }
                });
            }

            // Simpan absensi baru jika belum ada hari ini
            const newAttendance = await prisma.attendance.create({
                data: {
                    studentId: student.id
                }
            });

            const status = getAttendanceStatus(newAttendance.timestamp, 'SISWA');

            // Kirim notifikasi WhatsApp ke orang tua
            const waEnabled = process.env.WA_ENABLED !== 'false';
            if (waEnabled && student.parent_phone) {
                const pesan = buildAttendanceMessage(
                    student.name,
                    student.class,
                    student.nisn,
                    newAttendance.timestamp,
                    status
                );
                sendWhatsAppMessage(student.parent_phone, pesan)
                    .then(result => {
                        if (result.success) {
                            console.log(`📱 Notif WA (${status}) terkirim ke ortu ${student.name} (${student.parent_phone})`);
                        } else {
                            console.warn(`⚠️  Notif WA gagal untuk ${student.name}: ${result.reason}`);
                        }
                    })
                    .catch(err => console.error('WA send error:', err));
            }

            return res.json({
                success: true,
                alreadyScanned: false,
                type: 'student',
                status,
                isLate: status === 'TERLAMBAT',
                attendance: {
                    id: newAttendance.id,
                    timestamp: newAttendance.timestamp
                },
                student: {
                    name: student.name,
                    nisn: student.nisn,
                    class: student.class
                }
            });
        }

        // 2. Jika tidak ditemukan sebagai siswa, cari sebagai Guru/Staff!
        let teacher = await prisma.teacher.findFirst({
            where: {
                OR: [
                    { qr_code: cleanCode },
                    { nip: cleanCode },
                    { qr_code: noLeadingZeros },
                    { nip: noLeadingZeros },
                    { id: cleanCode }
                ]
            }
        });

        if (!teacher && noLeadingZeros) {
            teacher = await prisma.teacher.findFirst({
                where: {
                    OR: [
                        { qr_code: { contains: noLeadingZeros } },
                        { nip: { contains: noLeadingZeros } }
                    ]
                }
            });
        }

        if (teacher) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Cek apakah sudah absen hari ini
            const existingTeacherAttendance = await prisma.teacherAttendance.findFirst({
                where: {
                    teacherId: teacher.id,
                    timestamp: {
                        gte: today
                    }
                }
            });

            if (existingTeacherAttendance) {
                return res.json({
                    success: true,
                    alreadyScanned: true,
                    type: 'teacher',
                    attendance: {
                        id: existingTeacherAttendance.id,
                        timestamp: existingTeacherAttendance.timestamp
                    },
                    teacher: {
                        name: teacher.name,
                        nip: teacher.nip,
                        role: teacher.role
                    }
                });
            }

            // Simpan absensi guru baru
            const newTeacherAttendance = await prisma.teacherAttendance.create({
                data: {
                    teacherId: teacher.id
                }
            });

            // Kirim notifikasi WhatsApp ke nomor yang terdaftar
            const waEnabled = process.env.WA_ENABLED !== 'false';
            const teacherPhone = teacher.parent_phone || '62895326243945';
            if (waEnabled && teacherPhone) {
                const now = new Date(newTeacherAttendance.timestamp);
                const tanggal = now.toLocaleDateString('id-ID', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                });
                const jam = now.toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                }).replace(/\./g, ':');
                const ms = String(now.getMilliseconds()).padStart(3, '0');

                const pesan =
                    `` +
                    `🕌 *ABSENSI GURU & STAFF*\n` +
                    `Pesantren Hidayatut Tholibin\n\n` +
                    `✅ *${teacher.name}* (${teacher.role}) telah hadir\n` +
                    `🆔 NIP: ${teacher.nip}\n` +
                    `📅 ${tanggal}\n` +
                    `🕐 Waktu Presisi: *${jam}.${ms} WIB*\n\n` +
                    `_Pesan otomatis dari Sistem E-Absensi_`;

                sendWhatsAppMessage(teacherPhone, pesan)
                    .then(result => {
                        if (result.success) {
                            console.log(`📱 Notif WA absensi guru terkirim ke ${teacherPhone}`);
                        } else {
                            console.warn(`⚠️  Notif WA guru gagal: ${result.reason}`);
                        }
                    })
                    .catch(err => console.error('WA send error:', err));
            }

            return res.json({
                success: true,
                alreadyScanned: false,
                type: 'teacher',
                attendance: {
                    id: newTeacherAttendance.id,
                    timestamp: newTeacherAttendance.timestamp
                },
                teacher: {
                    name: teacher.name,
                    nip: teacher.nip,
                    role: teacher.role
                }
            });
        }

        // 3. Jika tidak ditemukan di keduanya
        return res.status(404).json({ error: "Data siswa/guru tidak ditemukan" });

    } catch (error) {
        console.error("Error saat proses absensi:", error);
        return res.status(500).json({ error: "Terjadi kesalahan internal server" });
    }
});

// Endpoint untuk Dashboard
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const totalStudents = await prisma.student.count();
        const totalTeachers = await prisma.teacher.count();

        // Menghitung siswa hadir hari ini
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const todayStudentAttendances = await prisma.attendance.findMany({
            where: {
                timestamp: {
                    gte: startOfDay
                }
            },
            select: {
                studentId: true,
                timestamp: true
            }
        });

        // Deduplikasi kehadiran unik per siswa hari ini
        const firstScanMap = new Map();
        for (const a of todayStudentAttendances) {
            if (!firstScanMap.has(a.studentId) || new Date(a.timestamp) < new Date(firstScanMap.get(a.studentId).timestamp)) {
                firstScanMap.set(a.studentId, a);
            }
        }

        const presentToday = firstScanMap.size;
        const absentToday = Math.max(0, totalStudents - presentToday);

        // Hitung siswa terlambat (> 07:15) dan tepat waktu (<= 07:15)
        let lateToday = 0;
        let onTimeToday = 0;
        for (const scan of firstScanMap.values()) {
            const status = getAttendanceStatus(scan.timestamp, 'SISWA');
            if (status === 'TERLAMBAT') {
                lateToday++;
            } else {
                onTimeToday++;
            }
        }

        // Menghitung guru hadir hari ini
        const teacherAttendancesToday = await prisma.teacherAttendance.count({
            where: {
                timestamp: {
                    gte: startOfDay
                }
            }
        });

        // Data grafik 7 hari terakhir (gabungan siswa dan guru)
        const chartData = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const studentCount = await prisma.attendance.count({
                where: {
                    timestamp: {
                        gte: date,
                        lt: nextDate
                    }
                }
            });

            chartData.push({
                name: date.toLocaleDateString('id-ID', { weekday: 'short' }),
                hadir: studentCount
            });
        }

        return res.json({
            totalStudents,
            totalTeachers,
            presentToday,
            absentToday,
            lateToday,
            onTimeToday,
            teachersPresentToday: teacherAttendancesToday,
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

    if (!name || !nisn || !className) {
        return res.status(400).json({ error: "Nama, NISN, dan Kelas harus diisi" });
    }

    const cleanPhone = sanitizePhoneNumber(parentPhone || "6283148100602");

    try {
        const newStudent = await prisma.student.create({
            data: {
                name: String(name).trim(),
                nisn: String(nisn).trim(),
                class: String(className).trim(),
                qr_code: String(nisn).trim(),
                parent_name: parentName ? String(parentName).trim() : "",
                parent_phone: cleanPhone
            }
        });
        res.json({ success: true, student: newStudent });
    } catch (error) {
        console.error("Gagal tambah siswa:", error);
        res.status(500).json({ error: "Gagal menambah siswa (mungkin NISN/QR Code sudah terdaftar)" });
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

    if (!name || !nisn || !className) {
        return res.status(400).json({ error: "Nama, NISN, dan Kelas harus diisi" });
    }

    const cleanPhone = sanitizePhoneNumber(parent_phone || "6283148100602");

    try {
        const student = await prisma.student.update({
            where: { id },
            data: {
                name: String(name).trim(),
                nisn: String(nisn).trim(),
                class: String(className).trim(),
                qr_code: String(nisn).trim(),
                parent_name: parent_name ? String(parent_name).trim() : "",
                parent_phone: cleanPhone
            }
        });
        res.json({ success: true, student });
    } catch (error) {
        console.error(`Gagal memperbarui data siswa ID ${id}:`, error);
        res.status(500).json({ error: "Gagal memperbarui data siswa (mungkin NISN/QR Code berkonflik dengan siswa lain)" });
    }
});

// Endpoint import siswa dari excel
app.post('/api/dashboard/students/import', async (req, res) => {
    const { students } = req.body;

    if (!students || !Array.isArray(students)) {
        return res.status(400).json({ error: "Data siswa tidak valid" });
    }

    try {
        // Lakukan deduplikasi NISN dalam batch yang sama sebelum masuk database
        const uniqueStudentsMap = new Map();
        for (const s of students) {
            const name = s.name || s.Name || s.nama || s.Nama;
            const nisn = s.nisn || s.Nisn || s.NISN || s.nis || s.Nis || s.NIS;
            if (name && nisn) {
                const cleanNisn = String(nisn).trim();
                const className = s.className || s.class || s.Class || s.kelas || s.Kelas || "";
                const parentName = s.parentName || s.ParentName || s.nama_ortu || s.Nama_Ortu || s.wali || s.Wali || "";
                const parentPhone = s.parentPhone || s.ParentPhone || s.no_wa || s.No_Wa || s.No_WA || s.no_WA || s.parent_phone || "6283148100602";

                uniqueStudentsMap.set(cleanNisn, {
                    name: String(name).trim(),
                    nisn: cleanNisn,
                    class: String(className).trim(),
                    qr_code: cleanNisn,
                    parent_name: String(parentName).trim(),
                    parent_phone: sanitizePhoneNumber(parentPhone) || "6283148100602"
                });
            }
        }

        const dataToInsert = Array.from(uniqueStudentsMap.values());

        if (dataToInsert.length === 0) {
            return res.status(400).json({ error: "Tidak ada data siswa valid untuk diimport." });
        }

        // Insert data ke database, skip yang duplikat (NISN sama di database)
        const result = await prisma.student.createMany({
            data: dataToInsert,
            skipDuplicates: true
        });

        res.json({ success: true, count: result.count });
    } catch (error) {
        console.error("Gagal import siswa:", error);
        res.status(500).json({ error: "Gagal mengimport data siswa karena kesalahan database." });
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

// Endpoint cek mandiri wali murid (Pakai Nomor HP Orang Tua dan Nama Siswa)
app.post('/api/parent/check-secure', async (req, res) => {
    const { parentPhone, studentName } = req.body;

    if (!parentPhone || !studentName) {
        return res.status(400).json({ error: "Nomor HP Orang Tua dan Nama Siswa wajib diisi." });
    }

    // Bersihkan nomor HP agar konsisten (misal hilangkan +, spasi, dll, atau ubah 08 ke 628)
    let cleanPhone = parentPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
        cleanPhone = '62' + cleanPhone.slice(1);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
        // Cari siswa yang nomor HP orang tuanya cocok DAN namanya mengandung input nama siswa
        const students = await prisma.student.findMany({
            where: {
                name: { contains: studentName, mode: 'insensitive' },
                OR: [
                    { parent_phone: cleanPhone },
                    { parent_phone: parentPhone },
                    { parent_phone: { contains: cleanPhone } }
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
            return res.status(404).json({ error: "Siswa tidak ditemukan. Pastikan No. HP Orang Tua dan Nama Siswa sudah sesuai dengan data sekolah." });
        }

        const results = students.map(s => ({
            name: s.name,
            class: s.class,
            nisn: s.nisn,
            attendance: s.attendances.length > 0 ? s.attendances[0] : null
        }));

        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Terjadi kesalahan server" });
    }
});

// Endpoint data absensi lengkap (Menggabungkan Siswa dan Guru)
app.get('/api/dashboard/attendances', async (req, res) => {
    try {
        const studentAttendances = await prisma.attendance.findMany({
            include: { student: true },
            orderBy: { timestamp: 'desc' },
            take: 50
        });

        const teacherAttendances = await prisma.teacherAttendance.findMany({
            include: { teacher: true },
            orderBy: { timestamp: 'desc' },
            take: 50
        });

        const formattedStudents = studentAttendances.map(a => ({
            id: a.id,
            name: a.student.name,
            nisn: a.student.nisn,
            class: a.student.class,
            qr_code: a.student.qr_code,
            timestamp: a.timestamp,
            type: 'SISWA',
            status: getAttendanceStatus(a.timestamp, 'SISWA')
        }));

        const formattedTeachers = teacherAttendances.map(a => ({
            id: a.id,
            name: a.teacher.name,
            nisn: a.teacher.nip,
            class: a.teacher.role,
            qr_code: a.teacher.qr_code,
            timestamp: a.timestamp,
            type: 'GURU',
            status: getAttendanceStatus(a.timestamp, 'GURU')
        }));

        const combined = [...formattedStudents, ...formattedTeachers]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 100);

        res.json(combined);
    } catch (error) {
        console.error("Gagal mengambil data absensi lengkap:", error);
        res.status(500).json({ error: "Gagal mengambil data absensi" });
    }
});

// Endpoint untuk menghapus seluruh data absensi HARI INI (agar siswa bisa dicoba/scan ulang)
app.delete('/api/dashboard/attendances/today', async (req, res) => {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const deletedStudents = await prisma.attendance.deleteMany({
            where: {
                timestamp: {
                    gte: startOfDay
                }
            }
        });

        const deletedTeachers = await prisma.teacherAttendance.deleteMany({
            where: {
                timestamp: {
                    gte: startOfDay
                }
            }
        });

        console.log(`[RESET ABSENSI] ${deletedStudents.count} absensi siswa dan ${deletedTeachers.count} absensi guru hari ini telah dihapus untuk uji coba ulang.`);

        res.json({
            success: true,
            message: "Data absensi hari ini berhasil dikosongkan. Siswa dapat melakukan scan ulang untuk uji coba.",
            deletedStudentsCount: deletedStudents.count,
            deletedTeachersCount: deletedTeachers.count
        });
    } catch (error) {
        console.error("Gagal menghapus absensi hari ini:", error);
        res.status(500).json({ error: "Gagal menghapus data absensi hari ini" });
    }
});

// Endpoint untuk menghapus satu record absensi berdasarkan ID
app.delete('/api/dashboard/attendances/:id', async (req, res) => {
    try {
        const { id } = req.params;
        try {
            await prisma.attendance.delete({
                where: { id }
            });
            return res.json({ success: true, message: "Data absensi siswa berhasil dihapus" });
        } catch (err) {
            await prisma.teacherAttendance.delete({
                where: { id }
            });
            return res.json({ success: true, message: "Data absensi guru berhasil dihapus" });
        }
    } catch (error) {
        console.error("Gagal menghapus record absensi:", error);
        res.status(500).json({ error: "Gagal menghapus record absensi" });
    }
});

// Endpoint data siswa yang belum absen / tidak absen hari ini
app.get('/api/dashboard/absent-today', async (req, res) => {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        // Ambil ID siswa yang sudah scan hari ini
        const todayAttendances = await prisma.attendance.findMany({
            where: {
                timestamp: {
                    gte: startOfDay
                }
            },
            select: { studentId: true }
        });

        const attendedStudentIds = [...new Set(todayAttendances.map(a => a.studentId))];

        // Cari siswa yang belum absen hari ini
        const absentStudents = await prisma.student.findMany({
            where: {
                id: {
                    notIn: attendedStudentIds
                }
            },
            orderBy: [
                { class: 'asc' },
                { name: 'asc' }
            ]
        });

        const formatted = absentStudents.map(s => ({
            id: `ABSENT-${s.id}`,
            studentId: s.id,
            name: s.name,
            nisn: s.nisn,
            class: s.class,
            qr_code: s.qr_code,
            timestamp: null,
            type: 'SISWA',
            status: 'TIDAK ABSEN'
        }));

        res.json(formatted);
    } catch (error) {
        console.error("Gagal mengambil data siswa tidak absen hari ini:", error);
        res.status(500).json({ error: "Gagal mengambil data siswa tidak absen" });
    }
});

// Endpoint data absensi guru lengkap
app.get('/api/dashboard/teacher-attendances', async (req, res) => {
    try {
        const attendances = await prisma.teacherAttendance.findMany({
            include: { teacher: true },
            orderBy: { timestamp: 'desc' },
            take: 100
        });

        const formatted = attendances.map(a => ({
            id: a.id,
            name: a.teacher.name,
            nisn: a.teacher.nip,
            class: a.teacher.role,
            qr_code: a.teacher.qr_code,
            timestamp: a.timestamp,
            type: 'GURU'
        }));

        res.json(formatted);
    } catch (error) {
        console.error("Gagal mengambil data absensi guru:", error);
        res.status(500).json({ error: "Gagal mengambil data absensi guru" });
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
                name: String(name).trim(),
                nip: String(nip).trim(),
                role: String(role).trim(),
                qr_code: String(nip).trim()
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

    if (!name || !nip || !role) {
        return res.status(400).json({ error: "Nama, NIP, dan Jabatan harus diisi" });
    }

    try {
        const teacher = await prisma.teacher.update({
            where: { id },
            data: {
                name: String(name).trim(),
                nip: String(nip).trim(),
                role: String(role).trim(),
                qr_code: String(nip).trim()
            }
        });
        res.json({ success: true, teacher });
    } catch (error) {
        console.error(`Gagal memperbarui data guru ID ${id}:`, error);
        res.status(500).json({ error: "Gagal memperbarui data guru (mungkin NIP/QR Code berkonflik dengan guru lain)" });
    }
});

// Endpoint import guru dari excel
app.post('/api/dashboard/teachers/import', async (req, res) => {
    const { teachers } = req.body;

    if (!teachers || !Array.isArray(teachers)) {
        return res.status(400).json({ error: "Data guru tidak valid" });
    }

    try {
        // Lakukan deduplikasi NIP dalam batch yang sama sebelum masuk database
        const uniqueTeachersMap = new Map();
        for (const t of teachers) {
            const name = t.name || t.Name || t.nama || t.Nama;
            const nip = t.nip || t.Nip || t.NIP || t.nip_guru;
            const role = t.role || t.Role || t.jabatan || t.Jabatan || t.kategori || t.Kategori || "Guru Mapel";

            if (name && nip) {
                const cleanNip = String(nip).trim();
                uniqueTeachersMap.set(cleanNip, {
                    name: String(name).trim(),
                    nip: cleanNip,
                    role: String(role).trim(),
                    qr_code: cleanNip
                });
            }
        }

        const dataToInsert = Array.from(uniqueTeachersMap.values());

        if (dataToInsert.length === 0) {
            return res.status(400).json({ error: "Tidak ada data guru valid untuk diimport." });
        }

        // Insert data ke database, skip yang duplikat (NIP sama di database)
        const result = await prisma.teacher.createMany({
            data: dataToInsert,
            skipDuplicates: true
        });

        res.json({ success: true, count: result.count });
    } catch (error) {
        console.error("Gagal import guru:", error);
        res.status(500).json({ error: "Gagal mengimport data guru karena kesalahan database." });
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
