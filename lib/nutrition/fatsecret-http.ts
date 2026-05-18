import { ProxyAgent, fetch as undiciFetch } from "undici";

let proxyAgent: ProxyAgent | undefined;
let proxyAgentForUrl: string | null = null;

/**
 * Static `process.env.*` access so Next.js includes these vars in the server bundle.
 * Do not use dynamic process.env[key] here.
 */
export function getFatSecretProxyUrl(): string | null {
  const url =
    process.env.FATSECRET_HTTP_PROXY?.trim() ||
    process.env.FATSECRET_HTTPS_PROXY?.trim() ||
    process.env.FIXIE_URL?.trim() ||
    process.env.QUOTAGUARDSTATIC_URL?.trim() ||
    "";
  return url || null;
}

export function getFatSecretProxyEnvKey(): string | null {
  if (process.env.FATSECRET_HTTP_PROXY?.trim()) return "FATSECRET_HTTP_PROXY";
  if (process.env.FATSECRET_HTTPS_PROXY?.trim()) return "FATSECRET_HTTPS_PROXY";
  if (process.env.FIXIE_URL?.trim()) return "FIXIE_URL";
  if (process.env.QUOTAGUARDSTATIC_URL?.trim()) return "QUOTAGUARDSTATIC_URL";
  return null;
}

export function isFatSecretProxyConfigured(): boolean {
  return Boolean(getFatSecretProxyUrl());
}

function proxyAgentFor(proxyUrl: string): ProxyAgent {
  if (!proxyAgent || proxyAgentForUrl !== proxyUrl) {
    proxyAgent = new ProxyAgent(proxyUrl);
    proxyAgentForUrl = proxyUrl;
  }
  return proxyAgent;
}

/** Server-side fetch for FatSecret OAuth + API (honors proxy env when set). */
export async function fatSecretFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const proxy = getFatSecretProxyUrl();
  if (!proxy) {
    return fetch(url, init);
  }

  const res = await undiciFetch(url, {
    ...init,
    dispatcher: proxyAgentFor(proxy),
  } as Parameters<typeof undiciFetch>[1]);
  return res as unknown as Response;
}

/** Outbound IP as seen by the public internet (use the same proxy env as production). */
export async function getOutboundIp(): Promise<string> {
  const res = await fatSecretFetch("https://api.ipify.org?format=json", {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`IP check failed: ${res.status}`);
  }
  const data = (await res.json()) as { ip?: string };
  const ip = data.ip?.trim();
  if (!ip) throw new Error("IP check returned no address");
  return ip;
}
