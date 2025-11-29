# Project Instructions - Agent Workflows

> **Note**: This is the main orchestrator file. For detailed guides, see `AgentUsage/README.md`

---

## Project Purpose

AI-powered asynchronous domain availability checker that reduces domain hunting from weeks to hours. Orchestrates AI agents to generate, check, and evaluate domain name candidates for client consultations. Runs autonomously in the background, producing a curated list of ~25 available, affordable domain options.

## Tech Stack

- **Language**: Python 3.11+
- **Framework**: Cloudflare Workers with Durable Objects
- **Key Libraries**: Anthropic (Claude), OpenAI-compatible API (Kimi K2), httpx, pytest
- **Package Manager**: UV
- **Architecture**: MCP server with async orchestration layer

## Architecture Notes

**Key architectural decisions:**
- Durable Objects (free tier) with Alarm API for chained execution - no paid Queues needed
- SQLite-backed persistence in each DO instance
- MCP server pattern for tool exposure
- Parallel AI agents: Driver (Sonnet/K2) generates candidates, Haiku swarm evaluates
- RDAP-based availability checking (no API keys required)
- Terminal/CLI aesthetic inspired by Charm's gum/bubbletea

---

## Essential Instructions (Always Follow)

### Core Behavior
- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary for achieving your goal
- ALWAYS prefer editing existing files to creating new ones
- NEVER proactively create documentation files (*.md) or README files unless explicitly requested

### Naming Conventions
- **Directories**: Use CamelCase (e.g., `VideoProcessor`, `AudioTools`, `DataAnalysis`)
- **Date-based paths**: Use skewer-case with YYYY-MM-DD (e.g., `logs-2025-01-15`, `backup-2025-12-31`)
- **No spaces or underscores** in directory names (except date-based paths)

### TODO Management
- **Always check `TODOS.md` first** when starting a task or session
- **Update immediately** when tasks are completed, added, or changed
- Keep the list current and manageable

### Git Workflow Essentials

**After completing major changes, you MUST commit your work.**

**Conventional Commits Format:**
```bash
<type>: <brief description>

<optional body>

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: [Model Name] <agent@localhost>
```

**Common Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`

**Examples:**
```bash
feat: Add user authentication
fix: Correct timezone bug
docs: Update README
```

**For complete details:** See `AgentUsage/git_guide.md`

---

## When to Read Specific Guides

**Read the full guide in `AgentUsage/` when you encounter these situations:**

### Secrets & API Keys
- **When managing API keys or secrets** → Read `AgentUsage/secrets_management.md`
- **Before implementing secrets loading** → Read `AgentUsage/secrets_management.md`
- **When integrating external APIs** → Read `AgentUsage/api_usage.md`

### Cloudflare Development
- **When deploying to Cloudflare** → Read `AgentUsage/cloudflare_guide.md`
- **Before using Cloudflare Workers, KV, R2, or D1** → Read `AgentUsage/cloudflare_guide.md`
- **When setting up Cloudflare MCP server** → Read `AgentUsage/cloudflare_guide.md`

### Package Management
- **When using UV package manager** → Read `AgentUsage/uv_usage.md`
- **Before creating pyproject.toml** → Read `AgentUsage/uv_usage.md`
- **When managing Python dependencies** → Read `AgentUsage/uv_usage.md`

### Version Control
- **Before making a git commit** → Read `AgentUsage/git_guide.md`
- **When initializing a new repo** → Read `AgentUsage/git_guide.md`
- **For git workflow and branching** → Read `AgentUsage/git_guide.md`
- **For conventional commits reference** → Read `AgentUsage/git_guide.md`

### Database Management
- **When working with databases** → Read `AgentUsage/db_usage.md`
- **Before implementing data persistence** → Read `AgentUsage/db_usage.md`
- **For database.py template** → Read `AgentUsage/db_usage.md`

### Search & Research
- **When searching across 20+ files** → Read `AgentUsage/house_agents.md`
- **When finding patterns in codebase** → Read `AgentUsage/house_agents.md`
- **When locating TODOs/FIXMEs** → Read `AgentUsage/house_agents.md`

### Testing
- **Before writing Python tests** → Read `AgentUsage/testing_python.md`
- **Before writing JavaScript/TypeScript tests** → Read `AgentUsage/testing_javascript.md`
- **Before writing Go tests** → Read `AgentUsage/testing_go.md`
- **Before writing Rust tests** → Read `AgentUsage/testing_rust.md`


### Code Quality
- **When refactoring code** → Read `AgentUsage/code_style_guide.md`
- **Before major code changes** → Read `AgentUsage/code_style_guide.md`
- **For style guidelines** → Read `AgentUsage/code_style_guide.md`

### Project Setup
- **When starting a new project** → Read `AgentUsage/project_setup.md`
- **For directory structure** → Read `AgentUsage/project_setup.md`
- **Setting up CI/CD** → Read `AgentUsage/project_setup.md`

---

## Quick Reference

### Security Basics
- Store API keys in `secrets.json` (NEVER commit)
- Add `secrets.json` to `.gitignore` immediately
- Provide `secrets_template.json` for setup
- Use environment variables as fallbacks


### House Agents Quick Trigger
**When searching across 20+ files**, use house-research for:
- Finding patterns across codebase
- Searching TODO/FIXME comments
- Locating API endpoints or functions
- Documentation searches

---

## Code Style Guidelines

### Function & Variable Naming
- Use meaningful, descriptive names
- Keep functions small and focused on single responsibilities
- Add docstrings to functions and classes

### Error Handling
- Use try/except blocks gracefully
- Provide helpful error messages
- Never let errors fail silently

### File Organization
- Group related functionality into modules
- Use consistent import ordering:
  1. Standard library
  2. Third-party packages
  3. Local imports
- Keep configuration separate from logic

---

## Communication Style
- Be concise but thorough
- Explain reasoning for significant decisions
- Ask for clarification when requirements are ambiguous
- Proactively suggest improvements when appropriate

---

## Complete Guide Index
For all detailed guides, workflows, and examples, see:
**`AgentUsage/README.md`** - Master index of all documentation

---

*Last updated: 2025-11-28*
*Model: Claude Sonnet 4.5*
