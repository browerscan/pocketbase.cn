import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { SITE_URL } from "../../lib/constants/config";

interface RSSContext {
  site?: string;
}

export async function GET(context: RSSContext) {
  const posts = await getCollection(
    "blog",
    ({ data }: { data: { draft?: boolean } }) => !data.draft,
  );
  const sortedPosts = posts.sort(
    (
      a: { data: { publishDate: { valueOf: () => number } } },
      b: { data: { publishDate: { valueOf: () => number } } },
    ) => b.data.publishDate.valueOf() - a.data.publishDate.valueOf(),
  );

  return rss({
    title: "PocketBase.cn 博客",
    description: "PocketBase 技术文章、教程、最佳实践与对比分析",
    site: context.site || SITE_URL,
    items: sortedPosts.map(
      (post: {
        data: {
          title: string;
          description?: string;
          excerpt?: string;
          publishDate: Date;
          updatedDate?: Date;
          category?: string;
          author?: string;
        };
        slug: string;
      }) => ({
        title: post.data.title,
        description: post.data.description || post.data.excerpt,
        pubDate: post.data.publishDate,
        updatedDate: post.data.updatedDate,
        link: `/blog/${post.slug}/`,
        category: post.data.category,
        author: post.data.author,
      }),
    ),
    customData: `<language>zh-cn</language><managingEditor>editor@pocketbase.cn (PocketBase.cn)</managingEditor><webMaster>webmaster@pocketbase.cn (PocketBase.cn)</webMaster>`,
    trailingSlash: false,
  });
}
