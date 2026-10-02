# crush plugin CLI Interface Design

## Overview

This document designs the `crush plugin` command group for native Agent Plugins support in Crush, enabling installation and management of plugins like the Google Cloud Developer Plugin.

## Command Structure

```
crush plugin <subcommand> [args...] [flags...]

Subcommands:
  install     Install a plugin from marketplace or URL
  uninstall   Remove an installed plugin
  list        List installed plugins
  info        Show plugin details
  search      Search marketplace for plugins
  update      Update installed plugins
  marketplace Manage plugin marketplaces
```

## Subcommand Specifications

### `crush plugin install`

```bash
# Install from Google marketplace (default)
crush plugin install google-cloud-developer

# Install from specific marketplace
crush plugin install google-cloud-developer@google-plugins

# Install from URL (GitHub repo with plugin manifest)
crush plugin install https://github.com/google/skills/plugins/cloud/google-cloud-developer

# Install from local path
crush plugin install ./my-custom-plugin

# Flags
--force              Overwrite existing installation
--dry-run            Show what would be installed without doing it
--scope global|project|user  Installation scope (default: project)
```

**Behavior:**
1. Fetch plugin manifest (`plugin.yaml` or `plugin.json`)
2. Validate against Agent Plugins spec
3. Download/resolve dependencies:
   - Skills → install to skills directory
   - MCP servers → add to MCP config
   - Hooks → register in hooks config
   - Routing rules → add to hooks/routing config
4. Apply configuration to appropriate scope
5. Record installation in plugin registry

### `crush plugin uninstall`

```bash
crush plugin uninstall google-cloud-developer

# Flags
--scope global|project|user
--keep-skills        Don't remove skills (only plugin metadata)
--keep-mcp           Don't remove MCP servers
```

### `crush plugin list`

```bash
crush plugin list

# Output formats
crush plugin list --format table   # Default
crush plugin list --format json
crush plugin list --format yaml

# Filters
crush plugin list --scope project
crush plugin list --source google-plugins
crush plugin list --outdated       # Show plugins with updates available
```

**Output Example:**
```
NAME                      VERSION  SOURCE          SCOPE     STATUS
google-cloud-developer    1.0.0    google-plugins  project   installed
gcp-security-basics       0.5.0    google-plugins  project   installed
my-custom-plugin          1.0.0    local           user      installed
```

### `crush plugin info`

```bash
crush plugin info google-cloud-developer

# Output
Name:        google-cloud-developer
Version:     1.0.0
Source:      google-plugins (https://github.com/google/skills)
Scope:       project
Installed:   2026-01-15 10:30:00
Description: Equips AI coding agents with foundational skills, safety guardrails, and live documentation grounding for building on Google Cloud.

Components:
  Skills (5):
    - google-cloud-recipe-auth
    - google-cloud-recipe-onboarding
    - gcloud
    - finding-google-skills
    - retrieving-developer-knowledge
  MCP Servers (1):
    - developer-knowledge (https://developerknowledge.googleapis.com/mcp)
  Hooks (2):
    - gcloud-guardrail (PreToolUse)
    - gcloud-skill-discovery (PreToolUse)
  Routing Rules (1):
    - google-cloud-discovery

Requirements:
  - DEVELOPERKNOWLEDGE_API_KEY environment variable
  - gcloud CLI installed
  - developerknowledge.googleapis.com API enabled
```

### `crush plugin search`

```bash
crush plugin search "google cloud"
crush plugin search "gke" --source google-plugins
crush plugin search "security" --category security

# Output
NAME                      VERSION  DESCRIPTION
google-cloud-developer    1.0.0    Foundational GCP skills + live docs
gke-basics                1.2.0    GKE Standard cluster management
gke-autopilot             1.1.0    GKE Autopilot serverless Kubernetes
gke-security              1.0.0    Workload Identity, Binary Auth, Network Policies
cloud-run-basics          1.3.0    Cloud Run services, revisions, traffic
```

