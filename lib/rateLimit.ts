const store = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= limit) return { allowed: false };

  entry.count++;
  return { allowed: true };
}

export function isAllowedImageUrl(rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:') return false;

  const h = parsed.hostname;

  // Block private / internal network ranges (SSRF prevention)
  const privatePatterns = [
    /^localhost$/i,
    /^127\./,
    /^0\./,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[01])\./,
    /^192\.168\./,
    /^169\.254\./, // link-local + AWS metadata endpoint
    /^::1$/,
    /^fc[0-9a-f]{2}:/i, // unique local IPv6
    /^fe80:/i,          // link-local IPv6
  ];
  if (privatePatterns.some(p => p.test(h))) return false;

  // Allowlist: Supabase storage + AI provider CDNs
  const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? (() => { try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname; } catch { return null; } })()
    : null;

  const allowed = [
    supabaseHost,
    'v3b.fal.media',
    'fal.media',
    'cdn.higgsfield.ai',
    'image.lexica.art',
  ].filter(Boolean) as string[];

  return allowed.some(d => h === d || h.endsWith(`.${d}`));
}

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
]);

export function isAllowedMime(mime: string): boolean {
  return ALLOWED_MIME.has(mime.toLowerCase().split(';')[0].trim());
}

export function sanitizeFileName(raw: string): string {
  // Strip any path components, keep only the basename
  const base = raw.split(/[\\/]/).pop() ?? 'file';
  // Remove any characters that aren't alphanumeric, dash, underscore or dot
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
}
