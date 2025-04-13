import { PrismaClient } from "@prisma/client";

const prisma = global.prisma || new PrismaClient({ log: ["error", "warn"] });
if (process.env.NODE_ENV === "development") global.prisma = prisma;

export default prisma;
