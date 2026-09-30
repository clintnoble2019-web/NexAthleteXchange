import { prisma } from "@/lib/prisma";

export async function providerIdentityVerified(userId: string) {
  const enrollment = await prisma.realEnrollment.findUnique({ where: { userId } });
  return Boolean(
    enrollment &&
    enrollment.environment === "SANDBOX" &&
    enrollment.status === "VERIFIED" &&
    enrollment.providerRef?.startsWith("persona:"),
  );
}

export async function assertProviderIdentityVerified(userId: string) {
  if (!(await providerIdentityVerified(userId))) {
    throw new Error("Complete Persona identity verification before using provider funding.");
  }
}
