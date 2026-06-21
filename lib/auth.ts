import bcrypt from "bcrypt";

/**
 * Utility for hashing passwords (e.g. seed scripts).
 * Admin login compares against ADMIN_PASSWORD from env at runtime.
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function comparePassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
