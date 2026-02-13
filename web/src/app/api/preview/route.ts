import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';

export const maxDuration = 60;

// Store extracted HTML in memory (in production, use Redis/DB)
const htmlStore = new Map<string, string>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, html, css, action } = body;

    if (action === 'store') {
      // Store the original HTML for later modification
      const id = `page_${Date.now()}`;
      htmlStore.set(id, html);
      return NextResponse.json({ success: true, id });
    }

    if (action === 'preview') {
      // Generate a preview with CSS modifications applied
      const { pageId, cssOverrides } = body;
      
      let baseHtml = htmlStore.get(pageId) || html;
      
      if (!baseHtml) {
        return NextResponse.json({ error: 'No HTML to preview' }, { status: 400 });
      }

      // Inject CSS overrides into the HTML
      const modifiedHtml = injectCSS(baseHtml, cssOverrides || '');

      // Take a screenshot of the modified page
      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        viewport: { width: 375, height: 812 }, // Mobile viewport
      });
      const page = await context.newPage();

      // Load the modified HTML directly
      await page.setContent(modifiedHtml, { waitUntil: 'networkidle' });

      // Take screenshot
      const screenshot = await page.screenshot({
        type: 'jpeg',
        quality: 80,
        fullPage: false,
      });

      await browser.close();

      const base64 = screenshot.toString('base64');

      return NextResponse.json({
        success: true,
        screenshot: base64,
        html: modifiedHtml,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[Preview] Error:', error);
    return NextResponse.json(
      { error: 'Preview generation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function injectCSS(html: string, css: string): string {
  // Inject CSS overrides just before </head>
  const styleTag = `
<style id="swarmcro-optimizations">
/* SwarmCRO Optimizations */
${css}
</style>`;

  if (html.includes('</head>')) {
    return html.replace('</head>', `${styleTag}\n</head>`);
  } else if (html.includes('<body')) {
    return html.replace('<body', `${styleTag}\n<body`);
  } else {
    return styleTag + html;
  }
}
