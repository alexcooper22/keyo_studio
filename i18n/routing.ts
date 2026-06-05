import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'ua'] as const,
  defaultLocale: 'en',
  localePrefix: 'always',
});
