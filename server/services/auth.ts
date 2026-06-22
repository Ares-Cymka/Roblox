import { prisma } from "@/lib/prisma";
import { comparePassword } from "@/lib/auth";
import {
  signSessionCookie,
  verifySignedSessionCookie,
} from "@/lib/admin-session";

export async function verifyAdminCredentials(
  email: string,
  password: string
): Promise<{ valid: boolean; adminUserId?: string }> {
  const adminUser = await prisma.adminUser.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!adminUser?.isActive) {
    return { valid: false };
  }

  const valid = await comparePassword(password, adminUser.passwordHash);
  if (!valid) {
    return { valid: false };
  }

  return { valid: true, adminUserId: adminUser.id };
}

export async function createAdminSession(adminUserId: string): Promise<string> {
  const crypto = await import("crypto");
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.adminSession.create({
    data: {
      token,
      expiresAt,
      adminUserId,
    },
  });

  await prisma.adminUser.update({
    where: { id: adminUserId },
    data: { lastLoginAt: new Date() },
  });

  return signSessionCookie(token);
}

export async function validateAdminSession(signedCookie: string): Promise<boolean> {
  const token = verifySignedSessionCookie(signedCookie);
  if (!token) return false;

  const session = await prisma.adminSession.findUnique({
    where: { token },
    include: { adminUser: true },
  });

  if (!session || !session.adminUser?.isActive) return false;

  if (session.expiresAt < new Date()) {
    await prisma.adminSession.delete({ where: { id: session.id } });
    return false;
  }

  return true;
}

export async function revokeAdminSession(signedCookie: string): Promise<void> {
  const token = verifySignedSessionCookie(signedCookie);
  if (!token) return;
  await prisma.adminSession.deleteMany({ where: { token } });
}

export function parseSessionToken(signedCookie: string): string | null {
  return verifySignedSessionCookie(signedCookie);
}
