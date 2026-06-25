import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Allowed video CDN hostnames — server fetches on behalf of the user
const ALLOWED_HOSTS = new Set([
  'generativelanguage.googleapis.com',
  // Kling
  'p1-boe-sign.byteimg.com',
  'p3-arcosite.byteimg.com',
  'p9-arcosite.byteimg.com',
  'p16-arcosite.byteimg.com',
  'p6-sign-va.byteimg.com',
  'p16-sign-va.byteimg.com',
  // ByteDance Ark
  'ark-cn-beijing.bytedance.net',
  'ark-ap-southeast.bytedance.net',
  'lf-flow-web-cdn.doubao.com',
  // Alibaba / DashScope
  'dashscope-result-sh.oss-cn-shanghai.aliyuncs.com',
  'dashscope-result-bj.oss-cn-beijing.aliyuncs.com',
  'dashscope-result-ap-southeast.oss-ap-southeast-1.aliyuncs.com',
  'maas-cn-beijing.oss-cn-beijing.aliyuncs.com',
]);

const isAllowedHost = (hostname: string) => {
  if (ALLOWED_HOSTS.has(hostname)) return true;
  // Wildcard suffix matching for CDN subdomains
  return (
    hostname.endsWith('.byteimg.com') ||
    hostname.endsWith('.bytedance.net') ||
    hostname.endsWith('.aliyuncs.com') ||
    hostname.endsWith('.doubao.com') ||
    hostname.endsWith('.klingai.com') ||
    hostname.endsWith('.volces.com')
  );
};

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 403 });
  }

  if (!['https:'].includes(parsed.protocol)) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 403 });
  }

  if (!isAllowedHost(parsed.hostname)) {
    console.error('[video-proxy] blocked hostname:', parsed.hostname);
    return NextResponse.json({ error: `URL not allowed: ${parsed.hostname}` }, { status: 403 });
  }

  // Special handling: Google needs API key injected server-side
  let fetchUrl = url;
  if (parsed.hostname === 'generativelanguage.googleapis.com') {
    const validPath = /^\/v1beta\/files\/[A-Za-z0-9_-]+:download$/.test(parsed.pathname);
    if (!validPath) return NextResponse.json({ error: 'Invalid URL' }, { status: 403 });
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    fetchUrl = `https://generativelanguage.googleapis.com${parsed.pathname}?alt=media&key=${apiKey}`;
  }

  const response = await fetch(fetchUrl, { signal: AbortSignal.timeout(55_000) });
  if (!response.ok) {
    console.error('[video-proxy] upstream failed:', response.status, response.statusText, 'url:', parsed.hostname + parsed.pathname.slice(0, 40));
    return NextResponse.json({ error: `Upstream ${response.status}: ${response.statusText}` }, { status: 502 });
  }

  const upstreamType = response.headers.get('Content-Type') ?? '';
  const contentType = upstreamType.startsWith('video/') ? upstreamType : 'video/mp4';

  return new NextResponse(response.body, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': 'attachment; filename="video.mp4"',
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
