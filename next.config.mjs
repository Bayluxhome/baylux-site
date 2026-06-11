/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Отдаём фото напрямую из источника (Supabase CDN), без оптимизатора Vercel:
    // на тарифе Hobby у него лимит трансформаций → при превышении /_next/image даёт 402
    // и все фото перестают грузиться. Фото и так сжимаются при загрузке (~200 КБ).
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
    // Разрешённые внешние источники картинок (для удалённых фото объектов)
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "drive.google.com" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
};
export default nextConfig;
