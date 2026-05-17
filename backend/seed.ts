import { createConnection } from 'typeorm';
import { Role } from './src/users/role.entity';
import { User } from './src/users/user.entity';
import * as bcrypt from 'bcrypt';

async function seed() {
  const connection = await createConnection();
  
  const roleRepo = connection.getRepository(Role);
  const userRepo = connection.getRepository(User);

  // Seed Roles
  const roles = [
    { name: 'ADMIN', permissions: { all: true } },
    { name: 'PIMPINAN', permissions: { view: true } },
    { name: 'STAFF', permissions: { manage: true } },
    { name: 'PPSU', permissions: { ppsu: true } },
  ];

  for (const r of roles) {
    const exists = await roleRepo.findOne({ where: { name: r.name } });
    if (!exists) {
      await roleRepo.save(roleRepo.create(r));
    }
  }

  // Seed Admin User
  const adminRole = await roleRepo.findOne({ where: { name: 'ADMIN' } });
  const adminExists = await userRepo.findOne({ where: { username: 'admin' } });
  
  if (!adminExists && adminRole) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await userRepo.save(userRepo.create({
      username: 'admin',
      password: hashedPassword,
      fullName: 'Super Administrator',
      role: adminRole,
      status: 'ACTIVE'
    }));
  }

  console.log('Seeding completed!');
  await connection.close();
}

seed().catch(err => console.error(err));
