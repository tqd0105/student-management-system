const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const passwordHash = await bcrypt.hash('Dungabc123@', 10);

  // 1. Create or update Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@lightbrave.edu.vn' },
    update: {
      password: passwordHash,
      isVerified: true,
      role: 'ADMIN',
    },
    create: {
      email: 'admin@lightbrave.edu.vn',
      name: 'System Administrator',
      password: passwordHash,
      role: 'ADMIN',
      isVerified: true,
    },
  });
  console.log('✅ Admin account ready:', admin.email);

  // 2. Create or update Teacher
  const teacher = await prisma.user.upsert({
    where: { email: 'tqd0105@gmail.com' },
    update: {
      password: passwordHash,
      isVerified: true,
      role: 'TEACHER',
    },
    create: {
      email: 'tqd0105@gmail.com',
      name: 'TRAN QUANG DUNG',
      password: passwordHash,
      role: 'TEACHER',
      isVerified: true,
    },
  });
  console.log('✅ Teacher account ready:', teacher.email);

  // 3. Create or update Student 1
  const student1 = await prisma.user.upsert({
    where: { email: 'dtq287@gmail.com' },
    update: {
      password: passwordHash,
      isVerified: true,
      role: 'STUDENT',
    },
    create: {
      email: 'dtq287@gmail.com',
      name: 'DUNG TRAN QUANG',
      password: passwordHash,
      role: 'STUDENT',
      isVerified: true,
    },
  });

  await prisma.studentProfile.upsert({
    where: { userId: student1.id },
    update: { studentCode: 'SV260001' },
    create: {
      userId: student1.id,
      studentCode: 'SV260001',
      phone: '0901234567',
      address: 'Hà Nội, Việt Nam',
    },
  });
  console.log('✅ Student 1 ready:', student1.email);

  // 4. Create or update Student 2
  const student2 = await prisma.user.upsert({
    where: { email: 'tranquangdung.tech@gmail.com' },
    update: {
      password: passwordHash,
      isVerified: true,
      role: 'STUDENT',
    },
    create: {
      email: 'tranquangdung.tech@gmail.com',
      name: 'DTECH',
      password: passwordHash,
      role: 'STUDENT',
      isVerified: true,
    },
  });

  await prisma.studentProfile.upsert({
    where: { userId: student2.id },
    update: { studentCode: 'SV260002' },
    create: {
      userId: student2.id,
      studentCode: 'SV260002',
      phone: '0912345678',
      address: 'Hà Nội, Việt Nam',
    },
  });
  console.log('✅ Student 2 ready:', student2.email);

  // 5. Create a sample Class taught by Teacher
  let sampleClass = await prisma.class.findFirst({
    where: { teacherId: teacher.id }
  });

  if (!sampleClass) {
    sampleClass = await prisma.class.create({
      data: {
        name: 'Lập Trình Web Nâng Cao (Full-Stack 2026)',
        description: 'Khóa học phát triển web hiện đại với React, Next.js, Node.js và PostgreSQL.',
        teacherId: teacher.id,
      }
    });
    console.log('✅ Sample Class created:', sampleClass.name);
  }

  // 6. Enroll both students into the class
  await prisma.classEnrollment.upsert({
    where: {
      studentId_classId: {
        studentId: student1.id,
        classId: sampleClass.id
      }
    },
    update: {},
    create: {
      studentId: student1.id,
      classId: sampleClass.id
    }
  });

  await prisma.classEnrollment.upsert({
    where: {
      studentId_classId: {
        studentId: student2.id,
        classId: sampleClass.id
      }
    },
    update: {},
    create: {
      studentId: student2.id,
      classId: sampleClass.id
    }
  });
  console.log('✅ Enrolled students into class');

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
