# grove-domain-search TODOs

## Phase 1: Extraction & Core (Current)
- [x] Extract domain_checker.py to standalone package
- [x] Set up pyproject.toml for UV
- [x] Create config.py with all configurable settings
- [x] Move SPEC.md to docs/
- [x] Fill in AGENT.md placeholders
- [x] Update README.md with proper content
- [ ] Add Cloudflare pricing lookup
- [ ] Basic CLI: `grove-domain-search check example.com`
- [ ] Create secrets.json template

## Phase 2: Durable Object & Persistence
- [ ] Set up Cloudflare Worker with Durable Object
- [ ] Implement SQLite schema in DO
- [ ] Alarm-based batch chaining
- [ ] Basic job lifecycle (create → running → complete/needs_followup)
- [ ] Test DO persistence between alarms

## Phase 3: AI Orchestration
- [ ] Implement driver agent with prompt templates
- [ ] Implement Haiku swarm parallel evaluation
- [ ] Build main search loop (6 batch limit)
- [ ] Results scoring and ranking
- [ ] Add provider abstraction for Claude/Kimi

## Phase 4: MCP Server
- [ ] Implement MCP tool definitions
- [ ] Add job status tracking
- [ ] Build results aggregation
- [ ] Test MCP tools with Claude Desktop

## Phase 5: Quiz System
- [ ] Static initial quiz schema (JSON)
- [ ] Follow-up quiz generator (AI-based)
- [ ] SvelteKit quiz components (terminal aesthetic)
- [ ] Resend email integration
- [ ] Email templates (terminal aesthetic)

## Phase 6: Multi-Model & Polish
- [ ] Add Kimi K2 provider
- [ ] Parallel provider execution
- [ ] GroveEngine integration
- [ ] Production testing
- [ ] Documentation updates

## Documentation
- [ ] API documentation
- [ ] Deployment guide
- [ ] Usage examples
- [ ] Architecture diagrams

## Testing
- [ ] Unit tests for checker.py
- [ ] Unit tests for config.py
- [ ] Integration tests for orchestrator
- [ ] End-to-end tests

---

*Generated from docs/SPEC.md development phases*
*Last updated: 2025-11-29*
