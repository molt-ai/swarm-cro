/**
 * Swarm Runner
 * 
 * Orchestrates multiple browser agents running in parallel to test
 * different variants with different personas. Handles rate limiting,
 * progress tracking, and result aggregation.
 */

import { BrowserAgent } from './browser-agent';
import type { Persona } from '../persona';
import type { 
  AgentSession, 
  ExperimentConfig, 
  ExperimentStatus,
  ExperimentResults,
  VariantResult,
  ExperimentVariant,
} from './types';

/**
 * Event emitter for progress updates
 */
type ProgressCallback = (status: ExperimentStatus) => void;

export class SwarmRunner {
  private agent: BrowserAgent;
  private maxConcurrent: number;
  private delayBetweenSessions: number;

  constructor(config?: {
    maxConcurrent?: number;
    delayBetweenSessions?: number;
    anthropicApiKey?: string;
    browserbaseApiKey?: string;
    browserbaseProjectId?: string;
  }) {
    this.agent = new BrowserAgent({
      anthropicApiKey: config?.anthropicApiKey,
      browserbaseApiKey: config?.browserbaseApiKey,
      browserbaseProjectId: config?.browserbaseProjectId,
    });
    this.maxConcurrent = config?.maxConcurrent || 3;
    this.delayBetweenSessions = config?.delayBetweenSessions || 2000;
  }

