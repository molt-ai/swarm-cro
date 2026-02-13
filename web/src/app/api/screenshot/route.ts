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

    // Try multiple screenshot services in order
    const services = [
      tryScreenshotMachine,
      tryThumbio,
      tryPagepeeker,
    ];

    for (const service of services) {
      try {
        const result = await service(url);
        if (result) {
          return NextResponse.json({
            success: true,
            original: result,
            optimized: null, // Would need Browserbase for CSS injection
            note: 'Showing original page. CSS preview requires browser automation.',
          });
        }
      } catch (e) {
        console.log(`[Screenshot] Service failed:`, e);
        continue;
      }
    }

    // All services failed
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

// Screenshot Machine (has generous free tier)
async function tryScreenshotMachine(url: string): Promise<string | null> {
  const key = 'free';  // They have a 'free' key that works for basic screenshots
  const encodedUrl = encodeURIComponent(url);
  const apiUrl = `https://api.screenshotmachine.com/?key=${key}&url=${encodedUrl}&dimension=1024x768&format=jpg&delay=2000`;
  
  const res = await fetch(apiUrl, { 
    signal: AbortSignal.timeout(20000) 
  });
  
  if (res.ok && res.headers.get('content-type')?.includes('image')) {
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > 5000) { // Valid image is usually > 5KB
      return Buffer.from(buffer).toString('base64');
    }
  }
  return null;
}

// Thum.io (free tier)
async function tryThumbio(url: string): Promise<string | null> {
  const encodedUrl = encodeURIComponent(url);
  const apiUrl = `https://image.thum.io/get/width/1024/crop/768/${url}`;
  
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

// Pagepeeker (free)
async function tryPagepeeker(url: string): Promise<string | null> {
  const encodedUrl = encodeURIComponent(url);
  const apiUrl = `https://api.pagepeeker.com/v2/thumbs.php?size=l&url=${encodedUrl}`;
  
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
    services: ['screenshotmachine', 'thum.io', 'pagepeeker'],
  });
}
