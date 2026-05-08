const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const filePath = path.join(__dirname, '..', 'Data_Santri_Import.xlsx');
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  console.log(`Menyiapkan import ${data.length} data siswa...`);

  const students = data.map(s => ({
    name: String(s.Nama || '').trim(),
    nisn: String(s.NISN || '').trim(),
    class: String(s.Kelas || '').trim(),
    qr_code: String(s.NISN || '').trim(),
    parent_phone: String(s.No_WA || '6283148100602').trim()
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
