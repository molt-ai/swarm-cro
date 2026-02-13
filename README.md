# SwarmCRO 🐝

Autonomous A/B testing powered by AI agent swarms.

## What it does

Give any URL → AI agents with diverse personas browse and interact → Real behavioral data → Winner determination

No real users needed. Get A/B test insights in minutes instead of weeks.

## How it works

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  URL Input      │────▶│  AI Analysis     │────▶│  Variant Gen    │
│  (any website)  │     │  (structure/CRO) │     │  (hypotheses)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Results &      │◀────│  Behavior        │◀────│  Agent Swarm    │
│  Winner         │     │  Analysis        │     │  (AI personas)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## Features

### 🧠 AI Analysis
- Extracts page structure (headings, CTAs, forms)
- Generates CRO hypotheses based on psychology
- Creates CSS/JS variants to test

### 👥 Diverse Personas
- 10 built-in archetypes (Impatient Mobile, Skeptical Buyer, etc.)
- AI-generated personas from target audience descriptions
- Each persona has unique behavior traits:
  - Patience, thoroughness, skepticism
  - Click patterns, scroll speed
  - Conversion triggers and dealbreakers

### 🐝 Swarm Testing
- Real browser sessions via Browserbase
- AI decides actions based on persona traits
- Tracks: clicks, scrolls, time on page, hesitation
- Detects conversions based on your goals

### 📊 Results Dashboard
- Conversion rate comparison
- Engagement scores
- Session-by-session breakdown
- AI-generated insights and recommendations
- Statistical significance indication

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **AI**: Claude API (Sonnet)
- **Browser**: Browserbase (cloud Playwright)
- **Styling**: Tailwind CSS

## Quick Start

```bash
cd web
npm install
cp .env.example .env.local
# Add your API keys
npm run dev
```

### Environment Variables

```
ANTHROPIC_API_KEY=sk-ant-...
BROWSERBASE_API_KEY=bb_live_...
BROWSERBASE_PROJECT_ID=...
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/analyze` | Analyze page and generate hypotheses |
| `POST /api/screenshot` | Before/after screenshots |
| `POST /api/swarm/run` | Run full swarm experiment |
| `POST /api/swarm/stream` | SSE stream for real-time progress |
| `POST /api/swarm/test` | Single agent test session |

## Architecture

```
web/src/
├── app/
│   ├── page.tsx          # Main UI
│   └── api/
│       ├── analyze/      # CRO analysis
│       ├── screenshot/   # Visual preview
│       └── swarm/        # Swarm experiments
├── components/
│   ├── ScreenshotPreview.tsx
│   └── SwarmExperiment.tsx
└── lib/
    ├── persona/          # Persona types, presets, generator
    └── swarm/            # Browser agent, runner, types
```

## Roadmap

- [ ] Conversion funnel visualization
- [ ] Session replay/video
- [ ] Heatmaps
- [ ] Export to Optimizely/VWO
- [ ] Scheduled experiments
- [ ] Team collaboration

## License

MIT

---

Built with 🐝 by AI agents
