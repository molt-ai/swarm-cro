# SwarmCRO - Mission Control

## Vision
Autonomous A/B testing: AI agents with diverse personas actually browse and interact with page variants, generating real behavioral data to determine winners.

---

## Phase 1: Foundation ✅
- [x] Site extractor (lite)
- [x] Researcher agent (hypotheses + variant generation)
- [x] Screenshot preview (before/after with CSS injection)
- [x] Basic UI flow
- [x] Browserbase integration for screenshots
- [x] Deploy to Vercel

**Status:** v1.0.0 released, archived at molt-ai/swarm-cro-v1

---

## Phase 2: Agent Infrastructure 🚧
Building the core agent system that makes the swarm possible.

### 2.1 Persona Generator ✅
- [x] Define persona schema (demographics, goals, tech savviness, patience, etc.)
- [x] AI-powered persona generation from target audience description
- [x] Persona library (10 presets: "impatient mobile", "thorough researcher", etc.)
- [x] Persona → behavior mapping (agentInstructions field)

### 2.2 Browser Agent ✅
- [x] Single agent that can browse with Playwright + Browserbase
- [x] Persona-driven behavior (AI decides actions based on persona traits)
- [x] Action logging (full action history with timestamps and reasoning)
- [x] Conversion detection (click, submit, navigate goals)
- [ ] Session recording/replay (future: video capture)

### 2.3 Agent Session Manager ✅
- [x] Spawn browser sessions via Browserbase
- [x] Inject variant changes (CSS/JS) before agent runs
- [x] Collect metrics per session (time on page, scroll depth, clicks, conversions)
- [x] Handle session cleanup

---

## Phase 3: Swarm Orchestration ✅
Running multiple agents in parallel to generate statistically meaningful data.

### 3.1 Swarm Runner ✅
- [x] Run N agents per variant (configurable)
- [x] Distribute personas across variants evenly
- [x] Parallel execution with rate limiting
- [x] Progress tracking and status updates

### 3.2 Experiment Manager ✅
- [x] Define experiments (URL, variants, success criteria)
- [x] Track experiment state (running, completed, analyzing)
- [x] Store raw session data

---

## Phase 4: Analysis & Results 🚧
Turning raw behavioral data into actionable insights.

### 4.1 Behavior Analyzer ✅
- [x] Aggregate metrics per variant
- [x] Statistical significance calculation (simplified)
- [x] Winner determination with confidence intervals
- [x] Behavioral pattern detection (exit reasons, conversion triggers)

### 4.2 Results Dashboard ✅
- [x] Visual comparison of variants (side-by-side metrics)
- [x] Session list with persona details
- [x] Insights and recommendations tabs
- [ ] Conversion funnel visualization (future)
- [ ] Heatmap-style click/scroll data (future)
- [ ] Export winning variant code (future)

---

## Phase 5: Polish & Scale
Making it production-ready.

### 5.1 UX Improvements
- [ ] Real-time experiment progress
- [ ] Email/webhook notifications when complete
- [ ] Experiment history and comparison

### 5.2 Infrastructure
- [ ] Queue system for large experiments
- [ ] Cost estimation before running
- [ ] Usage limits and billing prep

---

## Current Sprint
**Focus:** Phase 4.2 - Results Dashboard + API Integration

### Completed This Session
- [x] Persona system (types, presets, AI generator)
- [x] Browser agent (AI-driven browsing with persona behavior)
- [x] Swarm runner (parallel execution, rate limiting)
- [x] Results analyzer (metrics, winner determination, insights)

### Tasks in Progress
- [x] Create API route for running experiments (`/api/swarm/run`)
- [x] Create API route for test sessions (`/api/swarm/test`)
- [x] Update UI to support swarm experiments (🐝 Swarm tab)
- [x] Results dashboard component (SwarmExperiment.tsx)
- [x] Fix TypeScript/build errors
- [x] Add real-time progress updates (SSE streaming)
- [ ] Test end-to-end flow on production

---

## Dev Notes

### Key Files
- `web/src/lib/agent/` - Original researcher agent (v1)
- `web/src/lib/persona/` - Persona types, presets, AI generator
- `web/src/lib/swarm/` - Browser agent, swarm runner, types
- `web/src/app/api/` - API routes

### Running Locally
```bash
cd web && npm run dev
```

### Browserbase
Using Browserbase for cloud browser sessions. Credentials in `.env.local`.

---

## Ideas Backlog
- Voice personas (agent "thinks out loud" while browsing)
- Competitor comparison mode
- Accessibility testing personas (screen reader users)
- Mobile vs desktop persona split
- Integration with real analytics (GA4, Mixpanel)
- A/B test code export for Optimizely/VWO

---

*Last updated: 2026-02-13*
