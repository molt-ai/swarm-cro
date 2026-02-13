/**
 * Persona Generator
 * 
 * Uses AI to generate diverse, realistic personas for A/B testing.
 * Can create custom personas from target audience descriptions or
 * use preset templates.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { Persona, PersonaGenerationRequest } from './types';
import { getRandomPresetPersonas, PERSONA_PRESETS } from './presets';

export class PersonaGenerator {
  private anthropic: Anthropic;
  private maxRetries = 3;

  constructor(apiKey?: string) {
    this.anthropic = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * API call with retry logic for rate limits
   */
  private async callWithRetry<T>(
    fn: () => Promise<T>,
    retries = this.maxRetries
  ): Promise<T> {
    try {
      return await fn();
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      const isRateLimit = err?.status === 429 || 
                          err?.message?.includes('rate') ||
                          err?.message?.includes('Rate');
      
      if (isRateLimit && retries > 0) {
        const delay = Math.pow(2, this.maxRetries - retries) * 1000;
        console.log(`[PersonaGenerator] Rate limited, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.callWithRetry(fn, retries - 1);
      }
      throw error;
    }
  }

  /**
   * Generate personas for an experiment
   */
  async generatePersonas(request: PersonaGenerationRequest): Promise<Persona[]> {
    const {
      targetAudience,
      productContext,
      conversionGoal,
      count,
      includeEdgeCases = true,
    } = request;

    // For small counts, mix presets with generated
    if (count <= 3) {
      return this.generateCustomPersonas(request);
    }

    // For larger counts, generate custom + add presets
    const customCount = Math.ceil(count * 0.6);
    const presetCount = count - customCount;

    const [customPersonas, presetPersonas] = await Promise.all([
      this.generateCustomPersonas({ ...request, count: customCount }),
      Promise.resolve(getRandomPresetPersonas(presetCount)),
    ]);

    // Customize presets for this context
    const contextualizedPresets = presetPersonas.map(p => ({
      ...p,
      intent: {
        ...p.intent,
        goal: `${p.intent.goal} - specifically: ${conversionGoal}`,
      },
    }));

    return [...customPersonas, ...contextualizedPresets];
  }

  /**
   * Generate fully custom personas using AI
   */
  async generateCustomPersonas(request: PersonaGenerationRequest): Promise<Persona[]> {
    const { targetAudience, productContext, conversionGoal, count, includeEdgeCases } = request;

    const prompt = `You are a UX researcher creating user personas for A/B testing.

CONTEXT:
- Product/Service: ${productContext}
- Target Audience: ${targetAudience}
- Conversion Goal: ${conversionGoal}
- Include Edge Cases: ${includeEdgeCases ? 'Yes (frustrated users, skeptics, etc.)' : 'No (mainstream users only)'}

Generate ${count} diverse, realistic personas. Each persona should represent a distinct user type with different:
- Demographics and tech comfort
- Browsing behaviors and patience levels
- Goals and motivations
- Conversion triggers and dealbreakers

IMPORTANT: Make them feel like REAL people, not marketing stereotypes. Include specific behavioral quirks.

Respond with a JSON array:
[
  {
    "name": "Alliterative Name (e.g., 'Busy Brian')",
    "description": "One sentence describing who they are and their context",
    "demographics": {
      "ageRange": "18-24" | "25-34" | "35-44" | "45-54" | "55-64" | "65+",
      "techSavviness": "low" | "medium" | "high",
      "device": "mobile" | "tablet" | "desktop",
      "connectionSpeed": "slow" | "moderate" | "fast"
    },
    "behavior": {
      "patience": 1-10,
      "thoroughness": 1-10,
      "clickiness": 1-10,
      "scrollSpeed": 1-10,
      "frustrationTolerance": 1-10,
      "skepticism": 1-10
    },
    "intent": {
      "goal": "What they're trying to accomplish",
      "urgency": 1-10,
      "priorKnowledge": "none" | "some" | "expert",
      "conversionTriggers": ["What would make them convert"],
      "dealbreakers": ["What would make them leave"]
    },
    "agentInstructions": "Specific instructions for how an AI agent should behave when simulating this persona"
  }
]

Remember: These personas will drive actual browser automation. The agentInstructions should be actionable.`;

    const response = await this.callWithRetry(() =>
      this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }],
      })
    );

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return this.parsePersonas(text);
  }

  /**
   * Generate a single persona with specific traits
   */
  async generatePersonaWithTraits(
    traits: Partial<Persona>,
    context: { productContext: string; conversionGoal: string }
  ): Promise<Persona> {
    const prompt = `You are a UX researcher creating a specific user persona.

CONTEXT:
- Product: ${context.productContext}
- Conversion Goal: ${context.conversionGoal}

REQUIRED TRAITS (incorporate these):
${JSON.stringify(traits, null, 2)}

Generate ONE detailed persona that incorporates the required traits. Fill in any missing details to create a complete, realistic persona.

Respond with JSON matching this schema:
{
  "name": "Alliterative Name",
  "description": "One sentence",
  "demographics": {
    "ageRange": "18-24" | "25-34" | "35-44" | "45-54" | "55-64" | "65+",
    "techSavviness": "low" | "medium" | "high",
    "device": "mobile" | "tablet" | "desktop",
    "connectionSpeed": "slow" | "moderate" | "fast"
  },
  "behavior": {
    "patience": 1-10,
    "thoroughness": 1-10,
    "clickiness": 1-10,
    "scrollSpeed": 1-10,
    "frustrationTolerance": 1-10,
    "skepticism": 1-10
  },
  "intent": {
    "goal": "string",
    "urgency": 1-10,
    "priorKnowledge": "none" | "some" | "expert",
    "conversionTriggers": ["array"],
    "dealbreakers": ["array"]
  },
  "agentInstructions": "Actionable instructions for browser agent"
}`;

    const response = await this.callWithRetry(() =>
      this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      })
    );

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const personas = this.parsePersonas(text);
    return personas[0] || this.createFallbackPersona();
  }

  /**
   * Parse AI response into Persona objects
   */
  private parsePersonas(text: string): Persona[] {
    try {
      // Find JSON array in response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        // Try single object
        const objMatch = text.match(/\{[\s\S]*\}/);
        if (objMatch) {
          const parsed = JSON.parse(objMatch[0]);
          return [this.validateAndNormalizePersona(parsed)];
        }
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed)) {
        return [this.validateAndNormalizePersona(parsed)];
      }

      return parsed.map((p: unknown) => this.validateAndNormalizePersona(p));
    } catch (e) {
      console.error('[PersonaGenerator] Parse error:', e);
      return [this.createFallbackPersona()];
    }
  }

  /**
   * Validate and normalize a parsed persona
   */
  private validateAndNormalizePersona(raw: unknown): Persona {
    const p = raw as Record<string, unknown>;
    
    return {
      id: `persona_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: String(p.name || 'Unknown User'),
      description: String(p.description || 'A typical user'),
      demographics: {
        ageRange: this.validateEnum(
          (p.demographics as Record<string, unknown>)?.ageRange,
          ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'],
          '25-34'
        ),
        techSavviness: this.validateEnum(
          (p.demographics as Record<string, unknown>)?.techSavviness,
          ['low', 'medium', 'high'],
          'medium'
        ),
        device: this.validateEnum(
          (p.demographics as Record<string, unknown>)?.device,
          ['mobile', 'tablet', 'desktop'],
          'desktop'
        ),
        connectionSpeed: this.validateEnum(
          (p.demographics as Record<string, unknown>)?.connectionSpeed,
          ['slow', 'moderate', 'fast'],
          'fast'
        ),
      },
      behavior: {
        patience: this.clamp(Number((p.behavior as Record<string, unknown>)?.patience) || 5, 1, 10),
        thoroughness: this.clamp(Number((p.behavior as Record<string, unknown>)?.thoroughness) || 5, 1, 10),
        clickiness: this.clamp(Number((p.behavior as Record<string, unknown>)?.clickiness) || 5, 1, 10),
        scrollSpeed: this.clamp(Number((p.behavior as Record<string, unknown>)?.scrollSpeed) || 5, 1, 10),
        frustrationTolerance: this.clamp(Number((p.behavior as Record<string, unknown>)?.frustrationTolerance) || 5, 1, 10),
        skepticism: this.clamp(Number((p.behavior as Record<string, unknown>)?.skepticism) || 5, 1, 10),
      },
      intent: {
        goal: String((p.intent as Record<string, unknown>)?.goal || 'Browse and evaluate'),
        urgency: this.clamp(Number((p.intent as Record<string, unknown>)?.urgency) || 5, 1, 10),
        priorKnowledge: this.validateEnum(
          (p.intent as Record<string, unknown>)?.priorKnowledge,
          ['none', 'some', 'expert'],
          'some'
        ),
        conversionTriggers: this.ensureStringArray((p.intent as Record<string, unknown>)?.conversionTriggers),
        dealbreakers: this.ensureStringArray((p.intent as Record<string, unknown>)?.dealbreakers),
      },
      agentInstructions: String(p.agentInstructions || 'Browse naturally, following your persona traits.'),
    };
  }

  /**
   * Create a fallback persona when generation fails
   */
  private createFallbackPersona(): Persona {
    return {
      id: `persona_${Date.now()}_fallback`,
      name: 'Generic User',
      description: 'A typical web user with average browsing behaviors',
      demographics: {
        ageRange: '25-34',
        techSavviness: 'medium',
        device: 'desktop',
        connectionSpeed: 'fast',
      },
      behavior: {
        patience: 5,
        thoroughness: 5,
        clickiness: 5,
        scrollSpeed: 5,
        frustrationTolerance: 5,
        skepticism: 5,
      },
      intent: {
        goal: 'Evaluate the page and potentially convert',
        urgency: 5,
        priorKnowledge: 'some',
        conversionTriggers: ['Clear value proposition', 'Easy next steps'],
        dealbreakers: ['Confusing layout', 'Hidden information'],
      },
      agentInstructions: 'Browse the page naturally. Scroll through content, click on interesting elements, and evaluate whether to convert.',
    };
  }

  /**
   * Helper: Validate enum value
   */
  private validateEnum<T extends string>(value: unknown, allowed: T[], fallback: T): T {
    return allowed.includes(value as T) ? (value as T) : fallback;
  }

  /**
   * Helper: Clamp number to range
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Helper: Ensure value is string array
   */
  private ensureStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.map(v => String(v));
    }
    if (typeof value === 'string') {
      return [value];
    }
    return [];
  }
}

export { getPresetPersona, getAllPresetPersonas, getRandomPresetPersonas } from './presets';
