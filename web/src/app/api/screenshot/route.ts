import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

/**
 * POST /api/screenshot
 * For now, return a placeholder - full Browserbase screenshot requires more setup
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Use microlink for screenshots (free tier available)
    const encodedUrl = encodeURIComponent(url);
    const screenshotApiUrl = `https://api.microlink.io/?url=${encodedUrl}&screenshot=true&meta=false&embed=screenshot.url`;
    
    try {
      const res = await fetch(screenshotApiUrl, { 
        signal: AbortSignal.timeout(15000) 
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.data?.screenshot?.url) {
          // Fetch and convert to base64
          const imgRes = await fetch(data.data.screenshot.url);
          if (imgRes.ok) {
            const buffer = await imgRes.arrayBuffer();
            return NextResponse.json({
              success: true,
              original: Buffer.from(buffer).toString('base64'),
              optimized: null, // Would need full browser for CSS injection
              note: 'CSS preview requires Browserbase - showing original only',
            });
          }
        }
      }
    } catch (e) {
      console.log('[Screenshot] Microlink failed:', e);
    }

    return NextResponse.json({
      success: false,
      error: 'Screenshot service unavailable',
      note: 'Full visual preview coming soon',
    });
  } catch (error) {
    console.error('[Screenshot] Error:', error);
    return NextResponse.json(
      { error: 'Screenshot failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Screenshot API',
    usage: 'POST with { "url": "https://example.com" }',
    note: 'Currently using Microlink for screenshots. Full Browserbase preview coming soon.',
  });
}
