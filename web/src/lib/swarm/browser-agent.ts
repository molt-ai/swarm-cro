/**
 * Browser Agent
 * 
 * An AI-powered browser automation agent that simulates a user persona
 * browsing and interacting with a webpage. Uses Claude to make decisions
 * about what to do next based on the persona's characteristics.
 */

import Anthropic from '@anthropic-ai/sdk';
import Browserbase from '@browserbasehq/sdk';
import { chromium, type Browser, type Page, type ElementHandle } from 'playwright-core';
import type { Persona } from '../persona';
import type { 
  AgentAction,
  AgentActionType,
  AgentRunConfig, 
  AgentSession, 
  SessionMetrics,
  ConversionGoal 
} from './types';

/**
 * Snapshot of visible page elements for decision making
 */
interface PageSnapshot {
  url: string;
  title: string;
  headings: string[];
  buttons: Array<{ text: string; selector: string }>;
  links: Array<{ text: string; href: string; selector: string }>;
  forms: Array<{ action: string; selector: string }>;
  images: number;
  scrollPosition: number;
  scrollHeight: number;
  viewportHeight: number;
}

export class BrowserAgent {
  private anthropic: Anthropic;
  private browserbaseApiKey: string;
  private browserbaseProjectId: string;
  private maxRetries = 3;

  constructor(config?: {
    anthropicApiKey?: string;
    browserbaseApiKey?: string;
    browserbaseProjectId?: string;
  }) {
    this.anthropic = new Anthropic({
      apiKey: config?.anthropicApiKey || process.env.ANTHROPIC_API_KEY,
    });
    this.browserbaseApiKey = config?.browserbaseApiKey || process.env.BROWSERBASE_API_KEY || '';
    this.browserbaseProjectId = config?.browserbaseProjectId || process.env.BROWSERBASE_PROJECT_ID || '';
  }

  /**
   * Run a browsing session with a persona
   */
  async run(config: AgentRunConfig): Promise<AgentSession> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const startedAt = Date.now();
    const actions: AgentAction[] = [];
    const errors: string[] = [];
    
    let browser: Browser | null = null;
    let converted = false;
    let conversionTrigger: string | undefined;
    let exitReason: string | undefined;
    let impression: 'positive' | 'neutral' | 'negative' = 'neutral';
    let feedback: string | undefined;

    const metrics: SessionMetrics = {
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
    };

    const maxDuration = (config.maxDurationSec || 60) * 1000;

