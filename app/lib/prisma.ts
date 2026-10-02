import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "~/generated/prisma/client";

let prisma: PrismaClient;

const poolConfig: pg.PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
};

if (process.env.NODE_ENV === "production") {
  const pool = new pg.Pool(poolConfig);
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter, log: ["error", "warn"] });
} else {
  if (!global.prisma) {
    const pool = new pg.Pool(poolConfig);
    const adapter = new PrismaPg(pool);
    global.prisma = new PrismaClient({ adapter, log: ["error", "warn"] });
  }
  prisma = global.prisma;
}

export default prisma;
