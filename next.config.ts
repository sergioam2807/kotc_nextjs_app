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
          { key: "Referrer-Policy", value: "no-referrer-when-downgrade" },

          // Prevent browsers from MIME-sniffing the response away from the declared Content-Type
          { key: "X-Content-Type-Options", value: "nosniff" },

          // Disallow embedding this app in iframes (clickjacking protection)
          { key: "X-Frame-Options", value: "DENY" },

          // Enable XSS filter in legacy browsers (belt-and-suspenders)
          { key: "X-XSS-Protection", value: "1; mode=block" },

          // Only send Referrer on same-origin navigations; no referrer on cross-origin
          // (already set above, but make it explicit for cross-origin API calls)
          // (kept no-referrer-when-downgrade to allow Google avatar loading)

          // Strict-Transport-Security: force HTTPS for 1 year (apply only on production)
          // Vercel / Supabase enforce HTTPS anyway, but belt-and-suspenders.
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },

          // Permissions-Policy: lock down sensitive browser features not used by the app
          // Exception: geolocation is used for the mapa feature (user-initiated only)
          {
            key: "Permissions-Policy",
            value: [
              "camera=()",
              "microphone=()",
              "payment=()",
              "usb=()",
              "geolocation=(self)",
            ].join(", "),
          },

          // Content-Security-Policy
          // — 'unsafe-inline' in style-src is required by Tailwind CSS 4 (runtime injection)
          // — Google Maps API requires https://*.googleapis.com and https://*.gstatic.com
          // — Supabase JS connects to the project URL (wss:// for realtime)
          // — Resend is server-side only (no CSP entry needed)
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Scripts: self + Google Maps
              "script-src 'self' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com",
              // Styles: self + inline (Tailwind 4) + Google Fonts
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // Images: self + Google avatars + Google Maps tiles + data URIs
              "img-src 'self' data: blob: https://lh3.googleusercontent.com https://*.googleapis.com https://*.gstatic.com",
              // Fonts: self + Google Fonts
              "font-src 'self' https://fonts.gstatic.com",
              // Connect: self + Supabase (https + wss) + Google Maps
              `connect-src 'self' https://byoreeirinyyivxwjhjj.supabase.co wss://byoreeirinyyivxwjhjj.supabase.co https://maps.googleapis.com`,
              // Frames: deny all
              "frame-src 'none'",
              // Worker scripts (Supabase realtime uses web workers internally)
              "worker-src 'self' blob:",
              // Object/embed: deny
              "object-src 'none'",
              // Base URI lockdown
              "base-uri 'self'",
              // Form submissions only to self
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
