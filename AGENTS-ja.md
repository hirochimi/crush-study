# Crush 開発ガイド

## プロジェクト概要

Crushは、[Charm](https://charm.land) によってGoで構築されたターミナルベースのAIコーディングアシスタントです。LLMに接続し、コードの読み書き・実行のためのツールを提供します。Anthropic、OpenAI、Gemini、Bedrock、Copilot、Hyper、MiniMax、Vercelなど複数のプロバイダをサポートし、LSPとの統合でコードインテリジェンスを実現し、MCPサーバーやエージェントスキルの拡張にも対応します。

モジュールパスは `github.com/charmbracelet/crush` です。

## アーキテクチャ

```
main.go                            CLIエントリポイント (cobra via internal/cmd)
internal/
  app/app.go                       トップレベルの配線: DB, config, agents, LSP, MCP, events
  cmd/                             CLIコマンド (root, run, login, models, stats, sessions)
  config/
    config.go                      Config構造体, コンテキストファイルパス, エージェント定義
    load.go                        crush.jsonの読み込みと検証
    provider.go                    プロバイダ設定とモデル解決
  agent/
    agent.go                       SessionAgent: セッションごとにLLM対話を実行
    coordinator.go                 Coordinator: 名付きエージェント ("coder", "task") を管理
    hooked_tool.go                 ツール実行前にPreToolUseフックを実行するデコレータ
    prompts.go                     Goテンプレートシステムプロンプトの読み込み
    templates/                     システムプロンプトテンプレート (coder.md.tpl, task.md.tpl 等)
    tools/                         すべての組み込みツール (bash, edit, view, grep, glob 等)
      mcp/                         MCPクライアント統合
  hooks/                           フックエンジン: フックイベントでユーザシェルコマンドを実行
    hooks.go                       決定タイプ、集計ロジック、イベント定数
    runner.go                      フックの並列実行、タイムアウト、重複削除
    input.go                       Stdinペイロードビルダー、環境変数、stdout解析 (Crush + Claude Code互換)
  session/session.go               SQLiteに裏付けられたセッションCRUD
  message/                         メッセージモデルとコンテンツタイプ
  db/                              sqlc経由のSQLite、マイグレーション付き
    sql/                           生SQLクエリ (sqlcによって消費される)
    migrations/                    スキーママイグレーション
  backend/                         輸送非依存のビジネスロジック
    backend.go                     Backend: ワークスペースを管理し、Appに委譲
    agent.go                       エージェント操作 (init, update, cancel, run)
    events.go                      ワークスペースごとのSSEイベントブロードキャスト
    session.go                     Backend経由のセッションCRUD
    permission.go                  Backend経由の権限操作
    config.go                      Backend経由のconfig set/remove
  server/                          HTTPサーバー (Unix socket/pipe上のREST API)
    server.go                      ルートハンドラ: workspaces, sessions, agents, LSP, permissions
    events.go                      SSEイベントストリームハンドラ
    config.go                      サーバー設定
  client/                          サーバー接続用RPCクライアント
    client.go                      Unix socket/pipeまたはTCPへのHTTPクライアントダイアル
    proto.go                       クライアント側のプロトコルタイプ
  commands/                        カスタムコマンドシステム
    commands.go                    XDG/home/dataディレクトリ、MCPプロンプト、スキルカタログからユーザコマンドをロード
  dashboard/                       ウェブベースのセッションブラウザ
    server.go                      ダッシュボードHTML/JSを提供するHTTPサーバー
  oauth/                           OAuth統合
    copilot/                       Copilot OAuthフロー、トークン保存
    hyper/                         HyperデバイスフローOAuth
  proto/                           サーバー-クライアント共有プロトコルタイプ
    proto.go                       リクエスト/レスポンスタイプ
    session.go                     セッションプロトコル
    agent.go                       エージェントプロトコル
    permission.go                  権限プロトコル
  swagger/                         OpenAPI仕様 (swag注釈)
  herdr/                           Herdrペイン統合
    client.go                      エージェント状態をherdrに報告
  projects/                        マルチプロジェクトワークスペース管理
    projects.go                    プロジェクトの追跡と一覧表示
  diff/                            Diffユーティリティ
    diff.go                        統合/分割diff出力
  diffdetect/                      ファイル差分検出
    detect.go                      ファイルに変更があるかを検出
  format/                          フォーマットヘルパー
    spinner.go                     ターミナルスピナーアニメーション
  csync/                           並列安全コレクション
    maps.go                        バージョン付きSync.Mapスタイルマップ
    slices.go                      並列安全スライス操作
    versionedmap.go                楽観的並列処理用バージョン付きマップ
  lock/                            ロッキングプリミティブ
    lock.go                        ファイルおよびSQLiteロック
  home/                            ホーム/設定ディレクトリヘルパー
    home.go                        XDG設定ディレクトリの解決
  env/                             環境変数ヘルパー
    env.go                         Crush固有のenvパース
  filepathext/                     ファイルパス拡張
    filepath.go                    パス操作ヘルパー
  ansiext/                         ANSIエスケープコード処理
    ansi.go                        Crushのニーズ向けansiパッケージの拡張
  discover/                        ローカルLLM自動発見
    discover.go                    Ollama, LiteLLM, LMStudio, llama.cpp, OMLX発見をオーケストレーション
    ollama.go                      Ollamaエンドポイント発見
    litellm.go                     LiteLLMエンドポイント発見
    lmstudio.go                    LMStudioエンドポイント発見
    llamacpp.go                    llama.cppサーバー発見
    omlx.go                        OMLXエンドポイント発見
    enricher.go                    発見されたモデルにメタデータを追加
  dialog/                          TUIダイアログコンポーネント
    dialog.go                      ベースオーバーレイ/ダイアログ
    permissions.go                 権限リクエストダイアログ
    sessions.go                    セッション選択ダイアログ
    filepicker.go                  ファイルピッカーダイアログ
    api_key_input.go               APIキー入力ダイアログ
    oauth.go                       OAuthフローダイアログ
    reasoning.go                   リーゾニング出力表示
  log/                             ログインフラストラクチャ
    log.go                         構造化ログセットアップ
    http.go                        HTTPリクエスト/レスポンスログミドルウェア
  lsp/                             LSPクライアントマネージャ、自動発見、オンデマンド起動
  ui/                              Bubble Tea v2 TUI (internal/ui/AGENTS.md を参照)
  permission/                      ツールの権限チェックと許可リスト
  skills/                          スキルファイルの発見と読み込み
  shell/                           バックグラウンドジョブ対応のBashコマンド実行
  event/                           テレメトリー (PostHog)
  pubsub/                          コンポーネント間メッセージング用の内部pub/sub
  filetracker/                     セッションごとに触れたファイルを追跡
  history/                         プロンプト履歴
```

### 主要依存関係の役割

- **`charm.land/fantasy`**: LLMプロバイダの抽象化レイヤ。Anthropic、OpenAI、Geminiなどのプロトコル差を処理。`internal/app` および `internal/agent` で使用。
- **`charm.land/bubbletea/v2`**: インタラクティブUIを駆動するTUIフレームワーク。
- **`charm.land/lipgloss/v2`**: ターミナルのスタイリング。
- **`charm.land/glamour/v2`**: ターミナル内でのMarkdownレンダリング。
- **`charm.land/catwalk`**: TUIコンポーネントのスナップショット/ゴールドファイルテスト。
- **`sqlc`**: `internal/db/sql/` のSQLクエリからGoコードを生成。

### 主要なパターン

- **ConfigはService**: グローバル状態ではなく `config.Service` 経由でアクセス。
- **ツールは自己文書化**: 各ツールには `internal/agent/tools/` 内の `.go` 実装と `.md` 説明ファイルがある。
- **システムプロンプトはGoテンプレート**: `internal/agent/templates/*.md.tpl` にランタイムデータを注入。
- **コンテキストファイル**: Crushはプロジェクト固有の指示のために、作業ディレクトリから AGENTS.md、CRUSH.md、CLAUDE.md、GEMINI.md (および `.local` 変種) を読み取る。
- **永続化**: SQLite + sqlc。すべてのクエリは `internal/db/sql/` に、生成コードは `internal/db/` に、マイグレーションは `internal/db/migrations/` に存在する。
- **pub/sub**: エージェント、UI、サービス間の疎結合な通信に `internal/pubsub` を使用。
- **フック**: ツール実行の前に発火する `crush.json` 内のユーザ定義シェルコマンド。エンジン (`internal/hooks/`) は fantasy およびエージェントと独立しており、入力を取り、コマンドを実行し、決定を返す。`internal/agent/hooked_tool.go` の `hookedTool` デコレータはコーディネータレベルでツールを包む。フックは権限チェックの前に実行される。ユーザ向けプロトコルについては `HOOKS.md` を参照。
- **CGO無効**: `CGO_ENABLED=0` および `GOEXPERIMENT=greenteagc` でビルド。
- **サーバー/クライアントモード**: Crushはサーバー（HTTP REST API）として、1つ以上のCLIクライアントと共に実行できる。サーバーはUnix socket（またはWindowsのNamed Pipe）にバインドし、クライアントは `internal/client/` 経由でダイアルする。`Backend`（`internal/backend/`）はサーバーとTUIが共有する輸送非依存のビジネスロジックを提供する。ワークスペースは `csync.Map` で並列安全アクセス可能な解決済みパスでキー付けされる。各ワークスペースは `app.App` インスタンスを保持し、SSEイベントストリームはクライアントごとに管理される。`/v1/` 以下の全ルート一覧は `internal/server/server.go` を参照。
- **カスタムコマンド**: ユーザ定義コマンドは3つのソースから来る: `~/.crush/commands/`（ユーザ）、`$XDG_CONFIG_HOME/crush/commands/`（XDG）、プロジェクトデータディレクトリ。`internal/commands/` 経由でロードされる。また、MCPサーバープロンプトおよびスキルカタログからも登場する。コマンドは引数に `\$VAR` 構文を使用する。
- **VCRカセット**: エージェントテストは、HTTPインタラクションを `internal/agent/testdata/` にYAMLカセットとして記録する（例: `TestCoderAgent/`）。プロバイダのレスポンスが変更されたときに再生成するには `task test:record` を実行する。テストは charm.land/x/vcr を使用する。
- **ローカルLLM発見**: `internal/discover/` はローカルLLMサーバー（Ollama, LiteLLM, LMStudio, llama.cpp, OMLX）を自動検出する。発見は起動時および設定変更時に実行される。

## Build/Test/Lintコマンド

- **Build**: `go build .` または `go run .`
- **Test**: `task test` または `go test ./...`（単一テストの実行:
  `go test ./internal/llm/prompt -run TestGetContextFromPaths`）
- **ゴールドファイルの更新**: `go test ./... -update`（テスト出力の変化時に `.golden` ファイルを再生成）
  - 特定パッケージの更新:
    `go test ./internal/tui/components/core -update`（この場合、"core" を更新している）
- **Lint**: `task lint:fix`
- **フォーマット**: `task fmt` (`gofumpt -w .`)
- **Modernize**: `task modernize`（コードの簡素化を実行する `modernize` を実行）
- **Dev**: `task dev`（プロファイリング有効で実行）
- **Catwalk（ローカルテストUI）**: `task run:catwalk`（`CATWALK_URL` を localhost:8080 に設定し、ローカルCatwalk統合テストを行う）
- **オンボーディングテスト**: `task run:onboarding`（`CRUSH_GLOBAL_DATA` および `CRUSH_GLOBAL_CONFIG` を `tmp/onboarding/data` および `tmp/onboarding/config` に設定）
- **VCRカセットの記録**: `task record` または `task test:record`（`internal/agent/testdata/` 内のエージェントテストカセットを再生成）
- **リリース**: `task release`（svu で semver タグを作成し main をプッシュ）
- **インストール**: `task install`（`go install -v .` with LDFLAGS）
- **スキーマ**: `task schema`（設定タイプから `schema.json` を生成）
- **Hyperプロバイダ**: `task hyper`（Hyper provider.json の `go generate` を実行）
- **Swag仕様**: `task swag`（swag注釈からOpenAPI仕様を生成）
- **プロファイリング**: `task profile:cpu`、`profile:heap`、`profile:allocs`（localhost:6060 経由のpprof）
- **HTMLフォーマット**: `task fmt:html`（stats HTML/CSS/JS への prettier）

## コードスタイルガイドライン

- **インポート**: `goimports` フォーマットを使用。stdlib、外部、内部パッケージをグループ化。
- **フォーマット**: gofumptを使用（gofmtより厳格）。golangci-lintで有効化。
- **ネーミング**: 標準Go規約 — 公開用がPascalCase、非公開用がcamelCase。
- **型**: 明示的な型を優先し、明確さのために型エイリアスを使用（例: `type AgentName string`）。
- **エラーハンドリング**: エラーを明示的に返す。ラップに `fmt.Errorf` を使用。
- **コンテキスト**: 操作には常に最初の引数として `context.Context` を渡す。
- **インターフェース**: 消費側パッケージでインターフェースを定義し、小さく焦点を絞る。
- **構造体**: 構造体の埋め込みで合成し、関連するフィールドをグループ化。
- **定数**: iota付きの型付き定数を使用し、constブロックでグループ化。
- **テスト**: testifyの `require` パッケージを使用。`t.Parallel()` で並列テスト、`t.SetEnv()` で環境変数を設定。一時ディレクトリが必要な場合は常に `t.Tempdir()` を使用。このディレクトリは削除する必要はない。
- **JSONタグ**: JSONフィールド名にsnake_caseを使用。
- **ファイル権限**: ファイル権限に8進数表記（0o755, 0o644）を使用。
- **ログメッセージ**: ログメッセージは大文字で始めること（例: "failed to save session" ではなく "Failed to save session"）。
  - これは `task lint` の一部として実行される `task lint:log` によって強制される。
- **コメント**: 単独の行にあるコメントは大文字で始め、句点で終わる。行末のコメントは例外。

## モックプロバイダでのテスト

プロバイダ設定を含むテストを書く際は、API呼び出しを避けるためにモックプロバイダを使用してください:

```go
func TestYourFunction(t *testing.T) {
    // テスト用にモックプロバイダを有効化
    originalUseMock := config.UseMockProviders
    config.UseMockProviders = true
    defer func() {
        config.UseMockProviders = originalUseMock
        config.ResetProviders()
    }()

    // モックデータが新規になるようにプロバイダをリセット
    config.ResetProviders()

    // ここにテストコード - プロバイダはモックデータを返すようになる
    providers := config.Providers()
    // ... テストロジック
}
```

## フォーマット

- 書くすべてのGoコードはフォーマットすること。
  - まず `gofumpt -w .` を試す。
  - `gofumpt` が利用できない場合は `goimports` を使用。
  - `goimports` も利用できない場合は `gofmt` を使用。
  - また、`gofumpt` が `PATH` にある限り `task fmt` でプロジェクト全体に `gofumpt -w .` を実行することもできる。

## コメント

- 単独の行にあるコメントは大文字で始め、句点で終わる。コメントは78カラムで折り返す。

## コミット

- セマンティックコミット（`fix:`、`feat:`、`chore:`、`refactor:`、`docs:`、`sec:` 等）を常に使用すること。
- attributionsを除き、コミットは1行に収めること。追加のコンテキストが真に必要でない限り、複数行のコミットは使用しない。

## SQLおよびデータベース

- **sqlc**: すべてのSQLクエリは `internal/db/sql/*.sql` に存在する。`sqlc generate` を実行して `internal/db/` 内にGoコードを再生成する。`sqlc.yaml` 設定がスキーマパスと生成オプションを定義する。
- **マイグレーション**: スキーママイグレーションは `internal/db/migrations/` にタイムスタンプ接頭辞付きSQLファイルとして存在する。マイグレーション管理には `goose` が使用される。
- **生成モデル**: `internal/db/models.go` は sqlc によってSQLクエリから生成される（File、Message、ReadFile、Session 構造体）。
- **二重SQLiteバックエンド**: プロジェクトはビルドタグにより `modernc.org/sqlite`（純Go）および `github.com/ncruces/go-sqlite3`（CGO）の両方をサポートする。

## 設定システム

- **設定ストレージ**: `internal/config/store.go` は設定のライフサイクル、`crush.json` からのロード、フックのリロードを管理する。
- **プロバイダ解決**: `internal/config/provider.go` はモデルとAPIキーを解決する。`charm.land/fantasy` 経由で Anthropic、OpenAI、Gemini、Bedrock、Copilot、Hyper、MiniMax、Vercel などに対応する。
- **Docker MCP**: `internal/config/docker_mcp.go` はDockerコンテナ内で実行されるMCPサーバーを扱う。
- **コンテキストファイル**: Crushはプロジェクト固有の指示のために、作業ディレクトリから AGENTS.md、CRUSH.md、CLAUDE.md、GEMINI.md（および `.local` 変種）を読み取る。

## エージェントシステム

- **SessionAgent**: `internal/agent/agent.go` — セッションごとにLLM対話を実行し、ツール実行、ストリーミング、完了を処理する。
- **Coordinator**: `internal/agent/coordinator.go` — 名付きエージェント（"coder"、"task"）を管理し、init/update/cancel操作を処理する。
- **hookedTool**: `internal/agent/hooked_tool.go` — ツール実行前にPreToolUseフックを実行するデコレータ。フックは権限チェックの前に実行される。
- **システムプロンプト**: `internal/agent/templates/` のGoテンプレート（coder.md.tpl、task.md.tpl、initialize.md.tpl 等）にランタイムデータを注入する。
- **組み込みツール**: `internal/agent/tools/` に30以上のツールがある。各ツールには `.go` 実装と `.md` 説明ファイルがある。ツールには以下が含まれる: bash, edit, multiedit, view, write, grep, glob, ls, fetch, download, todos, crush_info, crush_logs, diagnostics, references, sourcegraph, lsp_restart, job_kill, job_output, read_mcp_resource, list_mcp_resources, web_fetch, web_search, rg (ripgrep), safe。
- **ループ検出**: `internal/agent/loop_detection.go` — 無限のツール呼び出しループを防止する。
- **エージェントテストカセット**: `internal/agent/` のテストは、charm.land/x/vcr により記録されたYAMLカセットを `internal/agent/testdata/TestCoderAgent/<model>/` に使用する。再生成には `task test:record` を実行する。

## サーバー/クライアントアーキテクチャ

- **サーバー**: `internal/server/` — Unix socket（Unix）、Named Pipe（Windows）、またはTCP上で動作するHTTP REST API。`/v1/` 以下のルートは workspaces、sessions、エージェント操作、LSP、権限、filetracker、設定管理、エージェントセッションを扱う。
- **Backend**: `internal/backend/` — 輸送非依存のビジネスロジック。`csync.Map` でワークスペースを管理し、`app.App` に委譲する。ワークスペースは解決済みパスで重複排除される。SSEイベントブロードキャストはクライアントごとに管理される。
- **クライアント**: `internal/client/` — Unix socket、Named Pipe、またはTCPでサーバーにダイアルするRPCクライアント。`crush run` のクライアント/サーバーモードで使用される。
- **プロトコルタイプ**: `internal/proto/` — サーバーとクライアントの両方で使用される共有リクエスト/レスポンスタイプ。
- **ダッシュボード**: `internal/dashboard/` — ローカルHTTPサーバーによって提供されるウェブベースのセッションブラウザ。

## カスタムコマンド

- コマンドは3つのソースから来る: `~/.crush/commands/`（ユーザ）、`$XDG_CONFIG_HOME/crush/commands/`（XDG）、プロジェクトデータディレクトリ。MCPサーバープロンプトおよびスキルカタログからも登場する。
- `internal/commands/commands.go` 経由でロードされる。コマンドは引数に `\$VAR` 構文を使用する。
- `CustomCommand` 構造体はユーザ定義のmarkdownコンテンツをラップし、`MCPPrompt` はMCPサーバープロンプトをラップし、スキルカタログからのスキルは `FromSkillCatalog` 経由で変換される。

## TUI（UI）での作業

TUIで作業する際は、必ず作業を開始する前に `internal/ui/AGENTS.md` を読み取る。

## スタイルリングシステム

スタイルリングシステムは `internal/ui/styles/` に存在し、3つのレイヤで構成されています:

- **`quickstyle.go`**: 安定した基本テーマビルダ。`quickStyle(opts)` は `quickStyleOpts`（デザインのトークン — primary、secondary、fgBase、bgBase、success、error 等 — のパレット）から `Styles` 構造体を構築する。`quickStyle` は完全にトークン駆動でなければならない: ここで特定の `charmtone.*` 色をハードコードしてはならない（Chromaの構文ハイライト化はトークン化待ちの例外を除く）。これにより、任意のテーマがCharmtone固有の色を継承せずにベースを再利用できる。
- **`themes.go`**: 具体的なテーマを定義する。各テーマ関数（例: `CharmtonePantera`）はパレット付きで `quickStyle` を呼び出し、必要に応じてテーマ固有のオーバーライドを適用する。
- **`styles.go`**: `Styles` 構造体とそのドキュメント — `quickStyle` が生成する形状を定義する。

**テーマ固有のオーバーライドの追加**: 実際のところ、トークンモデルに適合しない色を本当に必要とするスタイルの場合（例: bangプロンプトは Salt/Hazy/Larpleを使用）、`quickStyle` を最も近いセマンティックトークンに保ち、テーマ関数で異なる色のみをオーバーライドする:

```go
func CharmtonePantera() Styles {
	s := quickStyle(quickStyleOpts{ /* パレット */ })

	// トークンのデフォルトと異なる色のみをオーバーライド。
	s.Editor.PromptBangIconFocused = s.Editor.PromptBangIconFocused.
		Foreground(charmtone.Salt).
		Background(charmtone.Hazy)

	return s
}
```

**新しいテーマの追加**: `themes.go` に `quickStyleOpts` パレット（および必要なオーバーライド）付きで `quickStyle` の結果を返す関数を追加し、`ThemeForProvider` に配線する。

## 注意すべきポイントと非自明なパターン

- **二重SQLiteバックエンド**: プロジェクトはビルドタグにより `modernc.org/sqlite`（純Go）および `github.com/ncruces/go-sqlite3`（CGO）の両方をサポートする。接続ファイルは `connect_modernc.go` および `connect_ncruces.go` である。環境でどちらがコンパイルされているか留意すること。
- **DBパス解決**: SQLiteデータベースパスは `internal/db/connect.go` 経由で解決され、作業ディレクトリではなく設定からのデータディレクトリを使用する。
- **ワークスペースの重複排除**: Backendはワークスペースを解決済みパス（シンリンク評価済み）で重複排除する。同じディレクトリを2つのクライアントが開くと、1つのワークスペースを共有する。
- **フックエンジンは独立**: フックシステム（`internal/hooks/`）はLLMプロバイダの抽象化レイヤおよびエージェントから切り離されている。構造化された入力をstdin経由で取り、ユーザ定義のシェルコマンドを実行し、stdout経由で決定を返す — CrushおよびClaude Codeの両方と互換性がある。
- **ツールは権限チェックの前に実行**: ツール実行パイプラインにおいて、フックは権限の前に実行される。`hookedTool` デコレータはコーディネータレベルで各ツールを包む。
- **コンテキストファイルは段階的**: Crushは複数のコンテキストファイル（AGENTS.md、CRUSH.md、CLAUDE.md、GEMINI.md、および `.local` 変種）を読み取り、結合する。`.local` 変種はワークスペース固有の上書きである。
- **設定の上書き**: `config.Overrides()` は権限リクエストをスキップし、許可ツールを設定できるランタイム上書きを提供する。
- **Run完了信号**: `app.App` 内の `runCompletions` pubsubブローカーは、各エージェントターン終了後に決定論的な `notify.RunComplete` イベントを発信する。SSEサブスクライバ（特にクライアント/サーバーモードでの `crush run`）は、メッセージ完了部分から推測する代わりに、これを使用して終了シグナリングを行う。
- **Herdr統合**: herdr管理ペイン内で実行する場合、`herdr.Client`（`internal/herdr/`）はローカル権限リクエスト、run完了、メッセージをherdrシステムにブリッジする。
- **mcp.Initialize**: MCPクライアント初期化は、アプリ起動時にgoroutineとして実行される（`internal/agent/tools/mcp/init.go`）。設定されたMCPサーバーを自動発見し接続する。
- **ローカルLLM発見**: `internal/discover/` は起動時および設定変更時にローカルLLMサーバー（Ollama、LiteLLM、LMStudio、llama.cpp、OMLX）を自動検出する。
- **ロック順序**: Backendにおいて、`Backend.mu` と `Workspace.clientsMu` の両方が保持される場合、`Backend.mu` を先に取得する必要がある（AB/BAデッドロックを避けるため）。
- **環境変数**: `CRUSH_PROFILE=true` は localhost:6060 でpprofを有効にする。`CRUSH_GLOBAL_DATA` および `CRUSH_GLOBAL_CONFIG` はデフォルトのデータ/設定パスを上書きする（オンボーディングテストで使用）。
- **LSP診断コールバック**: LSPマネージャのコールバックシステム（`app.LSPManager.SetCallback`）は、状態および診断をUIに伝播するために使用される。`app.New` でこのコールバックを設定する。
