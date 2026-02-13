import { NextRequest, NextResponse } from 'next/server';
import { generateVariants, PageAnalysis } from '@/lib/variants';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, analysis, numVariants = 3 } = body;

    if (!url || !analysis) {
      return NextResponse.json(
        { error: 'URL and analysis are required' },
        { status: 400 }
      );
    }

    console.log(`[Variants] Generating ${numVariants} variants for: ${url}`);
    const startTime = Date.now();

    const variants = await generateVariants(url, analysis as PageAnalysis, numVariants);

    const duration = Date.now() - startTime;
    console.log(`[Variants] Generated ${variants.length} variants in ${duration}ms`);

    return NextResponse.json({
      success: true,
      data: {
        url,
        variants,
        count: variants.length,
      },
      duration,
    });
  } catch (error) {
    console.error('[Variants] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate variants',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
