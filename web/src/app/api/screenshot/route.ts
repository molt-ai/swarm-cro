import { NextRequest, NextResponse } from 'next/server';
import { Stagehand } from '@browserbasehq/stagehand';

export const maxDuration = 60;

/**
 * POST /api/screenshot
 * Takes before/after screenshots using Browserbase
 */
export async function POST(request: NextRequest) {
  let stagehand: Stagehand | null = null;
  
  try {
    const body = await request.json();
    const { url, cssChanges } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    console.log('[Screenshot] Starting Browserbase session for:', url);

    // Initialize Stagehand with Browserbase
    stagehand = new Stagehand({
      env: 'BROWSERBASE',
      apiKey: process.env.ANTHROPIC_API_KEY,
      browserbaseApiKey: process.env.BROWSERBASE_API_KEY,
      headless: true,
      enableCaching: false,
    });

    await stagehand.init();
    const page = stagehand.page;

    // Navigate to URL
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait a bit for any animations
    await page.waitForTimeout(1500);

    // Take "before" screenshot
    const beforeBuffer = await page.screenshot({ 
      type: 'jpeg',
      quality: 80,
      fullPage: false, // viewport only for speed
    });
    const beforeBase64 = beforeBuffer.toString('base64');

    let afterBase64: string | null = null;

    // If we have CSS changes, inject them and take "after" screenshot
    if (cssChanges && cssChanges.trim()) {
      console.log('[Screenshot] Injecting CSS changes...');
      
      // Inject CSS
      await page.addStyleTag({ content: cssChanges });
      
      // Wait for styles to apply
      await page.waitForTimeout(500);
      
      // Take "after" screenshot
      const afterBuffer = await page.screenshot({ 
        type: 'jpeg',
        quality: 80,
        fullPage: false,
      });
      afterBase64 = afterBuffer.toString('base64');
    }

    await stagehand.close();

    console.log('[Screenshot] Success - before:', beforeBase64.length, 'chars, after:', afterBase64?.length || 0, 'chars');

    return NextResponse.json({
      success: true,
      original: beforeBase64,
      optimized: afterBase64,
    });
  } catch (error) {
    console.error('[Screenshot] Error:', error);
    
    // Try to close stagehand if it exists
    if (stagehand) {
      try {
        await stagehand.close();
      } catch (e) {
        // Ignore close errors
      }
    }

    // Fallback to free screenshot service
    try {
      const { url } = await request.json().catch(() => ({ url: '' }));
      if (url) {
        const fallback = await tryFallbackScreenshot(url);
        if (fallback) {
          return NextResponse.json({
            success: true,
            original: fallback,
            optimized: null,
            note: 'Browserbase unavailable, using fallback service',
          });
        }
      }
    } catch (e) {
      // Ignore fallback errors
    }

    return NextResponse.json(
      { 
        error: 'Screenshot failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Fallback to free service if Browserbase fails
async function tryFallbackScreenshot(url: string): Promise<string | null> {
  const apiUrl = `https://image.thum.io/get/width/1200/crop/900/${url}`;
  
  const res = await fetch(apiUrl, { 
    signal: AbortSignal.timeout(15000),
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
    usage: 'POST with { "url": "https://example.com", "cssChanges": "h1 { color: red; }" }',
    features: ['before/after screenshots', 'CSS injection', 'Browserbase powered'],
  });
}