  /**
   * Run a full experiment with multiple variants and personas
   */
  async runExperiment(
    config: ExperimentConfig,
    onProgress?: ProgressCallback
  ): Promise<ExperimentResults> {
    const { variants, personas, sessionsPerVariant, conversionGoal, url } = config;
    
    // Create session queue: each variant gets sessionsPerVariant sessions
    const sessionQueue: Array<{
      variant: ExperimentVariant;
      persona: Persona;
    }> = [];

    for (const variant of variants) {
      // Distribute personas evenly across sessions
      for (let i = 0; i < sessionsPerVariant; i++) {
        const persona = personas[i % personas.length];
        sessionQueue.push({ variant, persona });
      }
    }

    // Shuffle to randomize order
    this.shuffleArray(sessionQueue);

    const totalSessions = sessionQueue.length;
    const sessions: AgentSession[] = [];
    const sessionsByVariant: Record<string, number> = {};
    variants.forEach(v => sessionsByVariant[v.id] = 0);

    const status: ExperimentStatus = {
      experimentId: config.id,
      state: 'running',
      progress: 0,
      completedSessions: 0,
      totalSessions,
      sessionsByVariant,
    };

    onProgress?.(status);

    // Process sessions with concurrency limit
    const startTime = Date.now();
    
    // Process in batches
    for (let i = 0; i < sessionQueue.length; i += this.maxConcurrent) {
      const batch = sessionQueue.slice(i, i + this.maxConcurrent);
      
      const batchPromises = batch.map(async ({ variant, persona }) => {
        try {
          const session = await this.agent.run({
            url,
            persona,
            variantId: variant.id,
            changes: {
              css: variant.css,
              js: variant.js,
            },
            conversionGoal,
            maxDurationSec: 60,
          });
          
          return session;
        } catch (error) {
          console.error(`[SwarmRunner] Session error:`, error);
          // Return a failed session
          return this.createFailedSession(variant.id, persona, url, error);
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      // Add results and update progress
      for (const session of batchResults) {
        sessions.push(session);
        sessionsByVariant[session.variantId]++;
        
        status.completedSessions = sessions.length;
        status.progress = (sessions.length / totalSessions) * 100;
        status.sessionsByVariant = { ...sessionsByVariant };
        
        // Estimate remaining time
        const elapsed = Date.now() - startTime;
        const avgTimePerSession = elapsed / sessions.length;
        status.estimatedTimeRemaining = Math.ceil(
          (totalSessions - sessions.length) * avgTimePerSession / 1000
        );
        
        onProgress?.(status);
      }

      // Delay between batches to avoid rate limits
      if (i + this.maxConcurrent < sessionQueue.length) {
        await this.delay(this.delayBetweenSessions);
      }
    }

    // Analyze results
    status.state = 'analyzing';
    onProgress?.(status);

    const results = this.analyzeResults(config.id, sessions, variants);

    status.state = 'completed';
    status.progress = 100;
    onProgress?.(status);

    return results;
  }

  /**
   * Run a single session (for testing)
   */
  async runSingleSession(
    url: string,
    persona: Persona,
    variantId: string,
    conversionGoal: { type: 'click' | 'submit' | 'navigate' | 'custom'; target: string; description: string },
    changes?: { css?: string; js?: string }
  ): Promise<AgentSession> {
    return this.agent.run({
      url,
      persona,
      variantId,
      changes,
      conversionGoal,
      maxDurationSec: 60,
    });
  }

  /**
   * Analyze session results
   */
  private analyzeResults(
    experimentId: string,
    sessions: AgentSession[],
    variants: ExperimentVariant[]
  ): ExperimentResults {
    const variantResults: Record<string, VariantResult> = {};

    // Calculate metrics for each variant
    for (const variant of variants) {
      const variantSessions = sessions.filter(s => s.variantId === variant.id);
      
      if (variantSessions.length === 0) {
        variantResults[variant.id] = this.createEmptyVariantResult(variant.id);
        continue;
      }

      const conversions = variantSessions.filter(s => s.converted).length;
      const totalTime = variantSessions.reduce((sum, s) => sum + s.metrics.timeOnPage, 0);
      const totalScroll = variantSessions.reduce((sum, s) => sum + s.metrics.scrollDepthPercent, 0);
      const totalClicks = variantSessions.reduce((sum, s) => sum + s.metrics.clickCount, 0);
      const bounces = variantSessions.filter(s => s.metrics.timeOnPage < 5000).length;

      // Count exit reasons
      const exitReasonCounts: Record<string, number> = {};
      variantSessions.filter(s => s.exitReason).forEach(s => {
        const reason = s.exitReason!;
        exitReasonCounts[reason] = (exitReasonCounts[reason] || 0) + 1;
      });

      // Count conversion triggers
      const triggerCounts: Record<string, number> = {};
      variantSessions.filter(s => s.conversionTrigger).forEach(s => {
        const trigger = s.conversionTrigger!;
        triggerCounts[trigger] = (triggerCounts[trigger] || 0) + 1;
      });

      variantResults[variant.id] = {
        variantId: variant.id,
        sessions: variantSessions.length,
        conversions,
        conversionRate: (conversions / variantSessions.length) * 100,
        avgTimeOnPage: totalTime / variantSessions.length,
        avgScrollDepth: totalScroll / variantSessions.length,
        avgClicks: totalClicks / variantSessions.length,
        bounceRate: (bounces / variantSessions.length) * 100,
        topExitReasons: Object.entries(exitReasonCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([reason, count]) => ({ reason, count })),
        topConversionTriggers: Object.entries(triggerCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([trigger, count]) => ({ trigger, count })),
        engagementScore: this.calculateEngagementScore(variantSessions),
      };
    }

    // Determine winner
    const { winner, confidence, isSignificant } = this.determineWinner(variantResults, variants);

    // Generate insights
    const insights = this.generateInsights(variantResults, variants, sessions);
    const recommendations = this.generateRecommendations(variantResults, winner, isSignificant);

    return {
      experimentId,
      sessions,
      variantResults,
      winner,
      confidence,
      isSignificant,
      insights,
      recommendations,
    };
  }

  /**
   * Calculate engagement score (0-100)
   */
  private calculateEngagementScore(sessions: AgentSession[]): number {
    if (sessions.length === 0) return 0;

    // Factors: time on page, scroll depth, clicks, positive impressions
    const avgTimeScore = Math.min(100, 
      sessions.reduce((sum, s) => sum + s.metrics.timeOnPage, 0) / sessions.length / 300);
    
    const avgScrollScore = 
      sessions.reduce((sum, s) => sum + s.metrics.scrollDepthPercent, 0) / sessions.length;
    
    const avgClickScore = Math.min(100,
      (sessions.reduce((sum, s) => sum + s.metrics.clickCount, 0) / sessions.length) * 20);
    
    const positiveRate = 
      (sessions.filter(s => s.impression === 'positive').length / sessions.length) * 100;

    return Math.round((avgTimeScore + avgScrollScore + avgClickScore + positiveRate) / 4);
  }

  /**
   * Determine the winning variant
   */
  private determineWinner(
    results: Record<string, VariantResult>,
    variants: ExperimentVariant[]
  ): { winner: string | null; confidence: number; isSignificant: boolean } {
    const control = variants.find(v => v.isControl);
    if (!control) {
      // No control - find highest converting
      const sorted = Object.values(results).sort((a, b) => b.conversionRate - a.conversionRate);
      if (sorted.length === 0) return { winner: null, confidence: 0, isSignificant: false };
      
      const best = sorted[0];
      const second = sorted[1];
      
      if (!second || best.conversionRate === second.conversionRate) {
        return { winner: best.variantId, confidence: 50, isSignificant: false };
      }

      const confidence = this.calculateConfidence(best, second);
      return {
        winner: best.variantId,
        confidence,
        isSignificant: confidence >= 95,
      };
    }

    // Compare variants to control
    const controlResult = results[control.id];
    if (!controlResult) return { winner: null, confidence: 0, isSignificant: false };

    let bestVariant: VariantResult | null = null;
    let bestLift = 0;

    for (const variant of variants) {
      if (variant.isControl) continue;
      
      const result = results[variant.id];
      if (!result) continue;

      const lift = result.conversionRate - controlResult.conversionRate;
      if (lift > bestLift) {
        bestLift = lift;
        bestVariant = result;
      }
    }

    if (!bestVariant || bestLift <= 0) {
      return { winner: control.id, confidence: 50, isSignificant: false };
    }

    const confidence = this.calculateConfidence(bestVariant, controlResult);
    return {
      winner: bestVariant.variantId,
      confidence,
      isSignificant: confidence >= 95,
    };
  }

  /**
   * Calculate statistical confidence (simplified)
   */
  private calculateConfidence(a: VariantResult, b: VariantResult): number {
    // Simplified confidence based on sample size and effect size
    const totalSamples = a.sessions + b.sessions;
    const effectSize = Math.abs(a.conversionRate - b.conversionRate);
    
    // More samples + bigger effect = higher confidence
    const sampleFactor = Math.min(1, totalSamples / 100);
    const effectFactor = Math.min(1, effectSize / 20);
    
    const rawConfidence = 50 + (sampleFactor * 25) + (effectFactor * 25);
    return Math.min(99, Math.round(rawConfidence));
  }

  /**
   * Generate insights from results
   */
  private generateInsights(
    results: Record<string, VariantResult>,
    variants: ExperimentVariant[],
    sessions: AgentSession[]
  ): string[] {
    const insights: string[] = [];

    // Compare conversion rates
    const sortedByConversion = Object.values(results)
      .sort((a, b) => b.conversionRate - a.conversionRate);
    
    if (sortedByConversion.length >= 2) {
      const best = sortedByConversion[0];
      const worst = sortedByConversion[sortedByConversion.length - 1];
      const lift = ((best.conversionRate - worst.conversionRate) / worst.conversionRate) * 100;
      
      if (lift > 10) {
        insights.push(
          `${best.variantId} outperformed ${worst.variantId} by ${lift.toFixed(0)}% in conversion rate`
        );
      }
    }

    // Engagement patterns
    const avgEngagement = Object.values(results)
      .reduce((sum, r) => sum + r.engagementScore, 0) / Object.values(results).length;
    
    if (avgEngagement < 40) {
      insights.push('Overall engagement is low - users may be confused or uninterested');
    } else if (avgEngagement > 70) {
      insights.push('High engagement across variants - users are interested in the content');
    }

    // Bounce rate analysis
    const highBounce = Object.values(results).find(r => r.bounceRate > 50);
    if (highBounce) {
      insights.push(
        `${highBounce.variantId} has high bounce rate (${highBounce.bounceRate.toFixed(0)}%) - first impression may need work`
      );
    }

    // Persona-based insights
    const frustratedSessions = sessions.filter(s => s.impression === 'negative');
    if (frustratedSessions.length > sessions.length * 0.3) {
      const commonReasons = frustratedSessions
        .filter(s => s.exitReason)
        .map(s => s.exitReason!)
        .slice(0, 3);
      insights.push(
        `Many users left frustrated. Common reasons: ${commonReasons.join(', ')}`
      );
    }

    return insights;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    results: Record<string, VariantResult>,
    winner: string | null,
    isSignificant: boolean
  ): string[] {
    const recommendations: string[] = [];

    if (winner && isSignificant) {
      recommendations.push(`Implement ${winner} - it shows statistically significant improvement`);
    } else if (winner) {
      recommendations.push(
        `${winner} looks promising but more data needed for confidence. Run longer or with more sessions.`
      );
    } else {
      recommendations.push('No clear winner - consider testing more dramatic variations');
    }

    // Check for low conversion across all variants
    const avgConversion = Object.values(results)
      .reduce((sum, r) => sum + r.conversionRate, 0) / Object.values(results).length;
    
    if (avgConversion < 10) {
      recommendations.push(
        'Low conversion across all variants - the fundamental value proposition may need rethinking'
      );
    }

    return recommendations;
  }

  /**
   * Create an empty variant result
   */
  private createEmptyVariantResult(variantId: string): VariantResult {
    return {
      variantId,
      sessions: 0,
      conversions: 0,
      conversionRate: 0,
      avgTimeOnPage: 0,
      avgScrollDepth: 0,
      avgClicks: 0,
      bounceRate: 0,
      topExitReasons: [],
      topConversionTriggers: [],
      engagementScore: 0,
    };
  }

  /**
   * Create a failed session placeholder
   */
  private createFailedSession(
    variantId: string,
    persona: Persona,
    url: string,
    error: unknown
  ): AgentSession {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return {
      id: `failed_${Date.now()}`,
      persona,
      variantId,
      url,
      actions: [],
      metrics: {
        timeOnPage: 0,
        scrollDepth: 0,
        scrollDepthPercent: 0,
        clickCount: 0,
        hoverCount: 0,
        readTimeMs: 0,
        hesitationCount: 0,
        rageClicks: 0,
        elementsEngaged: [],
        loadTimeMs: 0,
      },
      converted: false,
      exitReason: `Error: ${errMsg}`,
      impression: 'negative',
      startedAt: Date.now(),
      endedAt: Date.now(),
      errors: [errMsg],
    };
  }

  /**
   * Shuffle array in place
   */
  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
