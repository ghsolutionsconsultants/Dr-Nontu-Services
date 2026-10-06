import type { MetadataRoute } from 'next';
import { practice, services } from '@/lib/content';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = practice.url;
  const pages = ['', '/about', '/services', '/house-calls', '/care-plans', '/fees', '/contact', '/faq', '/book', '/privacy', '/popia', '/terms'];
  return [
    ...pages.map((p) => ({ url: base + p, changeFrequency: 'monthly' as const, priority: p === '' ? 1 : p === '/book' ? .9 : .7 })),
    ...services.map((s) => ({ url: `${base}/services/${s.slug}`, changeFrequency: 'monthly' as const, priority: .6 })),
  ];
}
