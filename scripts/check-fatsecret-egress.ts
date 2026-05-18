/**
 * Print the outbound IP used for FatSecret calls (with optional FATSECRET_HTTP_PROXY).
 * Whitelist this IP in the FatSecret developer portal (can take up to 24 hours).
 *
 * Run: npm run fatsecret:egress-check
 */

import {
  getFatSecretProxyEnvKey,
  getFatSecretProxyUrl,
  getOutboundIp,
} from "../lib/nutrition/fatsecret-http";
import {
  fatSecretSearchFoods,
  hasFatSecretCredentials,
} from "../lib/nutrition/fatsecret";

async function main() {
  const proxy = getFatSecretProxyUrl();
  const proxyKey = getFatSecretProxyEnvKey();
  const ip = await getOutboundIp();

  console.log("\nFatSecret egress check\n");
  console.log(`  Outbound IP (whitelist this):  ${ip}`);
  console.log(
    `  HTTP proxy:                    ${proxy ? `yes (${proxyKey})` : "no (direct from this machine)"}`,
  );
  console.log(
    `  Credentials:                   ${hasFatSecretCredentials() ? "yes" : "missing FATSECRET_CLIENT_ID / SECRET"}`,
  );

  if (!hasFatSecretCredentials()) {
    console.log(
      "\nAdd FATSECRET_CLIENT_ID and FATSECRET_CLIENT_SECRET to .env, then re-run.\n",
    );
    process.exit(1);
  }

  try {
    const items = await fatSecretSearchFoods("apple", 1);
    console.log(
      `  FatSecret API test:            ok (${items.length} result(s) for "apple")`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  FatSecret API test:            failed`);
    console.log(`  Error: ${msg}`);
    if (!proxy) {
      console.log(
        "\n  Tip: On Vercel, outbound IPs are not stable. Set FATSECRET_HTTP_PROXY",
      );
      console.log(
        "  to a static-IP proxy (Fixie, QuotaGuard, etc.) and whitelist that IP.\n",
      );
    } else {
      console.log(
        "\n  Tip: Confirm this IP is listed under FatSecret API Keys (IP restrictions).",
      );
      console.log("  Changes can take up to 24 hours to apply.\n");
    }
    process.exit(1);
  }

  console.log("\nNext steps:");
  console.log("  1. FatSecret Platform → your app → API Keys → IP restrictions");
  console.log(`  2. Add ${ip}`);
  console.log("  3. Set the same env vars (and proxy URL) on Vercel / production");
  console.log("  4. Wait up to 24h if you just added the IP\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
