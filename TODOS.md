# GroveDomainTool TODOs

## Phase 1: Extraction & Core - COMPLETE
- [x] Extract domain_checker.py to standalone package
- [x] Set up pyproject.toml for UV
- [x] Create config.py with all configurable settings
- [x] Move SPEC.md to docs/
- [x] Fill in AGENT.md placeholders
- [x] Update README.md with proper content
- [x] Add Cloudflare pricing lookup
- [x] Basic CLI: `grove-domain-tool check example.com`
- [x] Create secrets.json template

## Phase 2: Durable Object & Persistence - COMPLETE
- [x] Set up Cloudflare Worker with Durable Object
- [x] Implement SQLite schema in DO
- [x] Alarm-based batch chaining
- [x] Basic job lifecycle (create -> running -> complete/needs_followup)
- [x] Wrangler deployment commands file (worker/COMMANDS.txt)
- [x] Deploy worker to Cloudflare
- [x] DO persistence between alarms (verified working)
- [x] SSE streaming endpoint for real-time progress

## Phase 3: AI Orchestration - COMPLETE
- [x] Implement driver agent with prompt templates (Python + TypeScript)
- [x] Implement Haiku swarm parallel evaluation (Python + TypeScript)
- [x] Build main search loop (6 batch limit)
- [x] Results scoring and ranking
- [x] Add provider abstraction for Claude/Kimi/Mock
- [x] Create orchestrator with state management
- [x] CLI: `grove-domain-tool search "Business Name" --mock`
- [x] CLI: Real AI search with Claude API (tested & working)
- [x] Fix terminal output to show domains with unknown pricing
- [x] Fix prompts to generate business-themed domains (not generic)
- [x] Add API usage tracking (tokens + cost estimation)
- [x] **Port orchestrator to TypeScript in Durable Object**
- [x] **TypeScript driver agent (Claude API calls)**
- [x] **TypeScript swarm agent (parallel Haiku evaluation)**
- [x] **TypeScript RDAP checker**
- [x] **End-to-end Worker tested and working!**

## Phase 4: MCP Server - SKIPPED
*Not needed - REST API is sufficient for web integration*
- [ ] ~~Implement MCP tool definitions~~
- [ ] ~~Add job status tracking via MCP~~
- [ ] ~~Build results aggregation~~
- [ ] ~~Test MCP tools with Claude Desktop~~

## Phase 5: Quiz System - PARTIAL
- [x] Static initial quiz schema (JSON)
- [x] Follow-up quiz generator (AI-based with mock support)
- [ ] SvelteKit quiz components (terminal aesthetic)
- [x] Resend email integration (email.ts templates)
- [x] Email templates (terminal aesthetic)

## Phase 6: Multi-Model & Polish - COMPLETE
- [x] Add Kimi K2 provider (stub, ready for API key)
- [x] **Multi-model support with function calling** (DeepSeek V3.2, Kimi K2, Cloudflare Llama 4 Scout)
- [x] **API-level provider selection** (`driver_provider`, `swarm_provider` in request body)
- [x] **Tool calling migration** (proper function calls instead of JSON prompts)
- [x] GroveEngine integration (frontend at domains.grove.place)
- [x] Production testing (Worker API tested with Claude + DeepSeek!)
- [ ] Parallel provider execution (both providers simultaneously) - *nice to have*
- [ ] Documentation updates

## Testing - COMPLETE
- [x] Unit tests for checker.py
- [x] Unit tests for config.py
- [x] Unit tests for providers (test_providers.py)
- [x] Unit tests for agents (test_agents.py)
- [x] Unit tests for orchestrator (test_orchestrator.py)
- [x] Unit tests for quiz (test_quiz.py)
- [x] 73 tests passing

## Documentation
- [x] Deployment guide (worker/DEPLOY.md)
- [x] Wrangler commands reference (worker/COMMANDS.txt)
- [ ] API documentation
- [ ] Usage examples
- [ ] Architecture diagrams

---

## Completed This Session (2025-12-06)

### Major Accomplishment: TypeScript Port Complete!

The Python orchestrator has been fully ported to TypeScript and is now running in Cloudflare Durable Objects:

- [x] Created `worker/src/prompts.ts` - All prompt templates
- [x] Created `worker/src/agents/driver.ts` - Driver agent using Claude API
- [x] Created `worker/src/agents/swarm.ts` - Swarm agent with parallel Haiku calls
- [x] Created `worker/src/rdap.ts` - RDAP domain availability checker
- [x] Wired up `processBatch()` in Durable Object
- [x] Added SSE streaming endpoint `/api/stream?job_id=xxx`
- [x] Deployed to production
- [x] **End-to-end test successful!**

### Test Results
First production search for "Sunrise Bakery":
- 3 batches completed
- 100 domains checked
- **16 available domains found!**
- Top results: sunrisebreadworks.com, sunrisepastry.com, sunrisekneads.com
- 17,658 tokens used

---

## API Endpoints (Production)

