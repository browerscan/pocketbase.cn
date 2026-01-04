import { SITE_URL } from "../lib/constants/config";

export async function GET() {
  const now = new Date().toISOString();

  const staticPages = [
    { path: "/", priority: "1.0", changefreq: "daily" },
    { path: "/plugins/", priority: "0.8", changefreq: "daily" },
    { path: "/showcase/", priority: "0.8", changefreq: "weekly" },
    { path: "/downloads/", priority: "0.9", changefreq: "weekly" },
    { path: "/legal/terms/", priority: "0.3", changefreq: "monthly" },
    { path: "/legal/privacy/", priority: "0.3", changefreq: "monthly" },
  ];

  const sitemap = `
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages
  .map(
    (page) => `  <url>
    <loc>${SITE_URL}${page.path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`.trim();

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
