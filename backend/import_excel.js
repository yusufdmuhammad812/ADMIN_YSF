const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const path = require('path');

const fs = require('fs');

const prisma = new PrismaClient();

function sanitizePhoneNumber(phone) {
  if (!phone) return '6283148100602';
  let clean = String(phone).replace(/[^0-9]/g, '');
  if (clean.startsWith('0')) {
    clean = '62' + clean.slice(1);
  }
  if (clean.length > 0 && !clean.startsWith('62')) {
    if (clean.startsWith('8')) {
      clean = '62' + clean;
    }
  }
  return clean || '6283148100602';
}

async function main() {
  let filePath = path.join(__dirname, '..', 'Data_Santri_Import.xlsx');
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, '..', 'frontend', 'public', 'Data_Santri_Import.xlsx');
  }
  console.log(`Membaca file Excel dari: ${filePath}`);
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  console.log(`Menyiapkan import ${data.length} data siswa...`);

  const students = data.map(s => ({
    name: String(s.Nama || s.name || '').trim(),
    nisn: String(s.NISN || s.nisn || s.NIS || s.nis || '').trim(),
    class: String(s.Kelas || s.class || '').trim(),
    qr_code: String(s.NISN || s.nisn || s.NIS || s.nis || '').trim(),
    parent_phone: sanitizePhoneNumber(s.No_WA || s.no_wa || s.parent_phone)
  })).filter(s => s.name && s.nisn);

  let count = 0;
  for (const s of students) {
    await prisma.student.upsert({
      where: { nisn: s.nisn },
      update: {
        name: s.name,
        class: s.class,
        qr_code: s.qr_code,
        parent_phone: s.parent_phone
      },
      create: {
        name: s.name,
        nisn: s.nisn,
        class: s.class,
        qr_code: s.qr_code,
        parent_phone: s.parent_phone
      },
    });
    count++;
  }

  console.log(`✅ Berhasil mengimport/update ${count} data siswa!`);
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
