import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { blogSchema, projectsSchema, interviewSchema, pagesSchema } from "./content/schemas";

const blog = defineCollection({
  loader: glob({ base: "./src/content/blog", pattern: "**/*.{md,mdx}" }),
  schema: blogSchema,
});

const projects = defineCollection({
  loader: glob({ base: "./src/content/projects", pattern: "**/*.{md,mdx}" }),
  schema: projectsSchema,
});

const interview = defineCollection({
  loader: glob({ base: "./src/content/interview", pattern: "**/*.{md,mdx}" }),
  schema: interviewSchema,
});

const pages = defineCollection({
  loader: glob({ base: "./src/content/pages", pattern: "**/*.{md,mdx}" }),
  schema: pagesSchema,
});

export const collections = {
  blog,
  projects,
  pages,
  interview,
};
