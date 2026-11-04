import type { APIRoute } from 'astro'
import siteConfig from '../site-config'
import { getPosts, getPostUrl } from '../utils/posts'

// Strip MDX-specific imports and components from content
function cleanMdxContent(content: string): string {
  return content
    // Remove import statements
    .replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, '')
    // Remove JSX-style component tags (self-closing and with content)
    .replace(/<[A-Z][a-zA-Z]*\s*[^>]*\/>/g, '')
    .replace(/<[A-Z][a-zA-Z]*\s*[^>]*>[\s\S]*?<\/[A-Z][a-zA-Z]*>/g, '')
    // Clean up excessive newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export const GET: APIRoute = async () => {
  const siteUrl = siteConfig.site

  // Fetch all content (sorted by date, newest first)
  const blogPosts = await getPosts('blog') as any[]
  const interviews = (await getPosts('interview') as any[]).filter(interview => !interview.data.soon)
  const projects = await getPosts('projects') as any[]

  // Build blog posts section with full content
  const blogSection = blogPosts
    .map(post => {
      const cleanContent = cleanMdxContent(post.body || '')
      return `### ${post.data.title}

URL: ${getPostUrl(post, siteUrl)}
${post.data.description ? `Description: ${post.data.description}` : ''}

${cleanContent}`
    })
    .join('\n\n---\n\n')

  // Build interviews section
  const interviewsSection = interviews
    .map(interview => {
      const cleanContent = cleanMdxContent(interview.body || '')
      return `### ${interview.data.title}

URL: ${getPostUrl(interview, siteUrl)}
${interview.data.description ? `Description: ${interview.data.description}` : ''}

${cleanContent}`
    })
    .join('\n\n---\n\n')

  // Build projects section
  const projectsSection = projects
    .map(project => {
      const cleanContent = cleanMdxContent(project.body || '')
      const links = []
      if (project.data.url) links.push(`Website: ${project.data.url}`)
      if (project.data.repository) links.push(`GitHub: ${project.data.repository}`)
      const linksStr = links.length > 0 ? links.join('\n') + '\n' : ''
      return `### ${project.data.title}

${project.data.description ? `Description: ${project.data.description}` : ''}
${linksStr}
${cleanContent}`
    })
    .join('\n\n---\n\n')

  // Build social links
  const socialLinks = siteConfig.footerNavLinks
    .map(link => `- ${link.text}: ${link.href}`)
    .join('\n')

  const llmsFullTxt = `# ${siteConfig.author} - Full Content

> ${siteConfig.tagline}

## About

${siteConfig.bio}

## Contact & Social

- Website: ${siteUrl}
${socialLinks}

## Blog Posts (Full Content)

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

  return new Response(llmsFullTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}
