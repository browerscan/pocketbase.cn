import { SITE_URL, POCKETBASE_URL } from "../lib/constants/config";

interface PluginItem {
  slug: string;
  github_updated_at?: string | null;
  featured?: boolean;
}

async function fetchPlugins(): Promise<PluginItem[]> {
  try {
    const out: PluginItem[] = [];
    const limit = 200;
    let offset = 0;

    for (let i = 0; i < 200; i++) {
      const url = new URL("/api/plugins/list", POCKETBASE_URL);
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("offset", String(offset));

      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) break;
      const json = await res.json().catch(() => null);
      const rows = Array.isArray(json?.data) ? (json.data as PluginItem[]) : [];
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
  const plugins = await fetchPlugins();
  const now = new Date().toISOString();

  const sitemap = `
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${plugins
  .map(
    (plugin) => `  <url>
    <loc>${SITE_URL}/plugins/${plugin.slug}/</loc>
    <lastmod>${plugin.github_updated_at || now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${plugin.featured ? "0.8" : "0.6"}</priority>
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
