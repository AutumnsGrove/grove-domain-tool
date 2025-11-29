# grove-domain-search TODOs

## Phase 1: Extraction & Core - COMPLETE
- [x] Extract domain_checker.py to standalone package
- [x] Set up pyproject.toml for UV
- [x] Create config.py with all configurable settings
- [x] Move SPEC.md to docs/
- [x] Fill in AGENT.md placeholders
- [x] Update README.md with proper content
- [x] Add Cloudflare pricing lookup
- [x] Basic CLI: `grove-domain-search check example.com`
- [x] Create secrets.json template

## Phase 2: Durable Object & Persistence - COMPLETE
- [x] Set up Cloudflare Worker with Durable Object
- [x] Implement SQLite schema in DO
- [x] Alarm-based batch chaining
- [x] Basic job lifecycle (create -> running -> complete/needs_followup)
- [x] Wrangler deployment commands file (worker/COMMANDS.txt)
- [ ] Test DO persistence between alarms (requires deployment)

## Phase 3: AI Orchestration - COMPLETE
- [x] Implement driver agent with prompt templates
- [x] Implement Haiku swarm parallel evaluation
- [x] Build main search loop (6 batch limit)
- [x] Results scoring and ranking
- [x] Add provider abstraction for Claude/Kimi/Mock
- [x] Create orchestrator with state management
- [x] CLI: `grove-domain-search search "Business Name" --mock`

## Phase 4: MCP Server
- [ ] Implement MCP tool definitions
- [ ] Add job status tracking via MCP
- [ ] Build results aggregation
- [ ] Test MCP tools with Claude Desktop

## Phase 5: Quiz System - PARTIAL
- [x] Static initial quiz schema (JSON)
- [x] Follow-up quiz generator (AI-based with mock support)
- [ ] SvelteKit quiz components (terminal aesthetic)
- [x] Resend email integration (email.ts templates)
- [x] Email templates (terminal aesthetic)

## Phase 6: Multi-Model & Polish
- [x] Add Kimi K2 provider (stub, ready for API key)
- [ ] Parallel provider execution (both providers simultaneously)
- [ ] GroveEngine integration
- [ ] Production testing
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

## Next Steps (Requires Local Environment)

1. **Deploy Worker**: Run wrangler commands in `worker/COMMANDS.txt`
2. **Add API Keys**: Set ANTHROPIC_API_KEY secret in Cloudflare
3. **Test Real AI**: Remove --mock flag and test with real Claude API
4. **MCP Integration**: Implement MCP server for Claude Desktop integration

---

*Last updated: 2025-11-29*
*73 tests passing*
