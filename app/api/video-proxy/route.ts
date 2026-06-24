import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });

  // Strictly validate: only allow Google Files API video-download paths
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 403 });
  }

  const validHost = parsed.hostname === 'generativelanguage.googleapis.com';
  const validPath = /^\/v1beta\/files\/[A-Za-z0-9_-]+:download$/.test(parsed.pathname);
  if (!validHost || !validPath) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 403 });
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Not configured' }, { status: 500 });

  // Construct URL server-side — never trust query params from upstream
  const fullUrl = `https://generativelanguage.googleapis.com${parsed.pathname}?alt=media&key=${apiKey}`;

  const response = await fetch(fullUrl, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) {
    return NextResponse.json({ error: 'Failed to fetch video' }, { status: 502 });
  }

  // Only forward video MIME types — never reflect arbitrary Content-Type (XSS prevention)
  const upstreamType = response.headers.get('Content-Type') ?? '';
  const contentType = upstreamType.startsWith('video/') ? upstreamType : 'video/mp4';

  return new NextResponse(response.body, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': 'inline; filename="video.mp4"',
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
