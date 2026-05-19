import { PrismaClient } from "@prisma/client";

declare global {
  var __autoigPrisma__: PrismaClient | undefined;
}

export const prisma =
  global.__autoigPrisma__ ??
  new PrismaClient({
    log: ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__autoigPrisma__ = prisma;
}
