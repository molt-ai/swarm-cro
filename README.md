# SwarmCRO

Autonomous A/B testing platform powered by AI agent swarms.

## Concept

Give any URL → agents simulate diverse users → auto-generate & test variants → output optimized code

## Architecture (based on AgentA/B paper)

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  URL Input      │────▶│  Site Extractor  │────▶│  Variant Gen    │
│  (any website)  │     │  (HTML/CSS/JS)   │     │  (AI mutations) │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Results &      │◀────│  Behavior        │◀────│  Agent Swarm    │
│  Optimized Code │     │  Analysis        │     │  (personas)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## Core Components

1. **Site Extractor** - Fetch URL, extract HTML/CSS, create modifiable clone
2. **Persona Generator** - Create diverse user profiles (demographics, goals, behaviors)
3. **Variant Generator** - AI generates A/B test variations
4. **Agent Swarm** - Multiple browser agents with personas interact with variants
5. **Behavior Analyzer** - Compare metrics, determine winners
6. **Code Outputter** - Generate copy-paste optimized code

## Tech Stack

- **Browser Automation**: Stagehand (TypeScript) or browser-use (Python)
- **Frontend**: Next.js (mobile-first PWA)
- **LLM**: Claude API for persona gen + analysis
- **Infra**: Browserbase cloud for scalable browser sessions

## Prior Art

- AgentA/B (Amazon, 2025) - 1000 LLM agents A/B testing on Amazon.com
- browser-use (25k stars) - AI browser automation
- Stagehand (Browserbase) - AI-powered Playwright
- syntheticusers.com - Synthetic UX research

## Status

🚧 Research & Planning
