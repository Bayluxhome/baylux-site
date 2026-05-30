/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Next.js сам сжимает и отдаёт WebP/AVIF нужного размера для любого изображения
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
