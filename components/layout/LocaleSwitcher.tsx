'use client';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useTransition } from 'react';

export default function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const toggle = () => {
    const next = locale === 'en' ? 'ua' : 'en';
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  };

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className="font-dm hidden md:inline-flex items-center gap-[5px] transition-all duration-150"
      style={{
        fontSize: '12px',
        fontWeight: 500,
        padding: '5px 10px',
        borderRadius: '20px',
        background: 'rgba(255,255,255,0.04)',
        border: '0.5px solid rgba(255,255,255,0.1)',
        cursor: isPending ? 'wait' : 'pointer',
        color: 'rgba(255,255,255,0.6)',
        opacity: isPending ? 0.5 : 1,
      }}
      aria-label="Switch language"
    >
      <span style={{ opacity: locale === 'en' ? 1 : 0.38, color: locale === 'en' ? 'rgba(190,165,255,0.9)' : undefined }}>EN</span>
      <span style={{ opacity: 0.2 }}>|</span>
      <span style={{ opacity: locale === 'ua' ? 1 : 0.38, color: locale === 'ua' ? 'rgba(190,165,255,0.9)' : undefined }}>UA</span>
    </button>
  );
}
