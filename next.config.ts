import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Necesario para cargar avatares de Google OAuth (lh3.googleusercontent.com)
          // sin este header el browser envía el Referer y Google rechaza la imagen
          { key: "Referrer-Policy", value: "no-referrer-when-downgrade" },
        ],
      },
    ];
  },
};

export default nextConfig;
