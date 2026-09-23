import { z } from "astro/zod";

export const blogSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  date: z.coerce.date(),
  tags: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
  comment_id: z.string().optional(),
  code: z.string().optional(),
  slugs: z.array(z.string()).optional(),
});

export const projectsSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  url: z.string().url().optional(),
  repository: z.string().url().optional(),
  status: z
    .enum(["experimental", "active", "completed", "archived", "maintenance"])
    .default("active"),
  date: z.coerce.date(),
  code: z.string().optional(),
  slugs: z.array(z.string()).optional(),
});

export const interviewSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  date: z.coerce.date(),
  guest: z.string(),
  company: z.string(),
  guestUrl: z.string().url().default("https://databasestory.com"),
  slides: z
    .union([
      z.number(),
      z.array(
        z.object({
          image: z.string(),
          timestamp: z.union([z.number(), z.string()]).optional(),
        }),
      ),
    ])
    .optional(),
  audioPath: z.string().optional(),
  transcriptPath: z.string().optional(),
  code: z.string().optional(),
  slugs: z.array(z.string()).optional(),
});

export const pagesSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
});