### `crush plugin update`

```bash
# Update specific plugin
crush plugin update google-cloud-developer

# Update all plugins
crush plugin update --all

# Check for updates without installing
crush plugin update --dry-run

# Update to specific version
crush plugin update google-cloud-developer@1.1.0
```

### `crush plugin marketplace`

```bash
# List configured marketplaces
crush plugin marketplace list

# Add marketplace
crush plugin marketplace add google-plugins https://github.com/google/skills
crush plugin marketplace add my-company https://plugins.mycompany.com

# Remove marketplace
crush plugin marketplace remove google-plugins

# Set default marketplace
crush plugin marketplace set-default google-plugins
```

## Plugin Manifest Format

### `plugin.yaml` (at plugin root)

```yaml
# Agent Plugins 1.0 manifest
name: google-cloud-developer
version: "1.0.0"
description: "Equips AI coding agents with foundational skills, safety guardrails, and live documentation grounding for building on Google Cloud."
author: Google Cloud
license: Apache-2.0
homepage: https://github.com/google/skills/plugins/cloud/google-cloud-developer
repository: https://github.com/google/skills
spec_version: "1.0"

# Keywords for search
keywords:
  - google-cloud
  - gcp
  - ai-coding-agent
  - mcp
  - skills

# Compatibility
compatibility:
  crush: ">=0.1.0"
  agent_plugins: "1.0"

# Components
skills:
  - name: google-cloud-recipe-auth
    path: skills/google-cloud-recipe-auth
    required: true
  - name: google-cloud-recipe-onboarding
    path: skills/google-cloud-recipe-onboarding
    required: true
  - name: gcloud
    path: skills/gcloud
    required: true
  - name: finding-google-skills
    path: skills/finding-google-skills
    required: false
  - name: retrieving-developer-knowledge
    path: skills/retrieving-developer-knowledge
    required: false

mcp_servers:
  - name: developer-knowledge
    type: http
    url: "https://developerknowledge.googleapis.com/mcp"
    headers:
      X-Goog-Api-Key: "${DEVELOPERKNOWLEDGE_API_KEY}"
    required: true
    description: "Live Google Cloud documentation via Developer Knowledge API"

hooks:
  - name: gcloud-guardrail
    event: PreToolUse
    command: "crush-gcloud-validate"
    match_tool: "bash"
    match_pattern: "gcloud *"
    description: "Validates gcloud commands for safety before execution"
  - name: gcloud-skill-discovery
    event: PreToolUse
    command: "crush-gcloud-suggest-skills"
    match_tool: "bash"
    match_pattern: "gcloud *"
    description: "Suggests specialized GCP skills based on gcloud commands"

routing_rules:
  - name: google-cloud-discovery
    type: always-on
    description: "Routes to specialized GCP skills when task requires product-specific knowledge"
    targets:
      - gke-*
      - agent-platform-*
      - google-cloud-waf-*
      - "*-basics"

# Requirements
requirements:
  - name: DEVELOPERKNOWLEDGE_API_KEY
    type: env_var
    description: "API key for Developer Knowledge MCP server"
    required: true
  - name: gcloud
    type: cli
    description: "Google Cloud CLI"
    required: true
    version: ">= 450.0.0"
  - name: developerknowledge.googleapis.com
    type: gcp_api
    description: "Developer Knowledge API"
    required: true

# Configuration schema for user customization
config_schema:
  properties:
    default_project:
      type: string
      description: "Default Google Cloud project ID"
    default_region:
      type: string
      default: "us-central1"
      description: "Default region for regional resources"
    enable_skill_discovery:
      type: boolean
      default: true
      description: "Enable automatic skill suggestions from gcloud commands"
```

## Installation Scopes

| Scope | Path | Use Case |
|-------|------|----------|
| `global` | `/etc/crush/plugins/` | System-wide, all users |
| `user` | `~/.config/crush/plugins/` | User-specific, all projects |
| `project` | `.crush/plugins/` | Project-specific, committed to repo |

