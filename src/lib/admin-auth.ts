import { timingSafeEqual } from "crypto";

export function verifyAdminKey(provided: string | null): boolean {
  const expected = process.env.ADMIN_API_KEY;
  if (!provided || !expected) return false;
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}
