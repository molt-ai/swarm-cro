import { NextRequest, NextResponse } from 'next/server';
import { BrowserAgent } from '@/lib/agent/browser-agent';
import { generatePersona, personaToDescription } from '@/lib/agent/persona-generator';

export const maxDuration = 120; // 2 minutes max

/**
 * POST /api/test-agent
 * Quick test of a single agent on a URL
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    console.log(`[TestAgent] Starting single agent test on ${url}`);
    const startTime = Date.now();

    // Generate a single persona
    const persona = generatePersona('saas');
    console.log(`[TestAgent] Persona: ${persona.demographics.age}yo ${persona.demographics.gender}`);

    // Run the agent
    const agent = new BrowserAgent(persona, { maxActions: 10 });
    
    const result = await agent.runSession(url, undefined, {
      headless: true,
    });

    const duration = Date.now() - startTime;
    console.log(`[TestAgent] Completed in ${duration}ms, converted: ${result.converted}`);

    return NextResponse.json({
      success: true,
      persona: {
        description: personaToDescription(persona),
        demographics: persona.demographics,
        psychographics: persona.psychographics,
        goals: persona.goals,
      },
      result: {
        converted: result.converted,
        exitReason: result.exitReason,
        timeOnPage: result.metrics.timeOnPage,
        scrollDepth: result.metrics.scrollDepth,
        actionsCount: result.actions.length,
        actions: result.actions.map(a => ({
          type: a.type,
          target: a.target,
          reasoning: a.reasoning,
        })),
      },
      duration,
    });
  } catch (error) {
    console.error('[TestAgent] Error:', error);
    return NextResponse.json(
      { 
        error: 'Agent test failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Single Agent Test API',
    usage: 'POST with { "url": "https://example.com" }',
    note: 'Tests a single AI agent browsing behavior on the given URL',
  });
}