Base URL: `https://grove-domain-tool.m7jv4v7npb.workers.dev`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/api/search` | POST | Start new search job |
| `/api/status?job_id=xxx` | GET | Get job status |
| `/api/results?job_id=xxx` | GET | Get search results |
| `/api/stream?job_id=xxx` | GET | SSE stream for real-time updates |
| `/api/followup?job_id=xxx` | GET | Get follow-up quiz |
| `/api/resume?job_id=xxx` | POST | Resume with follow-up answers |
| `/api/cancel?job_id=xxx` | POST | Cancel running job |

### Start Search Request
```json
POST /api/search
{
  "client_id": "client-123",
  "quiz_responses": {
    "business_name": "Sunrise Bakery",
    "tld_preferences": ["com", "co", "io", "app", "dev"],
    "vibe": "creative",
    "keywords": "fresh baked goods"
  },
  "driver_provider": "deepseek",  // optional: claude (default), deepseek, kimi, cloudflare
  "swarm_provider": "deepseek"    // optional: claude (default), deepseek, kimi, cloudflare
}
```

### Available AI Providers
| Provider | Model | Cost (In/Out per M tokens) |
|----------|-------|---------------------------|
| `claude` | Claude Sonnet 4 | $3.00 / $15.00 |
| `deepseek` | DeepSeek V3.2 | $0.28 / $0.42 |
| `kimi` | Kimi K2 | $0.60 / $2.50 |
| `cloudflare` | Llama 4 Scout | $0.27 / $0.85 |

---

## Key Files Modified This Session

### New TypeScript Files
- `worker/src/prompts.ts` - Prompt templates
- `worker/src/agents/driver.ts` - Driver agent
- `worker/src/agents/swarm.ts` - Swarm agent
- `worker/src/rdap.ts` - RDAP checker

### Updated Files
- `worker/src/durable-object.ts` - Full processBatch implementation
- `worker/src/index.ts` - Added stream endpoint
- `worker/src/types.ts` - Fixed type conflicts

---

## Next Steps

### 1. Cloudflare Pricing Integration - COMPLETE
- [x] Using cfdomainpricing.com third-party API (405 TLDs supported)
- [x] Python: Updated `pricing.py` with file-based caching (24hr TTL)
- [x] TypeScript: Created `worker/src/pricing.ts` with in-memory caching
- [x] Integrated into Worker's `processBatch()` - pricing fetched for available domains
- [x] Results API returns `price_cents`, `price_display`, and `pricing_category`
- [x] Pricing summary in results (bundled/recommended/premium counts)

### 2. Email Notifications
- Send results email when search completes
- Send follow-up quiz email when needs_followup status
- Use Resend integration (already have email.ts templates)

### 3. Config Panel - All Options & Valves
- Expose all configurable options in admin panel
- MAX_BATCHES (currently 6)
- TARGET_RESULTS (currently 25)
- TLD preferences
- Vibe options
- Rate limiting settings
- API usage limits/warnings

### 4. Integrate with domains.grove.place
- Website needs to poll `/api/status` or connect to `/api/stream`
- Show real-time progress as search runs
- Display results when complete
- Admin panel should show running jobs

---

---

## Completed Session 2 (2025-12-06 afternoon)

### Multi-Model Support with Function Calling

Added support for 4 AI providers with proper tool/function calling:

- **Claude Sonnet 4** - Best quality, highest cost ($3.00/$15.00 per M tokens)
- **DeepSeek V3.2** - Great quality, very low cost ($0.28/$0.42 per M tokens) - TESTED & WORKING
- **Kimi K2** - Good quality, low cost ($0.60/$2.50 per M tokens)
- **Cloudflare Llama 4 Scout** - Good quality, lowest cost ($0.27/$0.85 per M tokens)

### Key Changes
- Created provider abstraction layer (`worker/src/providers/`)
- Migrated from JSON prompts to proper function/tool calling
- Added API-level provider selection (`driver_provider`, `swarm_provider`)
- Frontend can now select AI model per-search without config changes

### Files Created
- `worker/src/providers/types.ts` - Provider interface
- `worker/src/providers/anthropic.ts` - Claude provider
- `worker/src/providers/deepseek.ts` - DeepSeek provider
- `worker/src/providers/kimi.ts` - Kimi provider
- `worker/src/providers/cloudflare.ts` - Cloudflare AI provider
- `worker/src/providers/tools.ts` - Tool definitions
- `worker/src/providers/index.ts` - Factory function

---

## Remaining Work

### High Priority
- [ ] Email notifications (Resend integration ready, just needs wiring)
- [ ] Add AI Model selector to frontend Searcher page

### Nice to Have
- [ ] Parallel provider execution (run 2 providers simultaneously)
- [ ] Documentation updates
- [ ] Follow-up quiz UI (if needed)

---

*Last updated: 2025-12-06 (afternoon session)*
*73 tests passing (Python)*
*Worker: https://grove-domain-tool.m7jv4v7npb.workers.dev*
*Frontend: https://domains.grove.place*
*CLI: `grove-domain-tool search "Business Name" --batches 2`*
