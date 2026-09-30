import { Prisma } from "@prisma/client";

export function publicError(error: unknown, fallback: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2034") return "The market is busy. Check your portfolio, then try again.";
    if (error.code === "P2002") return "This request has already been recorded.";
    return fallback;
  }
  if (error instanceof Prisma.PrismaClientInitializationError || error instanceof Prisma.PrismaClientUnknownRequestError || error instanceof Prisma.PrismaClientValidationError) return fallback;
  return error instanceof Error ? error.message.slice(0, 250) : fallback;
}
