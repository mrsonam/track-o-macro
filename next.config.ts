import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Partial Prerendering + `use cache` (Next.js 16+). */
  cacheComponents: true,
  turbopack: {},

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          // Do not send a restrictive CSP on the SW response — it applies to fetch() in
          // the worker and blocked fonts.googleapis.com / vercel.live, breaking first load.
        ],
      },
    ];
  },
};

export default nextConfig;
