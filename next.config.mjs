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
  // Базовые защитные заголовки. CSP намеренно не задаём: карты, аналитика и Telegram-виджет
  // тянут скрипты с разных доменов, и строгая политика сломала бы их — это отдельная задача.
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },           // не угадывать тип файла
        { key: "X-Frame-Options", value: "SAMEORIGIN" },               // не встраивать сайт в чужой iframe
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=()" },
      ],
    }];
  },
};
export default nextConfig;
