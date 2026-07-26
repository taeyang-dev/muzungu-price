import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env") });

const ADMIN_EMAIL = "admin@muzunguprice.com";
const ADMIN_PASSWORD = "admin1234";

const connectionString =
  process.env.DIRECT_URL?.trim() ||
  process.env.DATABASE_URL?.trim() ||
  "postgresql://postgres:postgres@localhost:5432/muzungu_price?schema=public";

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  if (!process.env.DATABASE_URL?.trim() && !process.env.DIRECT_URL?.trim()) {
    console.warn(
      "Warning: DATABASE_URL/DIRECT_URL not set. Using local fallback DB. For Vercel login, copy env vars from Vercel into .env first."
    );
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      name: "Muzungu Admin",
      role: "admin",
      passwordHash
    },
    create: {
      email: ADMIN_EMAIL,
      name: "Muzungu Admin",
      role: "admin",
      passwordHash
    }
  });

  console.log("Admin account is ready.");
  console.log(`Email: ${admin.email}`);
  console.log(`Password: ${ADMIN_PASSWORD}`);
  console.log("Open /auth to log in, then visit /admin.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
