import { getCollection } from "astro:content";
import { SITE_URL } from "../../lib/constants/config";

export async function GET(context) {
  const posts = await getCollection("blog", ({ data }) => !data.draft);
  const sortedPosts = posts.sort(
    (a, b) => b.data.publishDate.valueOf() - a.data.publishDate.valueOf(),
  );

  const rss = `
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>PocketBase.cn 博客</title>
    <description>PocketBase 技术文章、教程、最佳实践与对比分析</description>
    <link>${SITE_URL}/blog/</link>
    <atom:link href="${SITE_URL}/blog/rss.xml" rel="self" type="application/rss+xml" />
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${sortedPosts
  .map(
    (post) => `
    <item>
      <title><![CDATA[${post.data.title}]]></title>
      <description><![CDATA[${post.data.description}]]></description>
      <link>${SITE_URL}/blog/${post.slug}/</link>
      <guid>${SITE_URL}/blog/${post.slug}/</guid>
      <pubDate>${new Date(post.data.publishDate).toUTCString()}</pubDate>
      ${post.data.updatedDate ? `<lastBuildDate>${new Date(post.data.updatedDate).toUTCString()}</lastBuildDate>` : ""}
      ${post.data.category ? `<category><![CDATA[${post.data.category}]]></category>` : ""}
      ${post.data.tags.map((tag) => `<category><![CDATA[${tag}]]></category>`).join("\n      ")}
      <author>${post.data.author}</author>
    </item>`,
  )
  .join("")}
  </channel>
</rss>`.trim();

  return new Response(rss, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
