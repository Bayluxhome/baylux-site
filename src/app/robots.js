// robots.txt. 28.09.2026 — сайт упёрся в лимит CPU Vercel: роботы обходили бесконечные
// комбинации фильтров каталога (?deal=sale&cat=apartment&sort=area_desc…), и каждая такая
// страница — полный серверный рендер. Эти адреса и так схлопнуты canonical в раздел
// (/catalog?deal=sale), в поиск они не попадают — закрываем их от обхода.
// Разрешены: разделы ?deal= / ?new=1 и пагинация ?page= — они канонические.

// Параметры фильтров/сортировки каталога и новостроек. Варианты с ? и & — чтобы шаблон
// не цеплял посторонние параметры с тем же окончанием (например, «q=» внутри «...seq=»).
const FILTER_PARAMS = [
  "sort", "cat", "type", "city", "district", "rooms", "pmin", "pmax", "amin", "amax",
  "ymin", "nc", "managed", "amen", "q", "kind", "tag", "year", "installment", "sea", "c",
];
const filterRules = FILTER_PARAMS.flatMap((p) => [`/*?${p}=`, `/*&${p}=`]);

// Служебные разделы: кабинет, админка, добавление, избранное, подборки (они и так noindex).
// Языки перечислены явно: шаблон «/*/my» зацепил бы и /ru/property/my-… (звёздочка ловит слэши).
const PRIVATE = ["/api/", "/demo/"].concat(
  ["ru", "en", "ka"].flatMap((l) => ["/my", "/admin", "/add", "/favorites", "/c/"].map((p) => `/${l}${p}`)),
);

// SEO-сканеры и сборщики датасетов: трафика не приносят, а CPU тратят.
// Поисковые боты (Google, Bing, Yandex) и поисковые AI-боты (OAI-SearchBot, PerplexityBot) не трогаем.
const BLOCKED_BOTS = [
  "AhrefsBot", "SemrushBot", "MJ12bot", "DotBot", "PetalBot", "DataForSeoBot", "BLEXBot",
  "Barkrowler", "SeekportBot", "serpstatbot", "Bytespider", "CCBot", "GPTBot", "ClaudeBot",
  "Amazonbot", "meta-externalagent", "ImagesiftBot",
];

export default function robots() {
  return {
    rules: [
      { userAgent: BLOCKED_BOTS, disallow: "/" },
      { userAgent: "*", allow: "/", disallow: [...PRIVATE, ...filterRules] },
    ],
    sitemap: "https://bayluxhome.com/sitemap.xml",
  };
}
