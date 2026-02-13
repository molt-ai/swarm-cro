# SwarmCRO Architecture

## System Overview

SwarmCRO is a mobile-first web app that automates CRO through AI agent simulation.

## User Flow

1. User enters URL on phone
2. System extracts and clones the page
3. AI generates variant hypotheses
4. Agent swarm runs simulated A/B tests
5. Results displayed with winning variant code

## Component Deep Dive

### 1. Site Extractor

**Purpose**: Fetch any URL and create a modifiable local copy

**Approach**:
- Use Playwright/Puppeteer to render full page (handles JS)
- Extract computed HTML + CSS
- Inline styles for isolation
- Store as modifiable template

**Key challenges**:
- Dynamic content (SPAs, lazy loading)
- Authentication walls
- CORS/iframe restrictions

**Solution**: Browserbase cloud provides stealth browsers that bypass most issues

### 2. Persona Generator

**Purpose**: Create diverse, realistic user profiles

**Based on AgentA/B paper**:
```json
{
  "id": "persona_001",
  "demographics": {
    "age": 34,
    "gender": "female",
    "location": "suburban midwest",
    "income": "middle"
  },
  "behaviors": {
    "tech_savviness": "moderate",
    "shopping_style": "comparison_shopper",
    "attention_span": "short",
    "price_sensitivity": "high"
  },
  "goals": ["find best deal", "quick checkout"],
  "frustrations": ["too many steps", "hidden fees"]
}
```

**Generation**: Claude API with demographic distributions matching target audience

### 3. Variant Generator

**Purpose**: Auto-generate testable variations

**Types of changes**:
- Copy variations (headlines, CTAs, descriptions)
- Layout changes (element positioning, spacing)
- Color/contrast adjustments
- Social proof additions
- Urgency elements
- Form simplification

**Approach**: 
- Analyze page with vision model
- Identify conversion elements
- Generate hypotheses based on CRO best practices
- Output as CSS overrides + HTML patches

### 4. Agent Swarm

**Purpose**: Simulate user interactions at scale

**Architecture**:
```
Swarm Controller
    │
    ├── Agent Pool (n=100-1000)
    │   ├── Agent 1 (persona A, variant A)
    │   ├── Agent 2 (persona B, variant A)
    │   ├── Agent 3 (persona A, variant B)
    │   └── ...
    │
    └── Metrics Collector
```

**Agent behavior loop**:
1. Load assigned variant
2. Execute persona-driven actions (scroll, click, read)
3. Decide: convert, abandon, or continue
4. Report behavior trace + outcome

**Implementation**: Stagehand agent() with persona-injected prompts

### 5. Behavior Analyzer

**Metrics tracked**:
- Conversion rate (reached goal)
- Time to conversion
- Bounce rate
- Scroll depth
- Click patterns
- Abandonment points

**Statistical analysis**:
- T-test for significance
- Confidence intervals
- Sample size recommendations

### 6. Code Outputter

**Output formats**:
- CSS override snippet
- Full HTML replacement
- Before/after visual diff
- Implementation instructions

## Tech Decisions

### Why Stagehand over browser-use?

| Factor | Stagehand | browser-use |
|--------|-----------|-------------|
| Language | TypeScript | Python |
| Reliability | Self-healing, caching | Manual retry |
| Cost | Token caching saves $$$ | Full inference each time |
| Maintenance | Browserbase backed | Community |
| Our stack | Next.js (TS native) | Would need Python service |

**Decision**: Stagehand for agent automation

### Mobile-First PWA

- Next.js with Tailwind
- Service worker for offline
- Add to home screen
- Push notifications for test completion
- Responsive design (phone primary)

## MVP Scope

**Phase 1** (v0.1):
- Single URL input
- 3 auto-generated variants
- 50 agent simulation
- Basic metrics dashboard
- CSS override output

**Phase 2** (v0.2):
- Custom persona upload
- More variant types
- 500 agent scale
- Visual diff tool

**Phase 3** (v0.3):
- Multi-page flows
- Continuous optimization
- API access
- Team collaboration
