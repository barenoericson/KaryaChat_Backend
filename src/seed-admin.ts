import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User, UserRole } from './users/user.entity';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [User],
  synchronize: false,
});

async function seedAdmin() {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(User);

  const email = 'admin@codemate.com';
  const existing = await repo.findOne({ where: { email } });
  if (existing) {
    console.log('Admin account already exists:', email);
    await AppDataSource.destroy();
    return;
  }

  const hashed = await bcrypt.hash('Admin@1234', 10);
  const admin = repo.create({
    email,
    password: hashed,
    username: 'Admin',
    role: UserRole.ADMIN,
    isEmailVerified: true,
    emailVerificationToken: null,
  });

  await repo.save(admin);
  console.log('\n✅ Admin account created!');
  console.log('   Email   :', email);
  console.log('   Password: Admin@1234');
  console.log('   Role    : admin\n');

  await AppDataSource.destroy();
}

seedAdmin().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
