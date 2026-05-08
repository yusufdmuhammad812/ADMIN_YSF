const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.student.count();
  console.log(`Jumlah siswa di database: ${count}`);
  const firstStudent = await prisma.student.findFirst();
  console.log('Siswa pertama:', firstStudent);
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
