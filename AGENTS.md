# Crush Development Guide

## Project Overview

Crush is a terminal-based AI coding assistant built in Go by
[Charm](https://charm.land). It connects to LLMs and gives them tools to read,
write, and execute code. It supports multiple providers (Anthropic, OpenAI,
Gemini, Bedrock, Copilot, Hyper, MiniMax, Vercel, and more), integrates with
LSPs for code intelligence, and supports extensibility via MCP servers and
agent skills.

The module path is `github.com/charmbracelet/crush`.

## Architecture

```
main.go                            CLI entry point (cobra via internal/cmd)
internal/
  app/app.go                       Top-level wiring: DB, config, agents, LSP, MCP, events
  cmd/                             CLI commands (root, run, login, models, stats, sessions)
  config/
    config.go                      Config struct, context file paths, agent definitions
    load.go                        crush.json loading and validation
    provider.go                    Provider configuration and model resolution
  agent/
    agent.go                       SessionAgent: runs LLM conversations per session
    coordinator.go                 Coordinator: manages named agents ("coder", "task")
    hooked_tool.go                 Decorator that runs PreToolUse hooks before tool execution
    prompts.go                     Loads Go-template system prompts
    templates/                     System prompt templates (coder.md.tpl, task.md.tpl, etc.)
    tools/                         All built-in tools (bash, edit, view, grep, glob, etc.)
      mcp/                         MCP client integration
  hooks/                           Hook engine: runs user shell commands on hook events
    hooks.go                       Decision types, aggregation logic, event constants
    runner.go                      Parallel hook execution, timeout, dedup
    input.go                       Stdin payload builder, env vars, stdout parsing (Crush + Claude Code compat)
  session/session.go               Session CRUD backed by SQLite
  message/                         Message model and content types
  db/                              SQLite via sqlc, with migrations
    sql/                           Raw SQL queries (consumed by sqlc)
    migrations/                    Schema migrations
  backend/                         Transport-agnostic business logic
    backend.go                     Backend: manages workspaces, delegates to App
    agent.go                       Agent operations (init, update, cancel, run)
    events.go                      SSE event broadcasting per workspace
    session.go                     Session CRUD via backend
    permission.go                  Permission operations via backend
    config.go                      Config set/remove via backend
  server/                          HTTP server (REST API over Unix socket/pipe)
    server.go                      Route handler: workspaces, sessions, agents, LSP, permissions
    events.go                      SSE event stream handler
    config.go                      Server configuration
  client/                          RPC client to connect to server
    client.go                      HTTP client dialing Unix socket/pipe or TCP
    proto.go                       Client-side protocol types
  commands/                        Custom command system
    commands.go                    Loads user commands from XDG/home/data dirs, MCP prompts, skill catalog
  dashboard/                       Web-based session browser
    server.go                      HTTP server serving dashboard HTML/JS
  oauth/                           OAuth integrations
    copilot/                       Copilot OAuth flow, token storage
    hyper/                         Hyper device-flow OAuth
  proto/                           Shared protocol types for server-client
    proto.go                       Request/response types
    session.go                     Session protocol
    agent.go                       Agent protocol
    permission.go                  Permission protocol
  swagger/                         OpenAPI spec (swag annotations)
  herdr/                           Herdr pane integration
    client.go                      Reports agent state to herdr
  projects/                        Multi-project workspace management
    projects.go                    Tracks and lists projects
  diff/                            Diff utilities
    diff.go                        Unified/split diff output
  diffdetect/                      File diff detection
    detect.go                      Detects if a file has changes
  format/                          Formatting helpers
    spinner.go                     Terminal spinner animation
  csync/                           Concurrent-safe collections
    maps.go                        Sync.Map-style map with versioning
    slices.go                      Concurrent-safe slice operations
    versionedmap.go                Versioned map for optimistic concurrency
  lock/                            Locking primitives
    lock.go                        File and SQLite locking
  home/                            Home/config directory helpers
    home.go                        Resolves XDG config dirs
  env/                             Environment variable helpers
    env.go                         Crush-specific env parsing
  filepathext/                     File path extensions
    filepath.go                    Path manipulation helpers
  ansiext/                         ANSI escape code handling
    ansi.go                        Extends ansi package for Crush needs
  discover/                        Local LLM auto-discovery
    discover.go                    Orchestrates Ollama, LiteLLM, LMStudio, llama.cpp, OMLX discovery
    ollama.go                      Ollama endpoint discovery
    litellm.go                     LiteLLM endpoint discovery
    lmstudio.go                    LMStudio endpoint discovery
    llamacpp.go                    llama.cpp server discovery
    omlx.go                        OMLX endpoint discovery
    enricher.go                    Enriches discovered models with metadata
  dialog/                          TUI dialog components
    dialog.go                      Base overlay/dialog
    permissions.go                 Permission request dialogs
    sessions.go                    Session selection dialogs
    filepicker.go                  File picker dialog
    api_key_input.go               API key input dialog
    oauth.go                       OAuth flow dialogs
    reasoning.go                   Reasoning output display
  log/                             Logging infrastructure
    log.go                         Structured logging setup
    http.go                        HTTP request/response logging middleware
  lsp/                             LSP client manager, auto-discovery, on-demand startup
  ui/                              Bubble Tea v2 TUI (see internal/ui/AGENTS.md)
  permission/                      Tool permission checking and allow-lists
  skills/                          Skill file discovery and loading
  shell/                           Bash command execution with background job support
  event/                           Telemetry (PostHog)
  pubsub/                          Internal pub/sub for cross-component messaging
  filetracker/                     Tracks files touched per session
  history/                         Prompt history
```

### Key Dependency Roles

- **`charm.land/fantasy`**: LLM provider abstraction layer. Handles protocol
  differences between Anthropic, OpenAI, Gemini, etc. Used in `internal/app`
  and `internal/agent`.
- **`charm.land/bubbletea/v2`**: TUI framework powering the interactive UI.
- **`charm.land/lipgloss/v2`**: Terminal styling.
- **`charm.land/glamour/v2`**: Markdown rendering in the terminal.
- **`charm.land/catwalk`**: Snapshot/golden-file testing for TUI components.
- **`sqlc`**: Generates Go code from SQL queries in `internal/db/sql/`.

### Key Patterns

- **Config is a Service**: accessed via `config.Service`, not global state.
- **Tools are self-documenting**: each tool has a `.go` implementation and a
  `.md` description file in `internal/agent/tools/`.
- **System prompts are Go templates**: `internal/agent/templates/*.md.tpl`
  with runtime data injected.
- **Context files**: Crush reads AGENTS.md, CRUSH.md, CLAUDE.md, GEMINI.md
  (and `.local` variants) from the working directory for project-specific
  instructions.
- **Persistence**: SQLite + sqlc. All queries live in `internal/db/sql/`,
  generated code in `internal/db/`. Migrations in `internal/db/migrations/`.
- **Pub/sub**: `internal/pubsub` for decoupled communication between agent,
  UI, and services.
- **Hooks**: User-defined shell commands in `crush.json` that fire before
  tool execution. The engine (`internal/hooks/`) is independent of fantasy
  and agent — it takes inputs, runs commands, returns decisions. The
  `hookedTool` decorator in `internal/agent/hooked_tool.go` wraps tools at
  the coordinator level. Hooks run before permission checks. See
  `HOOKS.md` for the user-facing protocol.
- **CGO disabled**: builds with `CGO_ENABLED=0` and
  `GOEXPERIMENT=greenteagc`.
- **Server/Client mode**: Crush can run as a server (HTTP REST API) with
  one or more CLI clients. The server binds to a Unix socket (or Windows
  named pipe), and the client dials via `internal/client/`. The
  `Backend` (`internal/backend/`) provides transport-agnostic business
  logic shared by the server and TUI. Workspaces are keyed by resolved
  path with `csync.Map` for concurrent-safe access. Each workspace holds
  an `app.App` instance, and SSE event streams are managed per-client.
  See `internal/server/server.go` for the full route list under `/v1/`.
- **Custom commands**: User-defined commands come from three sources:
  `~/.crush/commands/` (user), `$XDG_CONFIG_HOME/crush/commands/` (XDG),
  and project data directory. Loaded via `internal/commands/`. Also
  surfaced from MCP server prompts and the skill catalog. Commands use
  `\$VAR` syntax for arguments.
- **VCR cassettes**: Agent tests record HTTP interactions in
  `internal/agent/testdata/` as YAML cassettes (e.g., `TestCoderAgent/`).
  Run `task test:record` to regenerate them when provider responses
  change. Tests use charm.land/x/vcr.
- **Local LLM discovery**: `internal/discover/` auto-detects local LLM
  servers (Ollama, LiteLLM, LMStudio, llama.cpp, OMLX). Discovery runs
  on startup and refreshes on config change.

## Build/Test/Lint Commands

- **Build**: `go build .` or `go run .`
- **Test**: `task test` or `go test ./...` (run single test:
  `go test ./internal/llm/prompt -run TestGetContextFromPaths`)
- **Update Golden Files**: `go test ./... -update` (regenerates `.golden`
  files when test output changes)
  - Update specific package:
    `go test ./internal/tui/components/core -update` (in this case,
    we're updating "core")
- **Lint**: `task lint:fix`
- **Format**: `task fmt` (`gofumpt -w .`)
- **Modernize**: `task modernize` (runs `modernize` which makes code
  simplifications)
- **Dev**: `task dev` (runs with profiling enabled)
- **Catwalk (local test UI)**: `task run:catwalk` (sets `CATWALK_URL`
  to localhost:8080 for local Catwalk integration testing)
- **Onboarding tests**: `task run:onboarding` (sets `CRUSH_GLOBAL_DATA`
  and `CRUSH_GLOBAL_CONFIG` to `tmp/onboarding/data` and
  `tmp/onboarding/config`)
- **Record VCR cassettes**: `task record` or `task test:record`
  (regenerates agent test cassettes in `internal/agent/testdata/`)
- **Release**: `task release` (creates semver tag via svu, pushes main)
- **Install**: `task install` (`go install -v .` with LDFLAGS)
- **Schema**: `task schema` (generates `schema.json` from config types)
- **Hyper provider**: `task hyper` (runs `go generate` for Hyper provider.json)
- **Swag spec**: `task swag` (generates OpenAPI spec from swag annotations)
- **Profile**: `task profile:cpu`, `profile:heap`, `profile:allocs`
  (pprof via localhost:6060)
- **HTML format**: `task fmt:html` (prettier on stats HTML/CSS/JS)

## Code Style Guidelines

- **Imports**: Use `goimports` formatting, group stdlib, external, internal
  packages.
- **Formatting**: Use gofumpt (stricter than gofmt), enabled in
  golangci-lint.
- **Naming**: Standard Go conventions — PascalCase for exported, camelCase
  for unexported.
- **Types**: Prefer explicit types, use type aliases for clarity (e.g.,
  `type AgentName string`).
- **Error handling**: Return errors explicitly, use `fmt.Errorf` for
  wrapping.
- **Context**: Always pass `context.Context` as first parameter for
  operations.
- **Interfaces**: Define interfaces in consuming packages, keep them small
  and focused.
- **Structs**: Use struct embedding for composition, group related fields.
- **Constants**: Use typed constants with iota for enums, group in const
  blocks.
- **Testing**: Use testify's `require` package, parallel tests with
  `t.Parallel()`, `t.SetEnv()` to set environment variables. Always use
  `t.Tempdir()` when in need of a temporary directory. This directory does
  not need to be removed.
- **JSON tags**: Use snake_case for JSON field names.
- **File permissions**: Use octal notation (0o755, 0o644) for file
  permissions.
- **Log messages**: Log messages must start with a capital letter (e.g.,
  "Failed to save session" not "failed to save session").
  - This is enforced by `task lint:log` which runs as part of `task lint`.
- **Comments**: End comments in periods unless comments are at the end of the
  line.

## Testing with Mock Providers

When writing tests that involve provider configurations, use the mock
providers to avoid API calls:

```go
func TestYourFunction(t *testing.T) {
    // Enable mock providers for testing
    originalUseMock := config.UseMockProviders
    config.UseMockProviders = true
    defer func() {
        config.UseMockProviders = originalUseMock
        config.ResetProviders()
    }()

    // Reset providers to ensure fresh mock data
    config.ResetProviders()

    // Your test code here - providers will now return mock data
    providers := config.Providers()
    // ... test logic
}
```

## Formatting

- ALWAYS format any Go code you write.
  - First, try `gofumpt -w .`.
  - If `gofumpt` is not available, use `goimports`.
  - If `goimports` is not available, use `gofmt`.
  - You can also use `task fmt` to run `gofumpt -w .` on the entire project,
    as long as `gofumpt` is on the `PATH`.

## Comments

- Comments that live on their own lines should start with capital letters and
  end with periods. Wrap comments at 78 columns.

## Committing

- ALWAYS use semantic commits (`fix:`, `feat:`, `chore:`, `refactor:`,
  `docs:`, `sec:`, etc).
- Try to keep commits to one line, not including your attribution. Only use
  multi-line commits when additional context is truly necessary.

## SQL and Database

- **sqlc**: All SQL queries live in `internal/db/sql/*.sql`. Run
  `sqlc generate` to regenerate Go code into `internal/db/`.
  The `sqlc.yaml` config defines the schema path and generation options.
- **Migrations**: Schema migrations live in
  `internal/db/migrations/` with timestamp-prefixed SQL files.
  `goose` is used for migration management.
- **Generated models**: `internal/db/models.go` is generated by sqlc from
  the SQL queries (File, Message, ReadFile, Session structs).
- **Dual SQLite backends**: The project supports both `modernc.org/sqlite`
  (pure Go) and `github.com/ncruces/go-sqlite3` (CGO) via build tags
  (`connect_modernc.go`, `connect_ncruces.go`).

## Config System

- **Config storage**: `internal/config/store.go` manages config lifecycle,
  loading from `crush.json`, and hot-reloading hooks.
- **Provider resolution**: `internal/config/provider.go` resolves models
  and API keys. Supports Anthropic, OpenAI, Gemini, Bedrock, Copilot,
  Hyper, MiniMax, Vercel, and more via `charm.land/fantasy`.
- **Docker MCP**: `internal/config/docker_mcp.go` handles MCP servers
  running in Docker containers.
- **Context files**: Crush reads AGENTS.md, CRUSH.md, CLAUDE.md, GEMINI.md
  (and `.local` variants) from the working directory for project-specific
  instructions.

## Agent System

- **SessionAgent**: `internal/agent/agent.go` — runs LLM conversations
  per session, handles tool execution, streaming, and completion.
- **Coordinator**: `internal/agent/coordinator.go` — manages named agents
  ("coder", "task"), handles init/update/cancel operations.
- **hookedTool**: `internal/agent/hooked_tool.go` — decorator that runs
  PreToolUse hooks before tool execution. Hooks run before permission
  checks.
- **System prompts**: Go templates in `internal/agent/templates/`
  (coder.md.tpl, task.md.tpl, initialize.md.tpl, etc.) with runtime
  data injected.
- **Built-in tools**: 30+ tools in `internal/agent/tools/`. Each tool has
  a `.go` implementation and a `.md` description file. Tools include:
  bash, edit, multiedit, view, write, grep, glob, ls, fetch, download,
  todos, crush_info, crush_logs, diagnostics, references, sourcegraph,
  lsp_restart, job_kill, job_output, read_mcp_resource,
  list_mcp_resources, web_fetch, web_search, rg (ripgrep), safe.
- **Loop detection**: `internal/agent/loop_detection.go` — prevents
  infinite tool call loops.
- **Agent test cassettes**: Tests in `internal/agent/` use YAML cassettes
  in `internal/agent/testdata/TestCoderAgent/<model>/` recorded via
  charm.land/x/vcr. Run `task test:record` to regenerate.

## Server/Client Architecture

- **Server**: `internal/server/` — HTTP REST API served over Unix socket
  (Unix), named pipe (Windows), or TCP. Routes under `/v1/` handle
  workspaces, sessions, agent operations, LSP, permissions, filetracker,
  config management, and agent sessions.
- **Backend**: `internal/backend/` — transport-agnostic business logic.
  Manages workspaces with `csync.Map`, delegates to `app.App`.
  Workspaces are deduplicated by resolved path. SSE event broadcasting
  is managed per-client.
- **Client**: `internal/client/` — RPC client that dials the server via
  Unix socket, named pipe, or TCP. Used by `crush run` in client/server mode.
- **Protocol types**: `internal/proto/` — shared request/response types
  used by both server and client.
- **Dashboard**: `internal/dashboard/` — web-based session browser
  served by a local HTTP server.

## Custom Commands

- Commands come from three sources: `~/.crush/commands/` (user),
  `$XDG_CONFIG_HOME/crush/commands/` (XDG), and project data directory.
  Also surfaced from MCP server prompts and the skill catalog.
- Loaded via `internal/commands/commands.go`. Commands use `\$VAR`
  syntax for arguments.
- `CustomCommand` struct wraps user-defined markdown content,
  `MCPPrompt` wraps MCP server prompts, and skills from the catalog
  are converted via `FromSkillCatalog`.

## Working on the TUI (UI)

Anytime you need to work on the TUI, read `internal/ui/AGENTS.md` before
starting work.

## Styling System

The styling system lives in `internal/ui/styles/` and is organized into
three layers:

- **`quickstyle.go`**: The stable base theme builder. `quickStyle(opts)`
  constructs a `Styles` struct from `quickStyleOpts` — a palette of
  design tokens (primary, secondary, fgBase, bgBase, success, error, etc.).
  `quickStyle` must be fully token-driven: never hardcode specific
  `charmtone.*` colors here (except Chroma syntax highlighting, which is
  pending tokenization). This lets any theme reuse the base without
  inheriting Charmtone-specific colors.
- **`themes.go`**: Defines concrete themes. Each theme function (e.g.
  `CharmtonePantera`) calls `quickStyle` with its palette, then applies
  theme-specific overrides as needed.
- **`styles.go`**: Defines the `Styles` struct and its documentation —
  the shape of what `quickStyle` produces.

**Adding theme-specific overrides**: When a style genuinely needs a
color that doesn't fit the token model (e.g. the bang prompt uses
Salt/Hazy/Larple), keep `quickStyle` on the closest semantic token and
override only the differing colors in the theme function:

```go
func CharmtonePantera() Styles {
	s := quickStyle(quickStyleOpts{ /* palette */ })

	// Override only the colors that differ from the token defaults.
	s.Editor.PromptBangIconFocused = s.Editor.PromptBangIconFocused.
		Foreground(charmtone.Salt).
		Background(charmtone.Hazy)

	return s
}
```

**Adding a new theme**: Add a function in `themes.go` that returns the
result of `quickStyle` with a `quickStyleOpts` palette (plus any needed
overrides), then wire it into `ThemeForProvider`.

## Gotchas and Non-Obvious Patterns

- **Two SQLite backends**: The project uses build tags to support both
  `modernc.org/sqlite` (pure Go) and `github.com/ncruces/go-sqlite3`
  (CGO). The connect files are `connect_modernc.go` and
  `connect_ncruces.go`. Be aware of which one is compiled in your
  environment.
- **DB path resolution**: The SQLite database path is resolved via
  `internal/db/connect.go` and uses a data directory from config,
  not the working directory.
- **Workspace deduplication**: The Backend deduplicates workspaces by
  resolved path (symlink-evaluated). Two clients opening the same
  directory will share one workspace.
- **Hook engine is independent**: The hook system (`internal/hooks/`)
  is decoupled from the LLM provider abstraction and the agent. It
  takes structured inputs via stdin, runs user-defined shell commands,
  and returns decisions via stdout — compatible with both Crush and
  Claude Code protocols.
- **Tools before permission checks**: In the tool execution pipeline,
  hooks run before permissions. The `hookedTool` decorator wraps each
  tool at the coordinator level.
- **Context files are progressive**: Crush reads multiple context files
  (AGENTS.md, CRUSH.md, CLAUDE.md, GEMINI.md, and their `.local` variants)
  and merges them. `.local` variants are workspace-specific overrides.
- **Config overrides**: `config.Overrides()` provides runtime overrides
  that can skip permission requests and set allowed tools.
- **Run completions signal**: `runCompletions` pubsub broker in `app.App`
  emits a deterministic `notify.RunComplete` event after each agent turn.
  SSE subscribers (notably `crush run` in client/server mode) use this
  for exit signaling instead of guessing from message finish parts.
- **Herdr integration**: When running inside a herdr-managed pane, the
  `herdr.Client` (`internal/herdr/`) bridges local permission requests,
  run completions, and messages to the herdr system.
- **mcp.Initialize**: MCP client initialization runs in a goroutine at
  app startup (`internal/agent/tools/mcp/init.go`). It auto-discovers
  and connects to configured MCP servers.
- **Local LLM discovery**: `internal/discover/` auto-detects local LLM
  servers (Ollama, LiteLLM, LMStudio, llama.cpp, OMLX) on startup and
  config change.
- **Locking order**: In Backend, when both `Backend.mu` and
  `Workspace.clientsMu` are held, `Backend.mu` must be acquired first
  to avoid AB/BA deadlock hazards.
- **Environment variable**: `CRUSH_PROFILE=true` enables pprof on
  localhost:6060. `CRUSH_GLOBAL_DATA` and `CRUSH_GLOBAL_CONFIG` override
  default data/config paths (used in onboarding tests).
- **LSP diagnostics callback**: The LSP manager's callback system
  (`app.LSPManager.SetCallback`) is used to propagate state and
  diagnostics to the UI. Set this callback in `app.New`.
