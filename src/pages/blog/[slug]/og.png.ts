import { getPosts } from '../../../utils/posts';
import { ogTemplate } from '../../../utils/og-image';

export async function getStaticPaths() {
  const posts = await getPosts('blog');
  return posts.map((post: any) => ({ params: { slug: post.id }, props: { post } }));
}

export function GET({ props }: { props: { post: any } }) {
  return ogTemplate(props.post.data.title, props.post.data.date, 'Blog');
}
