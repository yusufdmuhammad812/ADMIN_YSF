const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding dummy data...");

  const students = [
    { name: 'ADIAS FERDIAN NAWAWI', nisn: '0126450562', class: '8A' },
    { name: 'ADINDA RAHMAWATI', nisn: '0138131948', class: '7A' },
    { name: 'AGUNG FATHEKHA', nisn: '0086704048', class: '9A' },
    { name: 'ALDI MULFAIS', nisn: '0121071622', class: '7A' },
    { name: 'ALIF NAZRIL ILHAM', nisn: '0119206434', class: '9A' },
    { name: 'Aqila Khesia Marella', nisn: '3120591379', class: '8A' },
    { name: 'ARILIN AFRILIANI', nisn: '0122961005', class: '8A' },
    { name: 'DEO MALO', nisn: '0116618791', class: '9A' },
    { name: 'IKHSANNUDIN', nisn: '0113676385', class: '8A' },
    { name: 'INDI ROHENI', nisn: '0124143291', class: '8A' },
    { name: 'KADMINAH', nisn: '3116143874', class: '8A' },
    { name: 'MAULANA ABU HUDZAIFAH', nisn: '3126703320', class: '8A' },
    { name: 'MAULANA SIDIQ', nisn: '3134583984', class: '7A' },
    { name: 'MOH SYAFIQ ULINUHA', nisn: '3129434529', class: '7A' },
    { name: 'MUHAMAD ABIL WAFA', nisn: '0092673953', class: '8A' },
    { name: 'MUHAMMAD AFRIZAL', nisn: '3134592846', class: '7A' },
    { name: 'Muhammad Fardana', nisn: '0097520114', class: '9A' },
    { name: 'MUHAMMAD KHAIDAR AL\'AZIZ', nisn: '3136450044', class: '7A' },
    { name: 'MUHAMMAD NGUBAIDURROKHMAN', nisn: '0158365299', class: '7A' },
    { name: 'NADIF ASSATIBI', nisn: '0144594142', class: '7A' },
    { name: 'NAZLAH SIBRIYAH', nisn: '0106717224', class: '9A' },
    { name: 'NURLAELA', nisn: '3125061971', class: '7A' },
    { name: 'NURLAELI', nisn: '3131753491', class: '7A' },
    { name: 'NURSUCI', nisn: '0125307770', class: '7A' },
    { name: 'PUPUT MELATI', nisn: '0122918934', class: '9A' },
    { name: 'RAFAEL', nisn: '0112214220', class: '8A' },
    { name: 'REVAN', nisn: '0087480354', class: '9A' },
    { name: 'RODHOTUL JANNAH', nisn: '3128755216', class: '7A' },
    { name: 'ROSITA', nisn: '3115633122', class: '7A' },
    { name: 'SAFIRA KIREINA NAWAWI', nisn: '3147905878', class: '7A' },
    { name: 'Satriya Ade Ros Saputra', nisn: '0104976945', class: '8A' },
    { name: 'SELVIA', nisn: '0088884410', class: '9A' },
    { name: 'SINTIYANI', nisn: '0099313457', class: '8A' },
    { name: 'SUBKHI HIDAYAT', nisn: '3135246176', class: '7A' },
    { name: 'YOSIPATUL DWI ARIYANTO', nisn: '0099777724', class: '8A' },
    { name: 'YUDHISTIRA RAMADHAN', nisn: '0138805947', class: '7A' },
    { name: 'YUSUP INDRAWAN', nisn: '0105019396', class: '9A' }
  ];

  for (const s of students) {
    await prisma.student.upsert({
      where: { nisn: s.nisn },
      update: {
        name: s.name,
        class: s.class,
        qr_code: s.nisn,
      },
      create: {
        name: s.name,
        nisn: s.nisn,
        class: s.class,
        qr_code: s.nisn,
        parent_phone: '6283148100602', // Menggunakan nomor default
      },
    });
  }

  console.log(`Seeding ${students.length} data siswa selesai!`);

  const teachers = [
    { name: 'Aris Hidayat, S. Pd', role: 'Tendik', nip: 'T-001' },
    { name: 'Imayyah, S. Pdi', role: 'Guru', nip: 'G-001' },
    { name: 'Siti Sarah, S. Pd', role: 'Guru', nip: 'G-002' },
    { name: 'Siti Hidayatul Ida, S. Ag', role: 'Guru', nip: 'G-003' },
    { name: 'Rismawati, S. Pd', role: 'Guru', nip: 'G-004' },
    { name: 'Mufatikhah, S. Pd', role: 'Guru', nip: 'G-005' },
    { name: 'Wahyu Bontot, S. Kom', role: 'Staff (Operator)', nip: 'S-001' },
    { name: 'Muhammad Yusuf, S. Kom', role: 'Staff (Bendahara)', nip: 'S-002' },
    { name: 'M. Muroji Hibrom, S. Pdi', role: 'Staff (Kurikulum)', nip: 'S-003' }
  ];

  for (const t of teachers) {
    await prisma.teacher.upsert({
      where: { nip: t.nip },
      update: {
        name: t.name,
        role: t.role,
        qr_code: t.nip,
      },
      create: {
        name: t.name,
        nip: t.nip,
        role: t.role,
        qr_code: t.nip,
        parent_phone: '62895326243945', // Menggunakan nomor default
      },
    });
  }

  console.log(`Seeding ${teachers.length} data guru/personel selesai!`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
