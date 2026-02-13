/**
 * POST /api/swarm/stream
 * 
 * Server-Sent Events endpoint for streaming experiment progress.
 * Returns real-time updates as agents complete sessions.
 */

import { NextRequest } from 'next/server';
import { SwarmRunner } from '@/lib/swarm';
import { PersonaGenerator, getRandomPresetPersonas } from '@/lib/persona';
import type { ExperimentConfig, ExperimentVariant, ConversionGoal, ExperimentStatus } from '@/lib/swarm/types';

export const maxDuration = 300; // 5 minutes max

interface StreamRequest {
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
  const body: StreamRequest = await request.json();
  const { 
    url, 
    variants, 
    conversionGoal, 
    sessionsPerVariant = 5,
    targetAudience,
    personaCount = 5,
  } = body;

  if (!url || !variants?.length || !conversionGoal) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Create a readable stream for SSE
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Send initial status
        send('status', { state: 'initializing', message: 'Setting up experiment...' });

        // Generate personas
        send('status', { state: 'generating_personas', message: 'Creating AI personas...' });
        
        let personas;
        if (targetAudience) {
          const generator = new PersonaGenerator();
          personas = await generator.generatePersonas({
            targetAudience,
            productContext: `Website at ${url}`,
            conversionGoal: conversionGoal.description,
            count: personaCount,
            includeEdgeCases: true,
          });
        } else {
          personas = getRandomPresetPersonas(personaCount);
        }

        send('personas', { 
          count: personas.length, 
          names: personas.map(p => p.name) 
        });

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
          maxConcurrent: 2,
        };

        send('status', { 
          state: 'running', 
          message: 'Launching AI agents...',
          totalSessions: variants.length * sessionsPerVariant,
        });

        // Run the swarm with progress callback
        const runner = new SwarmRunner({
          maxConcurrent: 2,
          delayBetweenSessions: 3000,
        });

        const results = await runner.runExperiment(config, (status: ExperimentStatus) => {
          send('progress', {
            completedSessions: status.completedSessions,
            totalSessions: status.totalSessions,
            progress: Math.round(status.progress),
            sessionsByVariant: status.sessionsByVariant,
            estimatedTimeRemaining: status.estimatedTimeRemaining,
          });
        });

        // Send final results
        send('complete', {
          experimentId,
          winner: results.winner,
          confidence: results.confidence,
          isSignificant: results.isSignificant,
          insights: results.insights,
          recommendations: results.recommendations,
          variantResults: results.variantResults,
          totalSessions: results.sessions.length,
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

        controller.close();

      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        send('error', { message: errMsg });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
