const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('password123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@school.com' },
    update: {},
    create: {
      email: 'admin@school.com',
      password: hashedPassword,
      role: 'admin',
      firstName: 'Super',
      lastName: 'Admin',
      isActive: true
    }
  });
  console.log('✅ Created admin user:', admin.email);

  // Create teacher user
  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@school.com' },
    update: {},
    create: {
      email: 'teacher@school.com',
      password: hashedPassword,
      role: 'teacher',
      firstName: 'John',
      lastName: 'Teacher',
      isActive: true
    }
  });
  console.log('✅ Created teacher user:', teacher.email);

  // Create sample students
  const students = [];
  for (let i = 1; i <= 50; i++) {
    const student = await prisma.student.create({
      data: {
        admissionNumber: `STU${1000 + i}`,
        firstName: `Student${i}`,
        lastName: `LastName${i}`,
        status: 'active'
      }
    });
    students.push(student);
  }
  console.log(`✅ Created ${students.length} students`);

  // Create sample teachers
  const teachers = [];
  for (let i = 1; i <= 10; i++) {
    const teacher = await prisma.teacher.create({
      data: {
        employeeId: `EMP${100 + i}`,
        firstName: `Teacher${i}`,
        lastName: `LastName${i}`,
        status: 'active'
      }
    });
    teachers.push(teacher);
  }
  console.log(`✅ Created ${teachers.length} teachers`);

  // Create sample classes
  const classes = await prisma.class.createMany({
    data: [
      { name: 'Grade 1', section: 'A' },
      { name: 'Grade 1', section: 'B' },
      { name: 'Grade 2', section: 'A' },
      { name: 'Grade 2', section: 'B' },
      { name: 'Grade 3', section: 'A' },
      { name: 'Grade 3', section: 'B' },
      { name: 'Grade 4', section: 'A' },
      { name: 'Grade 4', section: 'B' },
      { name: 'Grade 5', section: 'A' },
      { name: 'Grade 5', section: 'B' },
    ]
  });
  console.log('✅ Created 10 classes');

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
