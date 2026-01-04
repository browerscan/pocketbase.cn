import { getCollection } from "astro:content";
import { SITE_URL } from "../lib/constants/config";
import { POSTS_PER_PAGE } from "../lib/constants/blog";

export async function GET() {
  const blog = await getCollection("blog", ({ data }) => !data.draft);

  const sitemap = `
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${(() => {
  const posts = blog.sort(
    (a, b) => b.data.publishDate.valueOf() - a.data.publishDate.valueOf(),
  );

  const categories = [
    ...new Set(posts.map((p) => String(p.data.category || "未分类"))),
  ];
  const tags = [...new Set(posts.flatMap((p) => p.data.tags))].filter(Boolean);

  const out: string[] = [];
  const seen = new Set<string>();

  const pushUrl = (
    loc: string,
    lastmod: string,
    changefreq: string,
    priority: string,
  ) => {
    if (seen.has(loc)) return;
    seen.add(loc);
    out.push(`  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`);
  };

  const mostRecent = (items: typeof posts) => {
    const top = items[0];
    const date = top?.data?.updatedDate || top?.data?.publishDate;
    return (date || new Date()).toISOString();
  };

  // Blog index + pages
  const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE) || 1;
  pushUrl(`${SITE_URL}/blog/`, mostRecent(posts), "weekly", "0.8");
  for (let page = 2; page <= totalPages; page++) {
    pushUrl(
      `${SITE_URL}/blog/page/${page}/`,
      mostRecent(posts),
      "weekly",
      "0.6",
    );
  }

  // Taxonomy indexes
  pushUrl(`${SITE_URL}/blog/categories/`, mostRecent(posts), "weekly", "0.5");
  pushUrl(`${SITE_URL}/blog/tags/`, mostRecent(posts), "weekly", "0.5");

  // Category pages + pagination
  for (const category of categories) {
    const catPosts = posts.filter(
      (p) => String(p.data.category || "未分类") === category,
    );
    const catPages = Math.ceil(catPosts.length / POSTS_PER_PAGE) || 1;
    const enc = encodeURIComponent(category);
    pushUrl(
      `${SITE_URL}/blog/category/${enc}/`,
      mostRecent(catPosts),
      "monthly",
      "0.6",
    );
    for (let page = 2; page <= catPages; page++) {
      pushUrl(
        `${SITE_URL}/blog/category/${enc}/page/${page}/`,
        mostRecent(catPosts),
        "monthly",
        "0.4",
      );
    }
  }

  // Tag pages + pagination
  for (const tag of tags) {
    const tagPosts = posts.filter(
      (p) => Array.isArray(p.data.tags) && p.data.tags.includes(tag),
    );
    const tagPages = Math.ceil(tagPosts.length / POSTS_PER_PAGE) || 1;
    const enc = encodeURIComponent(tag);
    pushUrl(
      `${SITE_URL}/blog/tag/${enc}/`,
      mostRecent(tagPosts),
      "monthly",
      "0.5",
    );
    for (let page = 2; page <= tagPages; page++) {
      pushUrl(
        `${SITE_URL}/blog/tag/${enc}/page/${page}/`,
        mostRecent(tagPosts),
        "monthly",
        "0.4",
      );
    }
  }

  // Post pages
  for (const post of posts) {
    const lastmod = (
      post.data.updatedDate || post.data.publishDate
    ).toISOString();
    pushUrl(
      `${SITE_URL}/blog/${post.slug}/`,
      lastmod,
      "monthly",
      post.data.featured ? "0.9" : "0.7",
    );
  }

  return out.join("\n");
})()}
</urlset>`.trim();

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
