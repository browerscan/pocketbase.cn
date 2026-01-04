import { SITE_URL } from "../lib/constants/config";

export async function GET() {
  const now = new Date().toISOString();

  const sitemaps = [
    { loc: `${SITE_URL}/sitemap-static.xml`, lastmod: now },
    { loc: `${SITE_URL}/sitemap-docs.xml`, lastmod: now },
    { loc: `${SITE_URL}/sitemap-blog.xml`, lastmod: now },
    { loc: `${SITE_URL}/sitemap-plugins.xml`, lastmod: now },
    { loc: `${SITE_URL}/sitemap-showcase.xml`, lastmod: now },
  ];

  const sitemapIndex = `
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps
  .map(
    (sitemap) => `  <sitemap>
    <loc>${sitemap.loc}</loc>
    <lastmod>${sitemap.lastmod}</lastmod>
  </sitemap>`,
  )
  .join("\n")}
</sitemapindex>`.trim();

  return new Response(sitemapIndex, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
