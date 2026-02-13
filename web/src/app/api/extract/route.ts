import { NextRequest, NextResponse } from 'next/server';
import { extractSiteLite, getScreenshotUrl } from '@/lib/extractor-lite';

export const maxDuration = 30;
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    console.log(`[Extract] Starting extraction for: ${url}`);
    const startTime = Date.now();

    // Use lightweight extractor (fetch + cheerio)
    // This works on Vercel serverless without browser binaries
    const result = await extractSiteLite(url);

    // Try to get screenshot from external service
    let screenshot = '';
    try {
      const screenshotApiUrl = getScreenshotUrl(url);
      const screenshotRes = await fetch(screenshotApiUrl, { 
        signal: AbortSignal.timeout(8000) 
      });
      
      if (screenshotRes.ok) {
        const data = await screenshotRes.json();
        if (data.data?.screenshot?.url) {
          // Fetch the actual screenshot and convert to base64
          const imgRes = await fetch(data.data.screenshot.url);
          if (imgRes.ok) {
            const buffer = await imgRes.arrayBuffer();
            screenshot = Buffer.from(buffer).toString('base64');
          }
        }
      }
    } catch (e) {
      console.log('[Extract] Screenshot fetch skipped:', e instanceof Error ? e.message : 'timeout');
    }

    const duration = Date.now() - startTime;
    console.log(`[Extract] Completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      data: {
        url: result.url,
        title: result.title,
        meta: result.meta,
        elements: result.elements,
        screenshot,
        bodyText: result.bodyText,
        htmlLength: result.html.length,
      },
      duration,
      method: 'lite', // Indicates we used the lightweight extractor
    });
  } catch (error) {
    console.error('[Extract] Error:', error);
    
    // Provide more helpful error messages
    let errorMessage = 'Failed to extract site';
    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        errorMessage = 'Could not reach the website. Please check the URL.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. The site may be slow or blocking requests.';
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Site Extractor API (Lite)',
    usage: 'POST with { "url": "https://example.com" }',
    note: 'Uses fetch + cheerio for Vercel compatibility',
  });
}
