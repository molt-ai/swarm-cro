import { NextRequest, NextResponse } from 'next/server';
import { generateTargetedCSS } from '@/lib/preview-lite';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'generate') {
      // Generate CSS based on page analysis
      const { analysis } = body;
      
      const css = generateTargetedCSS(analysis || {
        headings: [],
        ctas: [],
        forms: 0,
      });

      return NextResponse.json({
        success: true,
        css,
        // Note: Screenshots require browser - not available on Vercel serverless
        // Use the original screenshot from extraction instead
        note: 'CSS generated. Screenshots require browser runtime.',
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
