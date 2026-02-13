import { NextRequest, NextResponse } from 'next/server';
import { runSwarm } from '@/lib/swarm';
import { Variant } from '@/lib/variants';

export const maxDuration = 300; // Allow up to 5 minutes for swarm

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pageContent, variants, agentsPerVariant = 10 } = body;

    if (!pageContent) {
      return NextResponse.json(
        { error: 'pageContent is required' },
        { status: 400 }
      );
    }

    console.log(`[Swarm] Starting swarm with ${agentsPerVariant} agents per variant`);
    const startTime = Date.now();

    const results = await runSwarm(
      pageContent,
      variants as Variant[] || [],
      agentsPerVariant
    );

    const duration = Date.now() - startTime;
    console.log(`[Swarm] Completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      data: results,
      duration,
    });
  } catch (error) {
    console.error('[Swarm] Error:', error);
    return NextResponse.json(
      {
        error: 'Swarm simulation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
