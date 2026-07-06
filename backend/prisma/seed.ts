import { PrismaClient, Role, TaskStatus, Priority } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean up existing data
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin@123', 12);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@tasktracker.com',
      password: adminPassword,
      name: 'Admin User',
      role: Role.ADMIN,
    },
  });

  // Create regular user
  const userPassword = await bcrypt.hash('User@123', 12);
  const user = await prisma.user.create({
    data: {
      email: 'user@tasktracker.com',
      password: userPassword,
      name: 'John Doe',
      role: Role.USER,
    },
  });

  // Create sample tasks for regular user
  await prisma.task.createMany({
    data: [
      {
        title: 'Set up project repository',
        description: 'Initialize git repo and configure CI/CD pipeline',
        status: TaskStatus.DONE,
        priority: Priority.HIGH,
        userId: user.id,
      },
      {
        title: 'Design database schema',
        description: 'Create entity relationship diagram and finalize schema',
        status: TaskStatus.DONE,
        priority: Priority.HIGH,
        userId: user.id,
      },
      {
        title: 'Implement authentication API',
        description: 'Build JWT-based auth with register and login endpoints',
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.HIGH,
        userId: user.id,
      },
      {
        title: 'Write unit tests',
        description: 'Add test coverage for all service methods',
        status: TaskStatus.TODO,
        priority: Priority.MEDIUM,
        userId: user.id,
      },
      {
        title: 'Deploy to production',
        description: 'Configure production environment and deploy application',
        status: TaskStatus.TODO,
        priority: Priority.LOW,
        userId: user.id,
      },
    ],
  });

  // Create sample tasks for admin
  await prisma.task.createMany({
    data: [
      {
        title: 'Review all user tasks',
        description: 'Audit and review all tasks in the system',
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.HIGH,
        userId: admin.id,
      },
      {
        title: 'Generate monthly report',
        description: 'Compile task completion statistics for Q1',
        status: TaskStatus.TODO,
        priority: Priority.MEDIUM,
        userId: admin.id,
      },
    ],
  });

  console.log('✅ Database seeded successfully!');
  console.log('\n📋 Seed credentials:');
  console.log('  Admin: admin@tasktracker.com / Admin@123');
  console.log('  User:  user@tasktracker.com  / User@123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
