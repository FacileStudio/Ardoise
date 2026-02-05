import { PrismaClient, User } from '@prisma/client';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { YAML } from "bun"; // Import Bun.YAML
import * as path from 'path'; // Keep path for path manipulation

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: ['error', 'warn'],
});

async function main() {
  console.log('Start seeding...');

  // Clear existing data (optional, but good for consistent development)
  await prisma.contact.deleteMany();
  await prisma.user.deleteMany();
  console.log('Cleared existing data.');

  const usersToCreate = 10;
  const usersForYaml: { email: string; password: string; role: string }[] = []; // Store user data for YAML
  const clearTextPassword = 'password123'; // Define the clear text password
  const hashedPassword = await bcrypt.hash(clearTextPassword, 10); // Hash a default password

  for (let i = 0; i < usersToCreate; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName }).toLowerCase();
    const role = i === 0 ? 'ADMIN' : 'USER';

    const user = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        password: hashedPassword,
        emailVerified: faker.datatype.boolean(),
        role: role, // Use the determined role
        isPremium: faker.datatype.boolean(),
        // Add other optional fields if desired, e.g.:
        // bannedAt: faker.datatype.boolean() ? faker.date.past() : null,
        // suspensionReason: faker.lorem.sentence(),
      },
    });
    usersForYaml.push({ email: user.email, password: clearTextPassword, role: role }); // Store for YAML
    console.log(`Created user with id: ${user.id} and email: ${user.email} with role ${user.role}`);
  }

  // Create Contacts
  const contactsToCreate = 5;
  for (let i = 0; i < contactsToCreate; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName }).toLowerCase();

    const contact = await prisma.contact.create({
      data: {
        email,
        firstName,
        lastName,
      },
    });
    console.log(`Created contact with id: ${contact.id} and email: ${contact.email}`);
  }

  // Write user logins to YAML file
  const yamlFilePath = path.join(__dirname, 'user_logins.yml');
  try {
    const yamlContent = YAML.stringify({ users: usersForYaml }, null, 2); // Use Bun.YAML.stringify with 2-space indentation
    await Bun.write(yamlFilePath, yamlContent); // Use Bun.write
    console.log(`User logins written to ${yamlFilePath}`);
  } catch (e) {
    console.error(`Failed to write YAML file: ${e}`);
  }

  console.log('Seeding finished.');
}

main()
  .catch(async (e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
