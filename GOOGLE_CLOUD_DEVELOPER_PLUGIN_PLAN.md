# Google Cloud Developer Plugin for AI Coding Agents — Introduction Plan for Crush

## Overview

The **Google Cloud Developer Plugin** is an official Google plugin built on the [Agent Plugins specification](https://agent-plugins.org/) that equips AI coding agents with foundational Google Cloud skills, safety guardrails, and live documentation grounding. It bundles curated Agent Skills, routing rules, and the **Developer Knowledge MCP server** into a single portable package.

---

## What the Plugin Provides

### Bundled Skills
| Skill | Purpose |
|-------|---------|
| **gcloud** | Safety-critical validation, best practices, and execution guardrails for `gcloud` CLI commands |
| **google-cloud-recipe-auth** | Authentication workflows, credential selection, service identity best practices |
| **google-cloud-recipe-onboarding** | First-project onboarding, account setup, billing configuration |
| **finding-google-skills** | Discovery and on-demand installation of specialized skills from the Google Agent Skills repo |
| **retrieving-developer-knowledge** | Grounded retrieval of official Google documentation |

### MCP Server
- **Developer Knowledge MCP server** (`https://developerknowledge.googleapis.com/mcp`) — Provides AI agents with up-to-date grounding in official Google developer documentation over streamable HTTP.

### Routing Rules
- **google-cloud-discovery.md** — Always-on routing map guiding agents to discover and suggest deeper product-specific skills (`gke-*`, `agent-platform-*`, `google-cloud-waf-*`, `<product>-basics`) when tasks require specialized domain knowledge.

---

## Current Supported Agents
- **Antigravity CLI** (`agy`)
- **Claude Code** (`claude`)
- **Codex CLI** (`codex`)

## Crush Integration Plan

### Phase 1: Feasibility Assessment
1. **Check Agent Plugins spec compatibility** — Crush uses internal agent architecture (`internal/agent/`), need to evaluate if Agent Plugins spec can be adopted or adapted
2. **Evaluate MCP client support** — Crush has MCP client integration at `internal/agent/tools/mcp/`; verify streamable HTTP transport support
3. **Review skill system** — Crush has built-in skills system (`internal/skills/`); determine if external Agent Skills can be loaded

### Phase 2: Implementation Options

#### Option A: Native Plugin Support (Recommended)
- Implement Agent Plugins spec parser in Crush
- Add `crush plugin` command group (install, list, remove, marketplace)
- Integrate with existing skill/MCP infrastructure

#### Option B: Manual Configuration via crushrc
- Document manual skill/MCP configuration equivalent to plugin
- Provide `crushrc` snippet users can copy-paste
- Leverage existing `hook`, `mcp`, `skill` builtins

#### Option C: Custom Command Wrapper
- Create a custom command `google-cloud-setup` that configures everything
- Installable via Crush's custom command system (`~/.crush/commands/`)

### Phase 3: Implementation Steps (Option A)

1. **Add plugin infrastructure**
   - `internal/plugin/` — Plugin spec parser, installer, marketplace client
   - `internal/cmd/plugin.go` — CLI commands
   - Update `crushrc` builtins with `plugin` command

2. **Integrate with existing systems**
   - Skills: Load Agent Skills from plugin into `internal/skills/` registry
   - MCP: Auto-configure Developer Knowledge MCP server in `internal/agent/tools/mcp/`
   - Hooks: Add routing rules as PreToolUse hooks via `internal/hooks/`

3. **Add authentication flow**
   - Support `DEVELOPERKNOWLEDGE_API_KEY` env var
   - Optional: OAuth flow for `developerknowledge.googleapis.com`

4. **Testing & Documentation**
   - Add integration tests
   - Document in AGENTS.md / CRUSH.md context files

### Phase 4: crushrc Configuration Equivalent (Immediate Value)

While native plugin support is being built, users can manually configure equivalent functionality:

```bash
# In crushrc
# 1. Enable MCP server for Developer Knowledge
mcp developer-knowledge \
  --url "https://developerknowledge.googleapis.com/mcp" \
  --header "X-Goog-Api-Key=${DEVELOPERKNOWLEDGE_API_KEY}"

# 2. Load Google Cloud skills (when skill catalog supports remote skills)
skill load google-cloud-recipe-auth
skill load google-cloud-recipe-onboarding
skill load gcloud
skill load finding-google-skills
skill load retrieving-developer-knowledge

# 3. Add hook for gcloud command validation
hook PreToolUse gcloud-guardrail \
  --command "gcloud-validate" \
  --match-tool "bash" \
  --match-pattern "gcloud *"

# 4. Set environment
options set env.DEVELOPERKNOWLEDGE_API_KEY "<YOUR_API_KEY>"
```

### Phase 5: Prerequisites for Users
1. **Google Cloud Project** with billing enabled
2. **Enable API**: `gcloud services enable developerknowledge.googleapis.com --project=<PROJECT_ID>`
3. **Create API Key**: Follow [Developer Knowledge quickstart](https://developers.google.com/knowledge/quickstart#create-secure-key)
4. **Set env var**: `export DEVELOPERKNOWLEDGE_API_KEY=<YOUR_KEY>`

---

## Benefits for Crush Users

1. **Zero-config Google Cloud expertise** — Agents instantly know GCP best practices
2. **Live documentation** — MCP server provides up-to-date official docs (not stale training data)
3. **Safety guardrails** — `gcloud` skill prevents dangerous commands (accidental deletions, key leaks)
4. **Progressive disclosure** — Routing rules auto-suggest specialized skills (GKE, Cloud Run, etc.) when needed
5. **Authentication handled** — Proper service identity patterns vs user credentials

---

## Dependencies & References

- **Agent Plugins Spec**: https://agent-plugins.org/
- **Google Skills Repo**: https://github.com/google/skills
- **Plugin Source**: https://github.com/google/skills/plugins/cloud/google-cloud-developer
- **Developer Knowledge API**: https://developers.google.com/knowledge/
- **Developer Knowledge MCP**: https://developers.google.com/knowledge/mcp
- **Announcement Blog**: https://cloud.google.com/blog/topics/developers-practitioners/introducing-the-google-cloud-developer-plugin-for-ai-coding-agents

---

## Next Steps

1. [ ] Review Agent Plugins spec compatibility with Crush architecture
2. [ ] Prototype MCP streamable HTTP transport in Crush
3. [ ] Design `crush plugin` CLI interface
4. [ ] Create crushrc configuration template for immediate use
5. [ ] Document in Crush's AGENTS.md for project-level adoption