# SwarmCRO Research Notes

## Core Problem
Traditional A/B testing requires real user traffic, takes weeks, and is expensive. We want AI agents that simulate real users to test website variants before deployment.

## Key Papers & Projects

### AgentA/B (Amazon, 2025)
- 1000 LLM agents simulated A/B test on Amazon.com
- Results aligned with real human experiments
- Architecture:
  1. **Environment Parsing Module** - Converts live webpages to structured JSON representation
  2. **LLM Agent** - Reasons about actions based on persona and intention
  3. **Action Execution Module** - Executes DOM operations on live sites
- Key insight: Persona-driven agents can detect interface-sensitive behavioral differences

### Browser Automation Options
- **browser-use** (TypeScript): `npm install browser-use` - AI agent framework for web automation
- **Stagehand** (Browserbase): AI-centric layer on Playwright with act/extract/observe
- **Skyvern**: Vision LLM-based browser automation
- **Playwright/Puppeteer**: Low-level, brittle, but precise

### Evolv AI Approach
- Evolutionary/genetic algorithms for variant generation
- Multi-armed bandit for traffic allocation
- Continuous optimization, not just A/B
- Real-time performance evaluation

## Architecture for SwarmCRO v2

### 1. Browser Infrastructure
- Use **Browserbase** for hosted browsers (no local browser issues)
- **Stagehand** for AI-powered automation
- Parallel browser sessions for swarm simulation

### 2. Agent System
```
Agent = {
  persona: {
    demographics: { age, gender, income, education },
    psychographics: { tech_savvy, price_sensitive, brand_loyal },
    goals: ["find product", "compare prices", "make purchase"],
    frustrations: ["slow loading", "confusing navigation"],
    behavior_patterns: { scroll_speed, read_time, click_hesitation }
  },
  current_state: {
    page_url,
    visible_elements,
    scroll_position,
    time_on_page,
    actions_taken
  },
  decide_action(): Action,
  execute_action(): Observation,
  evaluate_experience(): Score
}
```

### 3. Variant Generation
Not just CSS - actual HTML/DOM modifications:
- Change button text/color/size/position
- Reorder page sections
- Add/remove elements (testimonials, trust badges, urgency indicators)
- Modify form fields
- Change headlines and copy

### 4. Researcher Agent
Analyzes results and proposes new tests:
```
Researcher = {
  analyze_results(experiment_data): Insights,
  generate_hypotheses(insights): Hypothesis[],
  propose_variants(hypothesis): Variant[],
  prioritize_tests(variants): RankedTests
}
```

### 5. Experiment Orchestrator
- Traffic allocation (control vs variants)
- Statistical significance testing
- Multi-armed bandit for optimal allocation
- Stopping rules (when to declare winner)

## Implementation Plan

### Phase 1: Real Browser Agents
1. Set up Browserbase account
2. Integrate Stagehand for automation
3. Build single agent that can navigate and interact
4. Add persona-driven decision making

### Phase 2: Swarm Simulation
1. Parallel agent execution
2. Behavioral logging (actions, timing, outcomes)
3. Conversion tracking
4. Statistical analysis

### Phase 3: Variant Generation
1. DOM manipulation API
2. AI-powered variant generator
3. A/B test configuration
4. Traffic splitting

### Phase 4: Researcher Agent
1. Result analysis
2. Hypothesis generation
3. Iterative optimization
4. Learning from past experiments

## Key Decisions

### Why Browserbase/Stagehand?
- Hosted browsers (no Vercel serverless issues)
- AI-native (act/extract/observe primitives)
- Reliable in production
- Parallel sessions at scale

### Why not just CSS?
CSS-only changes are limited. Real CRO requires:
- Content changes (headlines, copy, CTAs)
- Structural changes (layout, ordering)
- Element additions (social proof, urgency)
- Form modifications

### Agent vs Simulation
Option A: **Lightweight Simulation** (current)
- No real browser, just LLM reasoning
- Fast, cheap, but less realistic

Option B: **Full Browser Agents** (target)
- Real browser interactions
- More accurate behavior simulation
- Higher cost, slower

Recommendation: Start with lightweight, add full browser for validation.

## Cost Estimates

### Browserbase
- Free tier: Limited
- Pro: ~$0.01 per minute of browser time
- 1000 agents × 2 min each = $20 per experiment

### LLM Costs
- Claude: ~$0.01 per agent session (10 turns)
- 1000 agents = $10 per experiment

### Total per experiment: ~$30

## References
1. AgentA/B paper: https://arxiv.org/abs/2504.09723
2. browser-use: https://github.com/browser-use/browser-use
3. Stagehand: https://github.com/browserbase/stagehand
4. Evolv AI: https://evolv.ai
