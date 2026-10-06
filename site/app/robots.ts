import type { MetadataRoute } from 'next';
import { practice } from '@/lib/content';

export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/manage', '/pay', '/book/confirmed'] }], sitemap: `${practice.url}/sitemap.xml` };
}
