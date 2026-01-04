import { SITE_URL, POCKETBASE_URL } from "../lib/constants/config";

interface ShowcaseItem {
  slug: string;
  featured?: boolean;
  updated?: string | null;
}

async function fetchShowcase(): Promise<ShowcaseItem[]> {
  try {
    const out: ShowcaseItem[] = [];
    const limit = 200;
    let offset = 0;

    for (let i = 0; i < 200; i++) {
      const url = new URL("/api/showcase/list", POCKETBASE_URL);
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("offset", String(offset));

      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) break;
      const json = await res.json().catch(() => null);
      const rows = Array.isArray(json?.data)
        ? (json.data as ShowcaseItem[])
        : [];
      const meta = json?.meta || {};

      out.push(...rows);

      const hasMore = Boolean(meta?.hasMore);
      const nextOffset = Number(meta?.nextOffset || offset + rows.length);
      if (!hasMore || rows.length === 0) break;
      offset = nextOffset;
    }

    return out;
  } catch {
    return [];
  }
}

export async function GET() {
  const showcase = await fetchShowcase();
  const now = new Date().toISOString();

  const sitemap = `
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${showcase
  .map(
    (item) => `  <url>
    <loc>${SITE_URL}/showcase/${item.slug}/</loc>
    <lastmod>${item.updated || now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${item.featured ? "0.8" : "0.6"}</priority>
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
