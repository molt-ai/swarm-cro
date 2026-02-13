import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

/**
 * POST /api/screenshot
 * Takes a screenshot of a URL using free screenshot services
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Try multiple free screenshot services
    const services = [
      tryThumio,
      tryPagepeeker,
      tryWebsiteScreenshot,
    ];

    for (const service of services) {
      try {
        const result = await service(url);
        if (result) {
          return NextResponse.json({
            success: true,
            original: result,
            optimized: null,
            note: 'Showing original page. CSS preview requires browser automation.',
          });
        }
      } catch (e) {
        console.log(`[Screenshot] Service failed:`, e);
        continue;
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Screenshot services temporarily unavailable',
      note: 'Try again in a few minutes',
    }, { status: 503 });
  } catch (error) {
    console.error('[Screenshot] Error:', error);
    return NextResponse.json(
      { error: 'Screenshot failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Thum.io - completely free, no key needed
async function tryThumio(url: string): Promise<string | null> {
  const apiUrl = `https://image.thum.io/get/width/1200/crop/900/${url}`;
  
  const res = await fetch(apiUrl, { 
    signal: AbortSignal.timeout(25000),
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    }
  });
  
  if (res.ok && res.headers.get('content-type')?.includes('image')) {
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > 5000) {
      return Buffer.from(buffer).toString('base64');
    }
  }
  return null;
}

// Pagepeeker - free tier
async function tryPagepeeker(url: string): Promise<string | null> {
  const encodedUrl = encodeURIComponent(url);
  const apiUrl = `https://api.pagepeeker.com/v2/thumbs.php?size=x&url=${encodedUrl}`;
  
  const res = await fetch(apiUrl, { 
    signal: AbortSignal.timeout(20000) 
  });
  
  if (res.ok && res.headers.get('content-type')?.includes('image')) {
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > 5000) {
      return Buffer.from(buffer).toString('base64');
    }
  }
  return null;
}

// Website Screenshot API (s.wordpress.com)
async function tryWebsiteScreenshot(url: string): Promise<string | null> {
  const encodedUrl = encodeURIComponent(url);
  const apiUrl = `https://s.wordpress.com/mshots/v1/${encodedUrl}?w=1200&h=900`;
  
  const res = await fetch(apiUrl, { 
    signal: AbortSignal.timeout(20000) 
  });
  
  if (res.ok && res.headers.get('content-type')?.includes('image')) {
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > 5000) {
      return Buffer.from(buffer).toString('base64');
    }
  }
  return null;
}

export async function GET() {
  return NextResponse.json({
    message: 'Screenshot API',
    usage: 'POST with { "url": "https://example.com" }',
  });
}