**Default:** `project` (enables team sharing via git)

## Plugin Registry

Location: `<scope>/crush/plugins/registry.json`

```json
{
  "plugins": {
    "google-cloud-developer": {
      "version": "1.0.0",
      "source": "google-plugins",
      "installed_at": "2026-01-15T10:30:00Z",
      "manifest_hash": "sha256:abc123...",
      "components": {
        "skills": ["google-cloud-recipe-auth", "gcloud", ...],
        "mcp_servers": ["developer-knowledge"],
        "hooks": ["gcloud-guardrail", "gcloud-skill-discovery"]
      },
      "config": {
        "default_region": "us-central1",
        "enable_skill_discovery": true
      }
    }
  },
  "marketplaces": {
    "google-plugins": {
      "url": "https://github.com/google/skills",
      "added_at": "2026-01-15T10:00:00Z",
      "is_default": true
    }
  }
}
```

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1-2)
- [ ] `internal/plugin/` package with manifest parser
- [ ] Plugin registry (load/save per scope)
- [ ] Marketplace client (GitHub + custom)
- [ ] `crush plugin list/info` commands

### Phase 2: Installation Engine (Week 2-3)
- [ ] Dependency resolution (skills, MCP, hooks)
- [ ] `crush plugin install/uninstall`
- [ ] Scope handling (global/user/project)
- [ ] Dry-run support

### Phase 3: Advanced Features (Week 3-4)
- [ ] `crush plugin update` with version resolution
- [ ] `crush plugin search` across marketplaces
- [ ] Plugin config schema validation
- [ ] `crush plugin marketplace` management

### Phase 4: Integration (Week 4-5)
- [ ] Skills auto-load from plugin
- [ ] MCP servers auto-configure from plugin
- [ ] Hooks auto-register from plugin
- [ ] Routing rules integration

## Configuration Integration

### crushrc Builtin: `plugin`

```bash
# In crushrc:
plugin install google-cloud-developer@google-plugins
plugin marketplace add google-plugins https://github.com/google/skills
```

### Config Store Extensions

```go
// internal/config/config.go additions
type PluginConfig struct {
    Name       string            `json:"name"`
    Version    string            `json:"version"`
    Source     string            `json:"source"`
    Scope      Scope             `json:"scope"`
    InstalledAt time.Time        `json:"installed_at"`
    Config     map[string]any    `json:"config,omitempty"`
}

type Config struct {
    // ... existing fields
    Plugins map[string]PluginConfig `json:"plugins,omitempty"`
    PluginMarketplaces map[string]MarketplaceConfig `json:"plugin_marketplaces,omitempty"`
}
```

## Security Considerations

1. **Manifest Verification**: Verify manifest hash matches registry
2. **Source Trust**: Warn on unofficial marketplaces
3. **Permission Scope**: Plugins declare required permissions (CLI, APIs, env vars)
4. **Sandbox Execution**: Hook commands run in restricted shell
5. **Audit Log**: Log all plugin install/update/uninstall actions

## Error Handling

| Error | Exit Code | Message |
|-------|-----------|---------|
| Plugin not found | 1 | `plugin 'X' not found in marketplace 'Y'` |
| Version conflict | 2 | `plugin 'X' v1.0.0 requires crush >= 0.2.0, have 0.1.0` |
| Dependency missing | 3 | `skill 'Y' required by plugin 'X' not found` |
| Scope denied | 4 | `insufficient permissions for global scope` |
| Network error | 5 | `failed to fetch plugin manifest: timeout` |

## Future Extensions

- **Plugin Development Kit**: `crush plugin init` to scaffold new plugins
- **Private Marketplaces**: Authenticated enterprise plugin registries
- **Policy Engine**: Org-level plugin allow/deny lists
- **Telemetry**: Anonymous usage stats for popular plugins