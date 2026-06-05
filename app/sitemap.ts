import { MetadataRoute } from 'next';

const baseUrl = 'https://keyo.studio';
const locales = ['en', 'ua'] as const;

const routes: Array<{ path: string; changeFrequency: 'weekly' | 'monthly'; priority: number }> = [
  { path: '', changeFrequency: 'weekly', priority: 1 },
  { path: '/image', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/video', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/audio', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/pricing', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/privacy', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/terms', changeFrequency: 'monthly', priority: 0.4 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return locales.flatMap((locale) =>
    routes.map(({ path, changeFrequency, priority }) => ({
      url: `${baseUrl}/${locale}${path}`,
      lastModified: new Date(),
      changeFrequency,
      priority,
    }))
  );
}
