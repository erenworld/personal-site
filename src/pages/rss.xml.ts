import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import sanitizeHtml from "sanitize-html";
import MarkdownIt from "markdown-it";
import { getBlogPosts } from "../data/utils";

const parser = new MarkdownIt();
const allowedTags = sanitizeHtml.defaults.allowedTags.concat(["img"]);

const getPostContent = (post: Awaited<ReturnType<typeof getBlogPosts>>[number]) => {
  if (typeof post.rendered?.html === "string") {
    return post.rendered.html;
  }

  if (typeof post.body === "string") {
    return parser.render(post.body);
  }

  return "";
};

export async function GET(context: APIContext) {
  const posts = await getBlogPosts();
  return rss({
    title: "Eren Türkoglu",
    description: "",
    site: new URL(context.site!),
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      link: `/${post.id}/`,
      content: sanitizeHtml(getPostContent(post), { allowedTags }),
    })),
  });
}
