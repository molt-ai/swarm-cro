/**
 * POST /api/swarm/run
 * 
 * Start a swarm experiment with AI agents testing variants.
 */

import { NextRequest, NextResponse } from 'next/server';
import { SwarmRunner } from '@/lib/swarm';
import { PersonaGenerator, getRandomPresetPersonas } from '@/lib/persona';
import type { ExperimentConfig, ExperimentVariant, ConversionGoal } from '@/lib/swarm/types';

export const maxDuration = 300; // 5 minutes max

interface RunRequest {
  url: string;
  variants: Array<{
    id: string;
    name: string;
    isControl: boolean;
    css?: string;
    js?: string;
  }>;
  conversionGoal: {
    type: 'click' | 'submit' | 'navigate' | 'custom';
    target: string;
    description: string;
  };
  sessionsPerVariant?: number;
  targetAudience?: string;
  personaCount?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: RunRequest = await request.json();
    const { 
      url, 
      variants, 
      conversionGoal, 
      sessionsPerVariant = 5,
      targetAudience,
      personaCount = 5,
    } = body;

    if (!url || !variants?.length || !conversionGoal) {
      return NextResponse.json(
        { error: 'Missing required fields: url, variants, conversionGoal' },
        { status: 400 }
      );
    }

    console.log(`[Swarm] Starting experiment for ${url}`);
    console.log(`[Swarm] ${variants.length} variants, ${sessionsPerVariant} sessions each`);

    // Generate or get personas
    let personas;
    if (targetAudience) {
      console.log(`[Swarm] Generating ${personaCount} personas for: ${targetAudience}`);
      const generator = new PersonaGenerator();
      personas = await generator.generatePersonas({
        targetAudience,
        productContext: `Website at ${url}`,
        conversionGoal: conversionGoal.description,
        count: personaCount,
        includeEdgeCases: true,
      });
    } else {
      console.log(`[Swarm] Using ${personaCount} preset personas`);
      personas = getRandomPresetPersonas(personaCount);
    }

    // Create experiment config
    const experimentId = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const config: ExperimentConfig = {
      id: experimentId,
      name: `Experiment for ${new URL(url).hostname}`,
      url,
      variants: variants as ExperimentVariant[],
      conversionGoal: conversionGoal as ConversionGoal,
      personas,
      sessionsPerVariant,
      maxConcurrent: 2, // Conservative to avoid rate limits
    };

    // Run the swarm
    const runner = new SwarmRunner({
      maxConcurrent: 2,
      delayBetweenSessions: 3000, // 3s between batches
    });

    console.log(`[Swarm] Running ${personas.length} personas × ${variants.length} variants × ${sessionsPerVariant} sessions`);

    const results = await runner.runExperiment(config, (status) => {
      console.log(`[Swarm] Progress: ${status.progress.toFixed(0)}% (${status.completedSessions}/${status.totalSessions})`);
    });

    console.log(`[Swarm] Experiment complete. Winner: ${results.winner || 'none'}`);

    return NextResponse.json({
      success: true,
      experimentId,
      results: {
        winner: results.winner,
        confidence: results.confidence,
        isSignificant: results.isSignificant,
        insights: results.insights,
        recommendations: results.recommendations,
        variantResults: results.variantResults,
        totalSessions: results.sessions.length,
      },
      // Include session summaries (not full details to save bandwidth)
      sessions: results.sessions.map(s => ({
        id: s.id,
        personaName: s.persona.name,
        variantId: s.variantId,
        converted: s.converted,
        timeOnPage: s.metrics.timeOnPage,
        scrollDepth: s.metrics.scrollDepthPercent,
        clicks: s.metrics.clickCount,
        impression: s.impression,
        exitReason: s.exitReason,
      })),
    });

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Swarm] Error:', errMsg);
    return NextResponse.json(
      { error: 'Swarm experiment failed', details: errMsg },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Swarm Experiment API',
    usage: {
      method: 'POST',
      body: {
        url: 'https://example.com',
        variants: [
          { id: 'control', name: 'Control', isControl: true },
          { id: 'variant_a', name: 'Variant A', isControl: false, css: '...' },
        ],
        conversionGoal: {
          type: 'click',
          target: 'Sign Up',
          description: 'User clicks sign up button',
        },
        sessionsPerVariant: 5,
        targetAudience: 'Tech-savvy millennials looking for productivity tools',
        personaCount: 5,
      },
    },
  });
}
