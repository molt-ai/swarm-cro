import { NextRequest, NextResponse } from 'next/server';
import Browserbase from '@browserbasehq/sdk';
import { chromium, type Browser, type Page } from 'playwright-core';

export const maxDuration = 60;

/**
 * POST /api/screenshot
 * Takes before/after screenshots using Browserbase
 */
export async function POST(request: NextRequest) {
  let browser: Browser | null = null;
  
  try {
    const body = await request.json();
    const { url, changes } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Parse changes (can be JSON string or object)
    let cssChanges = '';
    let jsChanges = '';
    try {
      const parsed = typeof changes === 'string' ? JSON.parse(changes) : changes;
      cssChanges = parsed?.css || '';
      jsChanges = parsed?.js || '';
    } catch {
      cssChanges = changes || '';
    }

    const apiKey = process.env.BROWSERBASE_API_KEY;
    const projectId = process.env.BROWSERBASE_PROJECT_ID;

    if (!apiKey || !projectId) {
      // Fallback to free screenshot service
      const fallback = await tryFallbackScreenshot(url);
      if (fallback) {
        return NextResponse.json({
          success: true,
          original: fallback,
          optimized: null,
          note: 'Browserbase not configured, using fallback',
        });
      }
      return NextResponse.json({ 
        error: 'BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID required' 
      }, { status: 500 });
    }

    console.log('[Screenshot] Starting Browserbase session for:', url);

    // Create Browserbase session
    const bb = new Browserbase({ apiKey });
    const session = await bb.sessions.create({ projectId });
    
    // Connect via Playwright
    browser = await chromium.connectOverCDP(session.connectUrl);
    const context = browser.contexts()[0];
    const page = context.pages()[0] || await context.newPage();

    // Navigate to URL - use domcontentloaded for speed (networkidle is too slow)
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(800); // Brief wait for critical renders

    // Take "before" screenshot
    const beforeBuffer = await page.screenshot({ 
      type: 'jpeg',
      quality: 80,
    });
    const beforeBase64 = beforeBuffer.toString('base64');

    let afterBase64: string | null = null;
    const hasChanges = (cssChanges && cssChanges.trim()) || (jsChanges && jsChanges.trim());

    if (hasChanges) {
      console.log('[Screenshot] Injecting changes...');
      
      if (cssChanges && cssChanges.trim()) {
        await page.addStyleTag({ content: cssChanges });
      }
      
      if (jsChanges && jsChanges.trim()) {
        await page.evaluate((js) => {
          try { eval(js); } catch (e) { console.error('JS error:', e); }
        }, jsChanges);
      }
      
      await page.waitForTimeout(400);
      
      const afterBuffer = await page.screenshot({ 
        type: 'jpeg',
        quality: 80,
      });
      afterBase64 = afterBuffer.toString('base64');
    }

    await browser.close();

    console.log('[Screenshot] Success');
    return NextResponse.json({
      success: true,
      original: beforeBase64,
      optimized: afterBase64,
    });

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Screenshot] Error:', errMsg);
    
    if (browser) {
      try { await browser.close(); } catch {}
    }

    // Fallback to free service
    try {
      const body = await request.clone().json().catch(() => ({}));
      const fallbackUrl = body.url;
      if (fallbackUrl) {
        console.log('[Screenshot] Trying fallback for:', fallbackUrl);
        const fallback = await tryFallbackScreenshot(fallbackUrl);
        if (fallback) {
          return NextResponse.json({
            success: true,
            original: fallback,
            optimized: null,
            note: 'Used fallback service (Browserbase timed out)',
          });
        }
      }
    } catch (fallbackErr) {
      console.error('[Screenshot] Fallback also failed:', fallbackErr);
    }

    return NextResponse.json(
      { error: 'Screenshot failed', details: errMsg },
      { status: 500 }
    );
  }
}

async function tryFallbackScreenshot(url: string): Promise<string | null> {
  const apiUrl = `https://image.thum.io/get/width/1200/crop/900/${url}`;
  const res = await fetch(apiUrl, { signal: AbortSignal.timeout(15000) });
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
    message: 'Screenshot API - Browserbase powered',
    usage: 'POST { url, changes: { css, js } }',
  });
}
