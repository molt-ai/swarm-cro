import { NextRequest, NextResponse } from 'next/server';
import { BrowserAgent } from '@/lib/agent/browser-agent';
import { ResearcherAgent } from '@/lib/agent/researcher-agent';
import { generatePersonaSwarm } from '@/lib/agent/persona-generator';
import type { Experiment, AgentSessionResult, Variant } from '@/lib/agent/types';

export const maxDuration = 300; // 5 minutes max for experiment

/**
 * POST /api/experiment
 * Run a real A/B test with browser agents
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      url, 
      agentCount = 10,
      variants = [],
      hypothesis,
      siteType = 'saas',
    } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    console.log(`[Experiment] Starting with ${agentCount} agents on ${url}`);
    const startTime = Date.now();

    // Generate personas
    const personas = generatePersonaSwarm(agentCount, siteType);
    console.log(`[Experiment] Generated ${personas.length} personas`);

    // Create control variant (no changes)
    const control: Variant = {
      id: 'control',
      name: 'Control',
      description: 'Original page without modifications',
      changes: [],
    };

    // Parse variants or generate if not provided
    let testVariants = variants.length > 0 ? variants : [];
    
    if (testVariants.length === 0 && hypothesis) {
      // Use researcher to generate a variant from hypothesis
      const researcher = new ResearcherAgent();
      const generatedVariant = await researcher.createVariantFromHypothesis(
        hypothesis,
        `Page at ${url}` // Would normally extract page content
      );
      testVariants = [generatedVariant];
    }

    // If still no variants, create a default test variant
    if (testVariants.length === 0) {
      testVariants = [{
        id: 'variant_1',
        name: 'CTA Enhancement',
        description: 'Enhanced call-to-action styling',
        changes: [
          {
            type: 'modify' as const,
            target: 'button[type="submit"], .cta, .btn-primary',
            property: 'style',
            newValue: 'background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%) !important; color: white !important; padding: 14px 28px !important; font-weight: 600 !important; border-radius: 8px !important; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.4) !important;',
          },
        ],
      }];
    }

    const allVariants = [control, ...testVariants];
    
    // Allocate personas to variants (simple round-robin)
    const variantAssignments: Record<string, typeof personas> = {};
    allVariants.forEach(v => variantAssignments[v.id] = []);
    
    personas.forEach((persona, i) => {
      const variantIndex = i % allVariants.length;
      variantAssignments[allVariants[variantIndex].id].push(persona);
    });

    // Run agents (in batches to respect Browserbase limits)
    const results: AgentSessionResult[] = [];
    const batchSize = 2; // Free tier: 1 concurrent browser, so run sequentially
    
    for (const variant of allVariants) {
      const variantPersonas = variantAssignments[variant.id];
      console.log(`[Experiment] Running ${variantPersonas.length} agents for ${variant.name}`);
      
      for (let i = 0; i < variantPersonas.length; i += batchSize) {
        const batch = variantPersonas.slice(i, i + batchSize);
        
        // Run batch sequentially (for free tier)
        for (const persona of batch) {
          try {
            const agent = new BrowserAgent(persona, { maxActions: 15 });
            const result = await agent.runSession(
              url,
              variant.id === 'control' ? undefined : variant,
              { headless: true }
            );
            results.push(result);
            console.log(`[Experiment] Agent ${persona.id} completed: converted=${result.converted}`);
          } catch (e) {
            console.error(`[Experiment] Agent error:`, e);
          }
        }
      }
    }

    // Analyze results
    const researcher = new ResearcherAgent();
    const experiment: Experiment = {
      id: `exp_${Date.now()}`,
      name: `A/B Test: ${url}`,
      url,
      hypothesis: hypothesis || 'Testing variant improvements',
      control,
      variants: testVariants,
      sampleSize: agentCount,
      trafficAllocation: Object.fromEntries(
        allVariants.map(v => [v.id, 100 / allVariants.length])
      ),
      conversionGoal: 'click_cta',
      status: 'completed',
    };

    const analysis = await researcher.analyzeExperiment(experiment, results);

    const duration = Date.now() - startTime;
    console.log(`[Experiment] Completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      experiment: {
        ...experiment,
        results: {
          totalSessions: results.length,
          variantResults: aggregateResults(results),
          insights: analysis.keyFindings,
        },
      },
      analysis: {
        summary: analysis.summary,
        keyFindings: analysis.keyFindings,
        recommendations: analysis.recommendations,
        nextHypotheses: analysis.hypotheses,
      },
      rawSessions: results.map(r => ({
        persona: {
          age: r.persona.demographics.age,
          gender: r.persona.demographics.gender,
          techSavvy: r.persona.psychographics.techSavvy,
        },
        variant: r.variant,
        converted: r.converted,
        timeOnPage: r.metrics.timeOnPage,
        actions: r.actions.length,
        exitReason: r.exitReason,
      })),
      duration,
    });
  } catch (error) {
    console.error('[Experiment] Error:', error);
    return NextResponse.json(
      { error: 'Experiment failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function aggregateResults(sessions: AgentSessionResult[]) {
  const byVariant: Record<string, AgentSessionResult[]> = {};
  
  for (const s of sessions) {
    if (!byVariant[s.variant]) byVariant[s.variant] = [];
    byVariant[s.variant].push(s);
  }

  const results: Record<string, any> = {};
  
  for (const [variantId, variantSessions] of Object.entries(byVariant)) {
    const conversions = variantSessions.filter(s => s.converted).length;
    results[variantId] = {
      sessions: variantSessions.length,
      conversions,
      conversionRate: variantSessions.length > 0 
        ? (conversions / variantSessions.length) * 100 
        : 0,
      avgTimeOnPage: variantSessions.reduce((sum, s) => sum + s.metrics.timeOnPage, 0) / variantSessions.length,
      avgScrollDepth: variantSessions.reduce((sum, s) => sum + s.metrics.scrollDepth, 0) / variantSessions.length,
    };
  }

  return results;
}

export async function GET() {
  return NextResponse.json({
    message: 'Experiment API',
    usage: {
      method: 'POST',
      body: {
        url: 'https://example.com (required)',
        agentCount: '10 (optional, default 10)',
        hypothesis: 'What you want to test (optional)',
        siteType: 'saas | shopping | content | service (optional)',
        variants: '[{ id, name, changes }] (optional, will auto-generate)',
      },
    },
  });
}
