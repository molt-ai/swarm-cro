/**
 * Browser Agent - Uses Stagehand to interact with real web pages
 * 
 * This is the core agent that simulates user behavior on a webpage.
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  AgentPersona,
  AgentState,
  AgentAction,
  AgentSessionResult,
  PageContent,
  Variant,
  VariantChange,
} from './types';

// Stagehand types (we'll use dynamic import for serverless compatibility)
type StagehandInstance = any;

export class BrowserAgent {
  private persona: AgentPersona;
  private anthropic: Anthropic;
  private stagehand: StagehandInstance | null = null;
  private state: AgentState;
  private maxActions: number;

  constructor(
    persona: AgentPersona,
    options: {
      maxActions?: number;
      anthropicApiKey?: string;
    } = {}
  ) {
    this.persona = persona;
    this.maxActions = options.maxActions || 20;
    this.anthropic = new Anthropic({
      apiKey: options.anthropicApiKey || process.env.ANTHROPIC_API_KEY,
    });
    
    this.state = {
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      persona,
      currentUrl: '',
      pageContent: this.emptyPageContent(),
      scrollPosition: 0,
      timeOnPage: 0,
      actionsPerformed: [],
      converted: false,
    };
  }

  /**
   * Run a test session on a URL with optional variant changes
   */
  async runSession(
    url: string,
    variant?: Variant,
    options: {
      browserbaseApiKey?: string;
      headless?: boolean;
    } = {}
  ): Promise<AgentSessionResult> {
    const startTime = Date.now();
    
    try {
      // Initialize Stagehand
      const { Stagehand } = await import('@browserbasehq/stagehand');
      
      this.stagehand = new Stagehand({
        env: options.browserbaseApiKey ? 'BROWSERBASE' : 'LOCAL',
        apiKey: options.browserbaseApiKey || process.env.BROWSERBASE_API_KEY,
        localBrowserLaunchOptions: {
          headless: options.headless ?? true,
        },
        model: 'claude-3-5-sonnet-latest',
      });

      await this.stagehand.init();

      // Navigate to the page
      await this.stagehand.page.goto(url);
      this.state.currentUrl = url;

      // Apply variant changes if provided
      if (variant) {
        await this.applyVariantChanges(variant.changes);
      }

      // Extract initial page content
      this.state.pageContent = await this.extractPageContent();

      // Run the agent loop
      let actionCount = 0;
      while (actionCount < this.maxActions && !this.state.converted) {
        const action = await this.decideNextAction();
        
        if (action.type === 'leave') {
          this.state.exitReason = action.reasoning;
          break;
        }

        await this.executeAction(action);
        this.state.actionsPerformed.push(action);
        actionCount++;

        // Update page content after action
        this.state.pageContent = await this.extractPageContent();
        this.state.timeOnPage = Date.now() - startTime;

        // Small delay to simulate human timing
        await this.humanDelay();
      }

      const endTime = Date.now();

      return {
        sessionId: this.state.sessionId,
        persona: this.persona,
        variant: variant?.id || 'control',
        startTime,
        endTime,
        actions: this.state.actionsPerformed,
        converted: this.state.converted,
        conversionType: this.state.converted ? 'click_cta' : undefined,
        exitReason: this.state.exitReason || 'max_actions_reached',
        metrics: {
          timeOnPage: endTime - startTime,
          scrollDepth: this.state.scrollPosition,
          elementsInteracted: this.state.actionsPerformed.filter(a => a.type === 'click').length,
          hesitationCount: this.state.actionsPerformed.filter(a => a.type === 'wait').length,
        },
      };
    } finally {
      // Clean up
      if (this.stagehand) {
        await this.stagehand.close();
      }
    }
  }

  /**
   * Use Claude to decide what action to take next
   */
  private async decideNextAction(): Promise<AgentAction> {
    const prompt = this.buildDecisionPrompt();

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return this.parseActionResponse(text);
  }

  /**
   * Build the prompt for the agent's decision
   */
  private buildDecisionPrompt(): string {
    const p = this.persona;
    
    return `You are simulating a user browsing a webpage. Your persona:

DEMOGRAPHICS:
- Age: ${p.demographics.age}
- Gender: ${p.demographics.gender}
- Income: ${p.demographics.income}
- Education: ${p.demographics.education}

TRAITS:
- Tech savvy: ${p.psychographics.techSavvy}/10
- Price sensitive: ${p.psychographics.priceSensitive}/10
- Impulsive: ${p.psychographics.impulsive}/10
- Cautious: ${p.psychographics.cautious}/10

GOALS: ${p.goals.join(', ')}
FRUSTRATIONS: ${p.frustrations.join(', ')}

CURRENT PAGE:
URL: ${this.state.currentUrl}
Title: ${this.state.pageContent.title}

VISIBLE ELEMENTS:
Headings: ${this.state.pageContent.headings.map(h => h.text).join(', ')}
Buttons: ${this.state.pageContent.buttons.map(b => b.text).join(', ')}
Links: ${this.state.pageContent.links.slice(0, 5).map(l => l.text).join(', ')}

ACTIONS SO FAR: ${this.state.actionsPerformed.length}
TIME ON PAGE: ${Math.round(this.state.timeOnPage / 1000)}s

Based on your persona, decide your next action. Respond with JSON:
{
  "action": "scroll" | "click" | "read" | "wait" | "leave",
  "target": "selector or description if applicable",
  "reasoning": "why you're taking this action based on your persona"
}

Consider:
- Would this persona find the page engaging?
- Would they trust this site?
- Are their goals being met?
- Would they convert (click CTA, sign up, purchase)?`;
  }

  /**
   * Parse Claude's response into an AgentAction
   */
  private parseActionResponse(text: string): AgentAction {
    try {
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { type: 'leave', timestamp: Date.now(), reasoning: 'Failed to parse action' };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Check for conversion
      if (parsed.action === 'click' && this.isConversionTarget(parsed.target)) {
        this.state.converted = true;
      }

      return {
        type: parsed.action as AgentAction['type'],
        target: parsed.target,
        timestamp: Date.now(),
        reasoning: parsed.reasoning,
      };
    } catch (e) {
      return { type: 'leave', timestamp: Date.now(), reasoning: 'Parse error: ' + e };
    }
  }

  /**
   * Execute an action using Stagehand
   */
  private async executeAction(action: AgentAction): Promise<void> {
    if (!this.stagehand) return;

    try {
      switch (action.type) {
        case 'scroll':
          await this.stagehand.page.evaluate(() => {
            window.scrollBy(0, 300);
          });
          this.state.scrollPosition += 300;
          break;

        case 'click':
          if (action.target) {
            await this.stagehand.act({ action: `click on ${action.target}` });
          }
          break;

        case 'read':
          // Simulate reading time
          await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000));
          break;

        case 'wait':
          await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
          break;

        case 'hover':
          if (action.target) {
            await this.stagehand.act({ action: `hover over ${action.target}` });
          }
          break;
      }
    } catch (e) {
      console.error('Action execution error:', e);
    }
  }

  /**
   * Extract structured content from the current page
   */
  private async extractPageContent(): Promise<PageContent> {
    if (!this.stagehand) return this.emptyPageContent();

    try {
      const data = await this.stagehand.extract({
        instruction: 'Extract all headings, buttons, links, and form elements from this page',
        schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            headings: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  text: { type: 'string' },
                  level: { type: 'number' },
                },
              },
            },
            buttons: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  text: { type: 'string' },
                  type: { type: 'string' },
                },
              },
            },
            links: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  text: { type: 'string' },
                  href: { type: 'string' },
                },
              },
            },
          },
        },
      });

      return {
        title: data.title || '',
        url: this.state.currentUrl,
        headings: (data.headings || []).map((h: any) => ({
          level: h.level || 1,
          text: h.text || '',
          selector: '',
        })),
        paragraphs: [],
        buttons: (data.buttons || []).map((b: any) => ({
          text: b.text || '',
          selector: '',
          type: b.type || 'primary',
        })),
        forms: [],
        images: [],
        links: (data.links || []).map((l: any) => ({
          text: l.text || '',
          href: l.href || '',
          selector: '',
        })),
        testimonials: [],
        prices: [],
      };
    } catch (e) {
      console.error('Extract error:', e);
      return this.emptyPageContent();
    }
  }

  /**
   * Apply variant changes to the page
   */
  private async applyVariantChanges(changes: VariantChange[]): Promise<void> {
    if (!this.stagehand) return;

    for (const change of changes) {
      try {
        await this.stagehand.page.evaluate((c: VariantChange) => {
          const element = document.querySelector(c.target);
          if (!element) return;

          switch (c.type) {
            case 'modify':
              if (c.property === 'textContent') {
                element.textContent = c.newValue || '';
              } else if (c.property === 'innerHTML') {
                element.innerHTML = c.newValue || '';
              } else if (c.property === 'style') {
                (element as HTMLElement).style.cssText += c.newValue || '';
              }
              break;

            case 'add':
              if (c.html) {
                const temp = document.createElement('div');
                temp.innerHTML = c.html;
                if (c.position === 'before') {
                  element.parentNode?.insertBefore(temp.firstChild!, element);
                } else if (c.position === 'after') {
                  element.parentNode?.insertBefore(temp.firstChild!, element.nextSibling);
                } else {
                  element.appendChild(temp.firstChild!);
                }
              }
              break;

            case 'remove':
              element.remove();
              break;
          }
        }, change);
      } catch (e) {
        console.error('Variant change error:', e);
      }
    }
  }

  /**
   * Check if a target is a conversion element
   */
  private isConversionTarget(target: string): boolean {
    const conversionKeywords = [
      'sign up', 'signup', 'register', 'subscribe', 'buy', 'purchase',
      'get started', 'start now', 'try free', 'add to cart', 'checkout',
      'submit', 'cta', 'primary button'
    ];
    const lower = target.toLowerCase();
    return conversionKeywords.some(kw => lower.includes(kw));
  }

  /**
   * Simulate human-like delay
   */
  private async humanDelay(): Promise<void> {
    const baseDelay = 500;
    const variance = Math.random() * 1500;
    
    // Adjust based on persona
    const speedMultiplier = 
      this.persona.behaviorPatterns.decisionSpeed === 'quick' ? 0.5 :
      this.persona.behaviorPatterns.decisionSpeed === 'hesitant' ? 2 : 1;
    
    await new Promise(r => setTimeout(r, (baseDelay + variance) * speedMultiplier));
  }

  private emptyPageContent(): PageContent {
    return {
      title: '',
      url: '',
      headings: [],
      paragraphs: [],
      buttons: [],
      forms: [],
      images: [],
      links: [],
      testimonials: [],
      prices: [],
    };
  }
}
