import { NextRequest, NextResponse } from 'next/server';
import { generatePreviewScreenshots, generateTargetedCSS } from '@/lib/preview';

export const maxDuration = 60;

// Store extracted HTML in memory (in production, use Redis/DB)
const htmlStore = new Map<string, { html: string; analysis: any }>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'store') {
      // Store HTML for later preview generation
      const { html, analysis } = body;
      const id = `page_${Date.now()}`;
      htmlStore.set(id, { html, analysis });
      return NextResponse.json({ success: true, id });
    }

    if (action === 'generate') {
      // Generate before/after screenshots
      const { pageId, html, cssOverrides, analysis } = body;
      
      let baseHtml = html;
      let pageAnalysis = analysis;
      
      // Try to get from store if pageId provided
      if (pageId && htmlStore.has(pageId)) {
        const stored = htmlStore.get(pageId)!;
        baseHtml = stored.html;
        pageAnalysis = stored.analysis;
      }
      
      if (!baseHtml) {
        return NextResponse.json({ error: 'No HTML to preview' }, { status: 400 });
      }

      // Generate CSS if not provided
      const css = cssOverrides || generateTargetedCSS(pageAnalysis || {
        headings: [],
        ctas: [],
        forms: 0,
      });

      console.log('[Preview] Generating screenshots...');
      const startTime = Date.now();

      const screenshots = await generatePreviewScreenshots(baseHtml, css);

      const duration = Date.now() - startTime;
      console.log(`[Preview] Generated in ${duration}ms`);

      return NextResponse.json({
        success: true,
        original: screenshots.original,
        optimized: screenshots.optimized,
        css,
        duration,
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
