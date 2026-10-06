import type { Metadata } from 'next';
import { one } from './db';
import { seoDefaults } from './db/seed';
import { img, photos } from './content';

/** Title/description for a path: admin-edited values first, then the defaults. */
export async function pageMeta(path: string, fallback?: { title: string; description: string; image?: string }): Promise<Metadata> {
  const row = await one<{ title: string; description: string; og_image: string | null }>(`select title, description, og_image from seo_pages where path = $1`, [path]).catch(() => undefined);
  const [dt, dd] = seoDefaults[path] ?? [fallback?.title ?? '', fallback?.description ?? ''];
  const title = row?.title || fallback?.title || dt, description = row?.description || fallback?.description || dd;
  const image = row?.og_image || fallback?.image || img(photos.oliveLight, 1200);
  return { title: { absolute: title }, description, alternates: { canonical: path }, openGraph: { title, description, url: path, images: [{ url: image, width: 1200, height: 630 }] } };
}
