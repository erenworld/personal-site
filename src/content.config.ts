import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'

const dateSchema = z
  .string()
  .or(z.date())
  .transform((val: string | number | Date) => new Date(val).toLocaleDateString('en-us', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }))

const postsSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  image: z
    .object({
      src: z.string(),
      alt: z.string().optional(),
    })
    .optional(),
  date: dateSchema,
  draft: z.boolean().optional().default(false),
  lang: z.string().optional().default('en-GB'),
  location: z.string().optional(),
  redirect: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: postsSchema,
})

// Interviews live on databasestory.com: the list links out to `guestUrl`, and an
// interview with no `guestUrl` yet is listed as "soon" with no link.
const interview = defineCollection({
  loader: glob({ base: './src/content/interview', pattern: '**/*.{md,mdx}' }),
  schema: postsSchema
    .extend({
      title: z.string().optional(),
      guest: z.string(),
      company: z.string(),
      guestUrl: z.string().url().optional(),
    })
    .transform(data => ({
      ...data,
      title: data.title ?? `Interview with ${data.guest} from ${data.company}`,
      redirect: data.redirect ?? data.guestUrl,
      soon: !data.guestUrl,
    })),
})

const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    image: z.string().optional(),
    date: dateSchema,
    url: z.string().url().optional(),
    repository: z.string().url().optional(),
    status: z
      .enum(['experimental', 'active', 'completed', 'archived', 'maintenance'])
      .default('active'),
  }),
})

export const collections = { blog, interview, projects }
