import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

/**
 * Server session. Returns null when signed out or when the JWT cookie cannot be
 * decrypted (for example after NEXTAUTH_SECRET changed).
 */
export async function getSession() {
  try {
    return await getServerSession(authOptions);
  } catch {
    return null;
  }
}
