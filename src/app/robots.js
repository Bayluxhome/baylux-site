export default function robots() {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/demo/" },
    sitemap: "https://bayluxhome.com/sitemap.xml",
  };
}
