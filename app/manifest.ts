import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Courier Super App",
    short_name: "Courier",
    description: "Logistics and Delivery Management",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f9fa",
    theme_color: "#000000",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
