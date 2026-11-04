import siteConfig from '../site-config';
import { ogTemplate } from '../utils/og-image';

export function GET() {
  return ogTemplate(siteConfig.author, siteConfig.tagline, 'erenkad.com');
}
