import { getCollection } from "astro:content";
import { SITE_URL } from "../lib/constants/config";

function routeForId(id: string) {
  const normalized = String(id || "").replace(/^\/+|\/+$/g, "");
  if (!normalized) return "/";
  if (normalized.endsWith("/index"))
    return `/${normalized.slice(0, -"/index".length)}/`;
  if (normalized === "index") return "/";
  return `/${normalized}/`;
}

export async function GET() {
  const docs = await getCollection("docs");
  const now = new Date().toISOString();

  const sitemap = `
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${docs
  .map(
    (doc) => `  <url>
    <loc>${SITE_URL}${routeForId(doc.id)}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
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
