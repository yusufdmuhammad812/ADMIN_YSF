const { PrismaClient } = require('@prisma/client');

// Force local database URL for verification
process.env.DATABASE_URL = 'postgresql://openpg:openpgpwd@localhost:5432/absensi';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function main() {
  const studentsCount = await prisma.student.count();
  console.log(`Jumlah siswa di local DB: ${studentsCount}`);
  
  const teachersCount = await prisma.teacher.count();
  console.log(`Jumlah guru di local DB: ${teachersCount}`);
  
  const attendancesCount = await prisma.attendance.count();
  console.log(`Jumlah absensi di local DB: ${attendancesCount}`);
  
  if (studentsCount > 0) {
    const student = await prisma.student.findFirst();
    console.log('Contoh data siswa:', student);
  }
  
  if (teachersCount > 0) {
    const teacher = await prisma.teacher.findFirst();
    console.log('Contoh data guru:', teacher);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
  });
