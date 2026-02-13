/**
 * POST /api/swarm/test
 * 
 * Run a single agent session for testing purposes.
 * Useful for debugging and demonstrating agent behavior.
 */

import { NextRequest, NextResponse } from 'next/server';
import { SwarmRunner } from '@/lib/swarm';
import { getPresetPersona, type PersonaPreset } from '@/lib/persona';

export const maxDuration = 120; // 2 minutes max

interface TestRequest {
  url: string;
  personaPreset?: PersonaPreset;
  conversionGoal?: {
    type: 'click' | 'submit' | 'navigate' | 'custom';
    target: string;
    description: string;
  };
  css?: string;
  js?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: TestRequest = await request.json();
    const { 
      url, 
      personaPreset = 'impatient-mobile',
      conversionGoal = {
        type: 'click' as const,
        target: 'Sign Up',
        description: 'Click any call-to-action button',
      },
      css,
      js,
    } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    console.log(`[Swarm Test] Running single agent on ${url}`);
    console.log(`[Swarm Test] Persona: ${personaPreset}`);

    const persona = getPresetPersona(personaPreset);
    const runner = new SwarmRunner();

    const session = await runner.runSingleSession(
      url,
      persona,
      'test',
      conversionGoal,
      css || js ? { css, js } : undefined
    );

    console.log(`[Swarm Test] Session complete. Converted: ${session.converted}`);

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        persona: {
          name: session.persona.name,
          description: session.persona.description,
          device: session.persona.demographics.device,
          patience: session.persona.behavior.patience,
        },
        actions: session.actions.map(a => ({
          type: a.type,
          target: a.target,
          reasoning: a.reasoning,
          timestamp: a.timestamp,
        })),
        metrics: {
          timeOnPage: session.metrics.timeOnPage,
          scrollDepthPercent: session.metrics.scrollDepthPercent,
          clickCount: session.metrics.clickCount,
          loadTimeMs: session.metrics.loadTimeMs,
        },
        converted: session.converted,
        conversionTrigger: session.conversionTrigger,
        exitReason: session.exitReason,
        impression: session.impression,
        feedback: session.feedback,
      },
    });

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Swarm Test] Error:', errMsg);
    return NextResponse.json(
      { error: 'Test session failed', details: errMsg },
      { status: 500 }
    );
  }
}

export async function GET() {
  const presets = [
    'impatient-mobile',
    'thorough-researcher', 
    'skeptical-buyer',
    'impulse-shopper',
    'price-conscious',
    'tech-confused',
    'power-user',
  ];

  return NextResponse.json({
    message: 'Swarm Test API - Run a single agent session',
    usage: {
      method: 'POST',
      body: {
        url: 'https://example.com',
        personaPreset: 'impatient-mobile',
        conversionGoal: {
          type: 'click',
          target: 'Sign Up',
          description: 'Click sign up button',
        },
        css: 'optional CSS to inject',
        js: 'optional JS to inject',
      },
    },
    availablePresets: presets,
  });
}
