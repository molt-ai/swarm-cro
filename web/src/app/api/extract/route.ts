import { NextRequest, NextResponse } from 'next/server';
import { extractSite } from '@/lib/extractor';

export const maxDuration = 60; // Allow up to 60 seconds for extraction

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
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    console.log(`[Extract] Starting extraction for: ${url}`);
    const startTime = Date.now();

    const result = await extractSite(url);

    const duration = Date.now() - startTime;
    console.log(`[Extract] Completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      data: {
        url: result.url,
        title: result.title,
        meta: result.meta,
        elements: result.elements,
        screenshot: result.screenshot,
        // Don't include full HTML in response - it's too large
        // Store it server-side for variant generation
        htmlLength: result.html.length,
        cssLength: result.css.length,
      },
      duration,
    });
  } catch (error) {
    console.error('[Extract] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to extract site',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Site Extractor API',
    usage: 'POST with { "url": "https://example.com" }',
  });
}
