import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getOutboundIp, isFatSecretProxyConfigured } from "@/lib/nutrition/fatsecret-http";
import { hasFatSecretCredentials } from "@/lib/nutrition/fatsecret";

/**
 * Returns production outbound IP for FatSecret whitelisting (authenticated users only).
 * Optional: set FATSECRET_EGRESS_CHECK_SECRET and pass header x-fatsecret-egress-secret
 * to allow checks without a session (e.g. CI).
 */
export async function GET(request: Request) {
  const secret = process.env.FATSECRET_EGRESS_CHECK_SECRET?.trim();
  const headerSecret = request.headers.get("x-fatsecret-egress-secret")?.trim();
  const secretOk = Boolean(secret && headerSecret && secret === headerSecret);

  if (!secretOk) {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const ip = await getOutboundIp();
    return NextResponse.json({
      outboundIp: ip,
      proxyConfigured: isFatSecretProxyConfigured(),
      credentialsConfigured: hasFatSecretCredentials(),
      note: "Whitelist outboundIp in FatSecret API Keys (IP restrictions). Changes may take up to 24 hours.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Egress check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
