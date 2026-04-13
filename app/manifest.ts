import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "TrackOMacro",
    short_name: "TrackOMacro",
    description:
      "Log meals in plain language and estimate calories with USDA-backed nutrition data.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "browser"],
    orientation: "any",
    background_color: "#fafaf9",
    theme_color: "#15803d",
    categories: ["health", "food"],
    icons: [
      {
        src: "/icon-192x192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-512x512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-512x512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Log meal",
        short_name: "Log",
        description: "Describe what you ate",
        url: "/",
        icons: [
          { src: "/icon-192x192.svg", sizes: "192x192", type: "image/svg+xml" },
        ],
      },
      {
        name: "History",
        short_name: "History",
        description: "Past meals",
        url: "/history",
        icons: [
          { src: "/icon-192x192.svg", sizes: "192x192", type: "image/svg+xml" },
        ],
      },
      {
        name: "Trends",
        short_name: "Trends",
        description: "Rolling windows and summaries",
        url: "/trends",
        icons: [
          { src: "/icon-192x192.svg", sizes: "192x192", type: "image/svg+xml" },
        ],
      },
      {
        name: "Settings",
        short_name: "Settings",
        description: "Targets, foods, and account",
        url: "/settings",
        icons: [
          { src: "/icon-192x192.svg", sizes: "192x192", type: "image/svg+xml" },
        ],
      },
    ],
  };
}
