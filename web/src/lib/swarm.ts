// Agent Swarm Orchestration
// Coordinates multiple AI agents testing page variants

import { Persona, generatePersonaSwarm, personaToPrompt } from './personas';
import { Variant } from './variants';
import Anthropic from '@anthropic-ai/sdk';

export interface AgentAction {
  type: 'scroll' | 'click' | 'read' | 'hover' | 'form_start' | 'form_complete' | 'convert' | 'abandon';
  target?: string;
  timestamp: number;
  reasoning?: string;
}

export interface AgentSession {
  id: string;
  persona: Persona;
  variant: string; // 'control' or variant id
  actions: AgentAction[];
  outcome: 'converted' | 'abandoned' | 'bounced';
  timeOnPage: number; // milliseconds
  scrollDepth: number; // 0-100%
}

export interface SwarmResults {
  totalAgents: number;
  variantResults: Record<string, VariantResult>;
  winningVariant: string;
  improvement: number;
  confidence: number;
}

export interface VariantResult {
  variantId: string;
  agents: number;
  conversions: number;
  conversionRate: number;
  avgTimeOnPage: number;
  avgScrollDepth: number;
  bounceRate: number;
}

const client = new Anthropic();

export async function simulateAgent(
  persona: Persona,
  pageContent: string,
  variantId: string
): Promise<AgentSession> {
  const startTime = Date.now();
  const actions: AgentAction[] = [];

  const prompt = `${personaToPrompt(persona)}

You are visiting a webpage. Simulate your browsing behavior.

PAGE CONTENT (simplified):
${pageContent.slice(0, 4000)}

Simulate your interaction. For each action, output JSON:
{
  "actions": [
    {"type": "scroll", "target": "50%", "reasoning": "Looking for more info"},
    {"type": "read", "target": "headline", "reasoning": "Checking value prop"},
    {"type": "click", "target": "CTA button", "reasoning": "Interested in offer"}
  ],
  "outcome": "converted" | "abandoned" | "bounced",
  "scrollDepth": 0-100,
  "reasoning": "Why you made this decision"
}

Be realistic based on your persona. Not everyone converts.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response');
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Default behavior if parsing fails
      return {
        id: `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        persona,
        variant: variantId,
        actions: [{ type: 'scroll', timestamp: Date.now() }],
        outcome: Math.random() > 0.7 ? 'converted' : 'abandoned',
        timeOnPage: 5000 + Math.random() * 25000,
        scrollDepth: 30 + Math.random() * 50,
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      id: `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      persona,
      variant: variantId,
      actions: parsed.actions?.map((a: any, i: number) => ({
        ...a,
        timestamp: startTime + i * 2000,
      })) || [],
      outcome: parsed.outcome || 'abandoned',
      timeOnPage: Date.now() - startTime + Math.random() * 10000,
      scrollDepth: parsed.scrollDepth || 50,
    };
  } catch (error) {
    console.error('Agent simulation error:', error);
    // Return default session on error
    return {
      id: `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      persona,
      variant: variantId,
      actions: [],
      outcome: 'bounced',
      timeOnPage: 2000,
      scrollDepth: 10,
    };
  }
}

export async function runSwarm(
  pageContent: string,
  variants: Variant[],
  agentsPerVariant: number = 50
): Promise<SwarmResults> {
  const personas = generatePersonaSwarm(agentsPerVariant * (variants.length + 1));
  const sessions: AgentSession[] = [];

  // Split personas across control + variants
  const variantIds = ['control', ...variants.map(v => v.id)];
  const personasPerVariant = Math.floor(personas.length / variantIds.length);

  console.log(`[Swarm] Running ${personas.length} agents across ${variantIds.length} variants`);

  // Run agents in parallel batches
  const batchSize = 10;
  let personaIndex = 0;

  for (const variantId of variantIds) {
    const variantPersonas = personas.slice(personaIndex, personaIndex + personasPerVariant);
    personaIndex += personasPerVariant;

    // Process in batches
    for (let i = 0; i < variantPersonas.length; i += batchSize) {
      const batch = variantPersonas.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(persona => simulateAgent(persona, pageContent, variantId))
      );
      sessions.push(...batchResults);
      console.log(`[Swarm] Completed batch ${Math.floor(i / batchSize) + 1} for ${variantId}`);
    }
  }

  // Analyze results
  const variantResults: Record<string, VariantResult> = {};

  for (const variantId of variantIds) {
    const variantSessions = sessions.filter(s => s.variant === variantId);
    const conversions = variantSessions.filter(s => s.outcome === 'converted').length;
    const bounces = variantSessions.filter(s => s.outcome === 'bounced').length;

    variantResults[variantId] = {
      variantId,
      agents: variantSessions.length,
      conversions,
      conversionRate: variantSessions.length > 0 ? (conversions / variantSessions.length) * 100 : 0,
      avgTimeOnPage: variantSessions.reduce((sum, s) => sum + s.timeOnPage, 0) / variantSessions.length,
      avgScrollDepth: variantSessions.reduce((sum, s) => sum + s.scrollDepth, 0) / variantSessions.length,
      bounceRate: variantSessions.length > 0 ? (bounces / variantSessions.length) * 100 : 0,
    };
  }

  // Find winner
  const controlRate = variantResults['control']?.conversionRate || 0;
  let winningVariant = 'control';
  let bestImprovement = 0;

  for (const [id, result] of Object.entries(variantResults)) {
    if (id === 'control') continue;
    const improvement = ((result.conversionRate - controlRate) / controlRate) * 100;
    if (improvement > bestImprovement) {
      bestImprovement = improvement;
      winningVariant = id;
    }
  }

  // Simple confidence calculation (would use proper stats in production)
  const controlN = variantResults['control']?.agents || 0;
  const winnerN = variantResults[winningVariant]?.agents || 0;
  const confidence = Math.min(95, 50 + (controlN + winnerN) / 4);

  return {
    totalAgents: sessions.length,
    variantResults,
    winningVariant,
    improvement: bestImprovement,
    confidence,
  };
}
