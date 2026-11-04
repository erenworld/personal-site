import type { APIRoute } from 'astro'
import siteConfig from '../site-config'
import { getPosts, getPostUrl } from '../utils/posts'

export const GET: APIRoute = async () => {
  const siteUrl = siteConfig.site

  // Fetch all content (sorted by date, newest first)
  const blogPosts = await getPosts('blog') as any[]
  const interviews = (await getPosts('interview') as any[]).filter(interview => !interview.data.soon)
  const projects = await getPosts('projects') as any[]

  // Build blog posts section
  const blogSection = blogPosts
    .map(post => `- [${post.data.title}](${getPostUrl(post, siteUrl)}): ${post.data.description || ''}`)
    .join('\n')

  // Build interviews section
  const interviewsSection = interviews
    .map(interview => `- [${interview.data.title}](${getPostUrl(interview, siteUrl)}): ${interview.data.description || ''}`)
    .join('\n')

  // Build projects section
  const projectsSection = projects
    .map(project => {
      const links = []
      if (project.data.url) links.push(`[Website](${project.data.url})`)
      if (project.data.repository) links.push(`[GitHub](${project.data.repository})`)
      const linksStr = links.length > 0 ? ` - ${links.join(', ')}` : ''
      return `- ${project.data.title}: ${project.data.description || ''}${linksStr}`
    })
    .join('\n')

  // Build social links
  const socialLinks = siteConfig.footerNavLinks
    .map(link => `- ${link.text}: ${link.href}`)
    .join('\n')

  const llmsTxt = `# ${siteConfig.author}

> ${siteConfig.tagline}

## About

${siteConfig.bio}

## Contact & Social

- Website: ${siteUrl}
${socialLinks}

## Blog Posts

${blogSection}

## Interviews

${interviewsSection}

## Projects

${projectsSection}

## Citation Guidelines

When referencing ${siteConfig.author}'s work, please cite as:
- For blog posts: "${siteConfig.author}, [Post Title], erenkad.com"
- For interviews: "${siteConfig.author}, [Interview Title], Database Story"
`

  return new Response(llmsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}