    try {
      // Create Browserbase session
      console.log(`[Agent:${sessionId}] Starting session for ${config.persona.name}`);
      const bb = new Browserbase({ apiKey: this.browserbaseApiKey });
      const session = await bb.sessions.create({ projectId: this.browserbaseProjectId });
      
      // Connect via Playwright
      browser = await chromium.connectOverCDP(session.connectUrl);
      const context = browser.contexts()[0];
      const page = context.pages()[0] || await context.newPage();

      // Set viewport based on persona device
      const viewport = this.getViewportForDevice(config.persona.demographics.device);
      await page.setViewportSize(viewport);

      // Navigate to URL
      const navStart = Date.now();
      await page.goto(config.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      metrics.loadTimeMs = Date.now() - navStart;
      
      actions.push({
        type: 'navigate',
        target: config.url,
        timestamp: Date.now(),
        durationMs: metrics.loadTimeMs,
      });

      // Inject variant changes if any
      if (config.changes?.css) {
        await page.addStyleTag({ content: config.changes.css });
      }
      if (config.changes?.js) {
        await page.evaluate((js) => {
          try { eval(js); } catch (e) { console.error('JS error:', e); }
        }, config.changes.js);
      }

      // Wait for page to settle
      await page.waitForTimeout(500);

      // Main browsing loop
      let iterationCount = 0;
      const maxIterations = 30; // Safety limit
      
      while (Date.now() - startedAt < maxDuration && iterationCount < maxIterations) {
        iterationCount++;
        
        // Get page snapshot
        const snapshot = await this.getPageSnapshot(page);
        
        // Check for conversion
        if (this.checkConversion(snapshot, config.conversionGoal, actions)) {
          converted = true;
          conversionTrigger = this.identifyConversionTrigger(actions);
          actions.push({
            type: 'convert',
            details: conversionTrigger,
            timestamp: Date.now(),
          });
          break;
        }

        // Decide next action
        const decision = await this.decideNextAction(
          config.persona,
          snapshot,
          actions,
          config.conversionGoal,
          metrics
        );

        if (decision.action === 'leave') {
          exitReason = decision.reason || 'Decided to leave';
          actions.push({
            type: 'leave',
            details: exitReason,
            reasoning: decision.reasoning,
            timestamp: Date.now(),
          });
          break;
        }

        // Execute the action
        const actionResult = await this.executeAction(page, decision, metrics);
        actions.push({
          ...actionResult,
          reasoning: decision.reasoning,
        });

        // Update metrics
        metrics.scrollDepth = await this.getScrollDepth(page);
        metrics.scrollDepthPercent = (metrics.scrollDepth / snapshot.scrollHeight) * 100;

        // Brief pause between actions (varies by persona)
        const pauseTime = this.calculatePauseTime(config.persona, decision.action);
        await page.waitForTimeout(pauseTime);
      }

      // Session ended - get final impression
      const finalSnapshot = await this.getPageSnapshot(page);
      const impressionResult = await this.getPersonaImpression(
        config.persona,
        actions,
        metrics,
        converted
      );
      impression = impressionResult.impression;
      feedback = impressionResult.feedback;

      if (!converted && !exitReason) {
        exitReason = 'Session time limit reached';
      }

    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Agent:${sessionId}] Error:`, errMsg);
      errors.push(errMsg);
      exitReason = `Error: ${errMsg}`;
    } finally {
      if (browser) {
        try { await browser.close(); } catch {}
      }
    }

    metrics.timeOnPage = Date.now() - startedAt;
    metrics.clickCount = actions.filter(a => a.type === 'click').length;
    metrics.hoverCount = actions.filter(a => a.type === 'hover').length;

    return {
      id: sessionId,
      persona: config.persona,
      variantId: config.variantId,
      url: config.url,
      actions,
      metrics,
      converted,
      conversionTrigger,
      exitReason,
      impression,
      feedback,
      startedAt,
      endedAt: Date.now(),
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Get a snapshot of the current page state
   */
  private async getPageSnapshot(page: Page): Promise<PageSnapshot> {
    return await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
        .slice(0, 10)
        .map(h => h.textContent?.trim() || '');

      const buttons = Array.from(document.querySelectorAll('button, [role="button"], input[type="submit"]'))
        .slice(0, 15)
        .map((el, i) => ({
          text: el.textContent?.trim() || (el as HTMLInputElement).value || 'Button',
          selector: `button:nth-of-type(${i + 1})`,
        }));

      const links = Array.from(document.querySelectorAll('a[href]'))
        .slice(0, 20)
        .map((el, i) => ({
          text: el.textContent?.trim() || 'Link',
          href: (el as HTMLAnchorElement).href,
          selector: `a:nth-of-type(${i + 1})`,
        }));

      const forms = Array.from(document.querySelectorAll('form'))
        .map((el, i) => ({
          action: el.action || 'form submit',
          selector: `form:nth-of-type(${i + 1})`,
        }));

      return {
        url: window.location.href,
        title: document.title,
        headings,
        buttons,
        links,
        forms,
        images: document.querySelectorAll('img').length,
        scrollPosition: window.scrollY,
        scrollHeight: document.documentElement.scrollHeight,
        viewportHeight: window.innerHeight,
      };
    });
  }

  /**
   * Use AI to decide the next action based on persona and page state
   */
  private async decideNextAction(
    persona: Persona,
    snapshot: PageSnapshot,
    previousActions: AgentAction[],
    goal: ConversionGoal,
    metrics: SessionMetrics
  ): Promise<{ action: AgentActionType; target?: string; reason?: string; reasoning: string }> {
    
    const prompt = `You are simulating a user persona browsing a webpage.

PERSONA:
- Name: ${persona.name}
- Description: ${persona.description}
- Device: ${persona.demographics.device}
- Patience: ${persona.behavior.patience}/10
- Thoroughness: ${persona.behavior.thoroughness}/10
- Skepticism: ${persona.behavior.skepticism}/10
- Instructions: ${persona.agentInstructions}

CONVERSION GOAL: ${goal.description} (${goal.type}: ${goal.target})

CURRENT PAGE STATE:
- URL: ${snapshot.url}
- Title: ${snapshot.title}
- Scroll position: ${snapshot.scrollPosition}px / ${snapshot.scrollHeight}px total
- Headings visible: ${snapshot.headings.slice(0, 5).join(', ')}
- Buttons available: ${snapshot.buttons.slice(0, 8).map(b => b.text).join(', ')}
- Links available: ${snapshot.links.slice(0, 8).map(l => l.text).join(', ')}

ACTIONS TAKEN SO FAR (${previousActions.length}):
${previousActions.slice(-5).map(a => `- ${a.type}: ${a.target || a.details || ''}`).join('\n')}

TIME ON PAGE: ${metrics.timeOnPage / 1000}s

Based on this persona's characteristics and the current page state, decide the next action.
Consider: Would this persona be satisfied? Frustrated? Ready to convert? Ready to leave?

Respond with JSON:
{
  "action": "click" | "scroll" | "hover" | "read" | "wait" | "leave" | "convert",
  "target": "element selector or description (for click/hover)",
  "reason": "why leaving (only if action is 'leave')",
  "reasoning": "1-2 sentence explanation of why this persona would take this action"
}

IMPORTANT: Stay in character. A patient persona reads more. An impatient persona leaves quickly.`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          action: parsed.action || 'scroll',
          target: parsed.target,
          reason: parsed.reason,
          reasoning: parsed.reasoning || 'Continuing to browse',
        };
      }
    } catch (e) {
      console.error('[BrowserAgent] Decision error:', e);
    }

    // Default action: scroll
    return {
      action: 'scroll',
      reasoning: 'Default action: scrolling to see more content',
    };
  }

  /**
   * Execute a decided action on the page
   */
  private async executeAction(
    page: Page,
    decision: { action: AgentActionType; target?: string },
    metrics: SessionMetrics
  ): Promise<AgentAction> {
    const timestamp = Date.now();
    const startTime = Date.now();

    try {
      switch (decision.action) {
        case 'click':
          if (decision.target) {
            // Try to find and click the element
            const clickable = await this.findClickableElement(page, decision.target);
            if (clickable) {
              await clickable.click();
              metrics.elementsEngaged.push(decision.target);
            }
          }
          break;

        case 'scroll':
          // Scroll based on persona scroll speed
          const scrollAmount = 200 + Math.random() * 300;
          await page.evaluate((amount) => {
            window.scrollBy({ top: amount, behavior: 'smooth' });
          }, scrollAmount);
          break;

        case 'hover':
          if (decision.target) {
            const hoverable = await this.findClickableElement(page, decision.target);
            if (hoverable) {
              await hoverable.hover();
              metrics.hoverCount++;
            }
          }
          break;

        case 'read':
          // Simulate reading by waiting
          const readTime = 1000 + Math.random() * 2000;
          await page.waitForTimeout(readTime);
          metrics.readTimeMs += readTime;
          break;

        case 'wait':
          await page.waitForTimeout(500 + Math.random() * 1000);
          metrics.hesitationCount++;
          break;

        default:
          // No action needed
          break;
      }
    } catch (e) {
      console.error(`[BrowserAgent] Action error (${decision.action}):`, e);
    }

    return {
      type: decision.action,
      target: decision.target,
      timestamp,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Find a clickable element by description or selector
   */
  private async findClickableElement(page: Page, target: string): Promise<ElementHandle | null> {
    try {
      // Try exact selector first
      let element = await page.$(target);
      if (element) return element;

      // Try finding by text content
      element = await page.$(`text="${target}"`);
      if (element) return element;

      // Try partial text match
      element = await page.$(`text=${target}`);
      if (element) return element;

      // Try button with text
      element = await page.$(`button:has-text("${target}")`);
      if (element) return element;

      // Try link with text
      element = await page.$(`a:has-text("${target}")`);
      if (element) return element;

    } catch (e) {
      // Ignore selector errors
    }

    return null;
  }

  /**
   * Check if a conversion has occurred
   */
  private checkConversion(
    snapshot: PageSnapshot,
    goal: ConversionGoal,
    actions: AgentAction[]
  ): boolean {
    switch (goal.type) {
      case 'click':
        // Check if user clicked the target
        return actions.some(a => 
          a.type === 'click' && 
          a.target?.toLowerCase().includes(goal.target.toLowerCase())
        );

      case 'submit':
        // Check for form submission action
        return actions.some(a => a.type === 'click' && 
          (a.target?.toLowerCase().includes('submit') || 
           a.target?.toLowerCase().includes('sign up') ||
           a.target?.toLowerCase().includes('buy')));

      case 'navigate':
        // Check if URL matches goal
        return snapshot.url.includes(goal.target);

      default:
        return false;
    }
  }

  /**
   * Identify what triggered the conversion
   */
  private identifyConversionTrigger(actions: AgentAction[]): string {
    const lastClick = [...actions].reverse().find(a => a.type === 'click');
    if (lastClick?.target) {
      return `Clicked: ${lastClick.target}`;
    }
    return 'Unknown trigger';
  }

  /**
   * Get persona's final impression of the page
   */
  private async getPersonaImpression(
    persona: Persona,
    actions: AgentAction[],
    metrics: SessionMetrics,
    converted: boolean
  ): Promise<{ impression: 'positive' | 'neutral' | 'negative'; feedback: string }> {
    const prompt = `You simulated the persona "${persona.name}" browsing a webpage.

SESSION SUMMARY:
- Time on page: ${(metrics.timeOnPage / 1000).toFixed(1)}s
- Scroll depth: ${metrics.scrollDepthPercent.toFixed(0)}%
- Clicks: ${metrics.clickCount}
- Converted: ${converted ? 'Yes' : 'No'}
- Actions: ${actions.length}

Given this persona's characteristics:
- Patience: ${persona.behavior.patience}/10
- Skepticism: ${persona.behavior.skepticism}/10
- Goal: ${persona.intent.goal}

What would be their overall impression? Respond with JSON:
{
  "impression": "positive" | "neutral" | "negative",
  "feedback": "1-2 sentence feedback in first person as this persona"
}`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          impression: parsed.impression || 'neutral',
          feedback: parsed.feedback || 'No specific feedback',
        };
      }
    } catch (e) {
      console.error('[BrowserAgent] Impression error:', e);
    }

    return {
      impression: converted ? 'positive' : 'neutral',
      feedback: converted ? 'Found what I needed' : 'The page was okay',
    };
  }

  /**
   * Calculate pause time between actions based on persona
   */
  private calculatePauseTime(persona: Persona, action: AgentActionType): number {
    const basePause = 300;
    const patienceMultiplier = persona.behavior.patience / 5; // 0.2 to 2.0
    
    switch (action) {
      case 'read':
        return basePause * 3 * patienceMultiplier;
      case 'click':
        return basePause * patienceMultiplier;
      case 'scroll':
        return basePause * 0.5 * patienceMultiplier;
      default:
        return basePause * patienceMultiplier;
    }
  }

  /**
   * Get current scroll depth
   */
  private async getScrollDepth(page: Page): Promise<number> {
    return await page.evaluate(() => window.scrollY + window.innerHeight);
  }

  /**
   * Get viewport size for device type
   */
  private getViewportForDevice(device: 'mobile' | 'tablet' | 'desktop'): { width: number; height: number } {
    switch (device) {
      case 'mobile':
        return { width: 375, height: 812 };
      case 'tablet':
        return { width: 768, height: 1024 };
      case 'desktop':
      default:
        return { width: 1440, height: 900 };
    }
  }
}
