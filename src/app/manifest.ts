import type { MetadataRoute } from "next";

/**
 * PWA manifest — lets users "Add to Home Screen" on mobile and the app
 * opens in a standalone window with no browser chrome.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Frier's Useful Pub Map",
    short_name: "Frier Pubs",
    description:
      "2,600+ central London pubs, filterable by what you actually care about: food, sun, beer gardens, real ale, live sport, and more.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f5f0e6",
    theme_color: "#f5f0e6",
    icons: [
      {
        src: "/logo.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/logo.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    categories: ["food", "lifestyle", "travel"],
  };
}
