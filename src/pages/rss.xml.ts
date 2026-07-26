import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'

const fallbackSite = new URL('https://erenkad.com')

const escapeXml = (value: string) =>
  value.replace(/[<>&'"]/g, (character) => {
    switch (character) {
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '&':
        return '&amp;'
      case "'":
        return '&apos;'
      case '"':
        return '&quot;'
      default:
        return character
    }
  })

const getSlug = (id: string) => id.replace(/\.mdx?$/, '')

const getExcerpt = (body = '') =>
  body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[-*]\s+/gm, '')
    .replace(/[#*_>`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 280)

export const GET: APIRoute = async (context) => {
  const site = context.site ?? fallbackSite
  const posts = (await getCollection('blog'))
    .filter((post) => !post.data.draft)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())

  const items = posts
    .map((post) => {
      const url = new URL(`/blog/${getSlug(post.id)}/`, site).toString()
      const description = post.data.description ?? getExcerpt(post.body)

      return `
    <item>
      <title>${escapeXml(post.data.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid>${escapeXml(url)}</guid>
      <pubDate>${post.data.date.toUTCString()}</pubDate>
      <description>${escapeXml(description)}</description>
    </item>`
    })
    .join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Eren Turkoglu</title>
    <link>${escapeXml(site.toString())}</link>
    <description>Writing by Eren Turkoglu</description>
    <language>en</language>${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  })
}
