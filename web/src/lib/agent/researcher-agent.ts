/**
 * Researcher Agent - Analyzes experiment results and proposes new tests
 * 
 * This agent acts as a CRO expert, interpreting data and generating hypotheses.
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  Experiment,
  ExperimentResults,
  ResearcherAnalysis,
  Variant,
  VariantChange,
  AgentSessionResult,
} from './types';

export class ResearcherAgent {
  private anthropic: Anthropic;
  private maxRetries = 3;

  constructor(apiKey?: string) {
    this.anthropic = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Make an API call with retry logic for rate limits
   */
  private async callWithRetry<T>(
    fn: () => Promise<T>,
    retries = this.maxRetries
  ): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      const isRateLimit = error?.status === 429 || 
                          error?.message?.includes('rate') ||
                          error?.message?.includes('Rate');
      
      if (isRateLimit && retries > 0) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, this.maxRetries - retries) * 1000;
        console.log(`[ResearcherAgent] Rate limited, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.callWithRetry(fn, retries - 1);
      }
      throw error;
    }
  }

  /**
   * Analyze experiment results and generate insights
   */
  async analyzeExperiment(
    experiment: Experiment,
    sessions: AgentSessionResult[]
  ): Promise<ResearcherAnalysis> {
    // Aggregate results by variant
    const results = this.aggregateResults(sessions);
    
    // Generate analysis using Claude
    const analysis = await this.generateAnalysis(experiment, results, sessions);
    
    return analysis;
  }

  /**
   * Generate new variant hypotheses based on analysis
   */
  async generateHypotheses(
    pageUrl: string,
    pageContent: string,
    previousResults?: ExperimentResults
  ): Promise<ResearcherAnalysis['hypotheses']> {
    const prompt = this.buildHypothesisPrompt(pageUrl, pageContent, previousResults);

    const response = await this.callWithRetry(() => 
      this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      })
    );

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return this.parseHypotheses(text);
  }

  /**
   * Create a variant based on a hypothesis
   */
  async createVariantFromHypothesis(
    hypothesis: string,
    pageContent: string
  ): Promise<Variant> {
    const prompt = `You are a CRO expert creating an A/B test variant.

HYPOTHESIS: ${hypothesis}

PAGE CONTENT SUMMARY:
${pageContent.substring(0, 2000)}

Create a variant that tests this hypothesis. Provide specific, implementable changes.

Respond with JSON:
{
  "name": "Short descriptive name",
  "description": "What this variant changes and why",
  "changes": [
    {
      "type": "modify" | "add" | "remove",
      "target": "CSS selector for the element",
      "property": "textContent" | "innerHTML" | "style",
      "newValue": "The new value",
      "position": "before" | "after" | "replace" (for add only),
      "html": "<div>...</div>" (for add only)
    }
  ]
}

Focus on high-impact, VISUALLY DIFFERENT changes. Include at least 2-3 style changes:
- CTA button: background-color, padding, font-size, border-radius
- Headlines: font-size, color, font-weight
- Sections: background-color, padding, border
- Text color changes for emphasis
- Adding urgency with color (red, orange accents)

IMPORTANT: Always include multiple "property": "style" changes with valid CSS values.
Example style change:
{
  "type": "modify",
  "target": "button, .btn, [type='submit']",
  "property": "style",
  "newValue": "background-color: #ff4444 !important; color: white !important; font-size: 1.2em !important; padding: 15px 30px !important;"
}

Use !important to override existing styles. Use broad selectors that will match.`;

    const response = await this.callWithRetry(() =>
      this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      })
    );

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return this.parseVariant(text, hypothesis);
  }

  /**
   * Aggregate raw session results into experiment results
   */
  private aggregateResults(sessions: AgentSessionResult[]): ExperimentResults {
    const variantGroups: Record<string, AgentSessionResult[]> = {};
    
    for (const session of sessions) {
      if (!variantGroups[session.variant]) {
        variantGroups[session.variant] = [];
      }
      variantGroups[session.variant].push(session);
    }

    const variantResults: ExperimentResults['variantResults'] = {};
    
    for (const [variantId, variantSessions] of Object.entries(variantGroups)) {
      const conversions = variantSessions.filter(s => s.converted).length;
      const bounces = variantSessions.filter(s => s.metrics.timeOnPage < 10000).length;
      
      variantResults[variantId] = {
        sessions: variantSessions.length,
        conversions,
        conversionRate: (conversions / variantSessions.length) * 100,
        avgTimeOnPage: variantSessions.reduce((sum, s) => sum + s.metrics.timeOnPage, 0) / variantSessions.length,
        avgScrollDepth: variantSessions.reduce((sum, s) => sum + s.metrics.scrollDepth, 0) / variantSessions.length,
        bounceRate: (bounces / variantSessions.length) * 100,
      };
    }

    // Determine winner
    let winner: string | undefined;
    let maxConversion = 0;
    for (const [id, result] of Object.entries(variantResults)) {
      if (result.conversionRate > maxConversion) {
        maxConversion = result.conversionRate;
        winner = id;
      }
    }

    // Calculate statistical significance (simplified chi-squared)
    const confidence = this.calculateConfidence(variantResults);

    return {
      totalSessions: sessions.length,
      variantResults,
      winner,
      confidence,
      statisticalSignificance: confidence >= 95,
      insights: [],
    };
  }

  /**
   * Generate analysis using Claude
   */
  private async generateAnalysis(
    experiment: Experiment,
    results: ExperimentResults,
    sessions: AgentSessionResult[]
  ): Promise<ResearcherAnalysis> {
    // Analyze behavior patterns
    const behaviorInsights = this.analyzeBehaviorPatterns(sessions);

    const prompt = `You are a senior CRO researcher analyzing A/B test results.

EXPERIMENT: ${experiment.name}
HYPOTHESIS: ${experiment.hypothesis}
URL: ${experiment.url}

RESULTS:
${Object.entries(results.variantResults).map(([id, r]) => `
${id}:
- Sessions: ${r.sessions}
- Conversion Rate: ${r.conversionRate.toFixed(2)}%
- Avg Time on Page: ${(r.avgTimeOnPage / 1000).toFixed(1)}s
- Avg Scroll Depth: ${r.avgScrollDepth.toFixed(0)}px
- Bounce Rate: ${r.bounceRate.toFixed(1)}%
`).join('\n')}

STATISTICAL CONFIDENCE: ${results.confidence.toFixed(1)}%
WINNER: ${results.winner || 'No clear winner'}

BEHAVIOR PATTERNS OBSERVED:
${behaviorInsights.join('\n')}

Provide analysis as JSON:
{
  "summary": "2-3 sentence summary of results",
  "keyFindings": ["finding 1", "finding 2", ...],
  "hypotheses": [
    {
      "hypothesis": "What to test next",
      "rationale": "Why this matters based on data",
      "expectedImpact": "low" | "medium" | "high"
    }
  ],
  "recommendations": ["recommendation 1", ...]
}`;

    const response = await this.callWithRetry(() =>
      this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      })
    );

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return this.parseAnalysis(text, experiment.id, results);
  }

  /**
   * Analyze behavior patterns from session data
   */
  private analyzeBehaviorPatterns(sessions: AgentSessionResult[]): string[] {
    const insights: string[] = [];

    // Average actions before conversion
    const converters = sessions.filter(s => s.converted);
    const nonConverters = sessions.filter(s => !s.converted);

    if (converters.length > 0) {
      const avgActionsToConvert = converters.reduce((sum, s) => sum + s.actions.length, 0) / converters.length;
      insights.push(`Converters took avg ${avgActionsToConvert.toFixed(1)} actions before converting`);
    }

    // Most common exit reasons
    const exitReasons: Record<string, number> = {};
    for (const session of nonConverters) {
      exitReasons[session.exitReason] = (exitReasons[session.exitReason] || 0) + 1;
    }
    const topExitReason = Object.entries(exitReasons).sort((a, b) => b[1] - a[1])[0];
    if (topExitReason) {
      insights.push(`Most common exit reason: "${topExitReason[0]}" (${topExitReason[1]} sessions)`);
    }

    // Scroll depth analysis
    const avgScrollConverters = converters.length > 0 
      ? converters.reduce((sum, s) => sum + s.metrics.scrollDepth, 0) / converters.length 
      : 0;
    const avgScrollNonConverters = nonConverters.length > 0
      ? nonConverters.reduce((sum, s) => sum + s.metrics.scrollDepth, 0) / nonConverters.length
      : 0;
    insights.push(`Converters scrolled ${avgScrollConverters.toFixed(0)}px vs non-converters ${avgScrollNonConverters.toFixed(0)}px`);

    // Hesitation analysis
    const avgHesitation = sessions.reduce((sum, s) => sum + s.metrics.hesitationCount, 0) / sessions.length;
    insights.push(`Average hesitation events: ${avgHesitation.toFixed(1)} per session`);

    return insights;
  }

  /**
   * Build prompt for hypothesis generation
   */
  private buildHypothesisPrompt(
    url: string,
    pageContent: string,
    previousResults?: ExperimentResults
  ): string {
    let prompt = `You are a CRO expert generating A/B test hypotheses.

PAGE URL: ${url}

PAGE CONTENT:
${pageContent.substring(0, 3000)}

`;

    if (previousResults) {
      prompt += `PREVIOUS TEST RESULTS:
Winner: ${previousResults.winner}
Conversion improvement: ${this.calculateImprovement(previousResults)}%

`;
    }

    prompt += `Generate 3 high-impact hypotheses for A/B testing. Consider:
1. Headline clarity and emotional appeal
2. CTA prominence, copy, and urgency
3. Social proof and trust signals
4. Form friction reduction
5. Value proposition clarity
6. Visual hierarchy and attention flow

Respond with JSON array:
[
  {
    "hypothesis": "Specific, testable hypothesis",
    "rationale": "Why this should improve conversions based on psychology/UX principles",
    "expectedImpact": "low" | "medium" | "high",
    "proposedChange": "Brief description of what to change"
  }
]`;

    return prompt;
  }

  /**
   * Calculate simple confidence score
   */
  private calculateConfidence(variantResults: ExperimentResults['variantResults']): number {
    const variants = Object.values(variantResults);
    if (variants.length < 2) return 0;

    // Simple calculation based on sample size and effect size
    const control = variants[0];
    const treatment = variants[1];
    
    const sampleSize = control.sessions + treatment.sessions;
    const effectSize = Math.abs(control.conversionRate - treatment.conversionRate);
    
    // Rough confidence estimation
    let confidence = 50 + (sampleSize / 20) + (effectSize * 5);
    return Math.min(99, Math.max(50, confidence));
  }

  private calculateImprovement(results: ExperimentResults): number {
    if (!results.winner || !results.variantResults['control']) return 0;
    
    const control = results.variantResults['control'].conversionRate;
    const winner = results.variantResults[results.winner].conversionRate;
    
    if (control === 0) return 0;
    return ((winner - control) / control) * 100;
  }

  private parseAnalysis(text: string, experimentId: string, results: ExperimentResults): ResearcherAnalysis {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          experimentId,
          summary: parsed.summary || 'Analysis complete',
          keyFindings: parsed.keyFindings || [],
          hypotheses: (parsed.hypotheses || []).map((h: any) => ({
            ...h,
            proposedVariant: { id: '', name: '', description: '', changes: [] },
          })),
          recommendations: parsed.recommendations || [],
        };
      }
    } catch (e) {
      console.error('Parse analysis error:', e);
    }

    return {
      experimentId,
      summary: 'Unable to generate analysis',
      keyFindings: [],
      hypotheses: [],
      recommendations: [],
    };
  }

  private parseHypotheses(text: string): ResearcherAnalysis['hypotheses'] {
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.map((h: any) => ({
          hypothesis: h.hypothesis,
          rationale: h.rationale,
          expectedImpact: h.expectedImpact || 'medium',
          proposedVariant: { id: '', name: '', description: h.proposedChange || '', changes: [] },
        }));
      }
    } catch (e) {
      console.error('Parse hypotheses error:', e);
    }
    return [];
  }

  private parseVariant(text: string, hypothesis: string): Variant {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          id: `variant_${Date.now()}`,
          name: parsed.name || 'Unnamed Variant',
          description: parsed.description || hypothesis,
          changes: (parsed.changes || []).map((c: any) => ({
            type: c.type || 'modify',
            target: c.target,
            property: c.property,
            newValue: c.newValue,
            position: c.position,
            html: c.html,
          })),
        };
      }
    } catch (e) {
      console.error('Parse variant error:', e);
    }

    return {
      id: `variant_${Date.now()}`,
      name: 'Default Variant',
      description: hypothesis,
      changes: [],
    };
  }
}
