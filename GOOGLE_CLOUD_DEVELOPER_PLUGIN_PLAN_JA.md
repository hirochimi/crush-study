# Google Cloud Developer Plugin for AI Coding Agents — Crush 導入計画書（日本語版）

## 概要

**Google Cloud Developer Plugin** は、[Agent Plugins 仕様](https://agent-plugins.org/)に基づいて構築された Google 公式プラグインです。AI コーディングエージェントに対して、Google Cloud の基礎スキル、安全ガードレール、ライブ ドキュメント グラウンディングを単一のポータブル パッケージとして提供します。

厳選された Agent Skills、ルーティング ルール、**Developer Knowledge MCP サーバー**をバンドルしています。

---

## プラグインが提供するもの

### バンドルされるスキル
| スキル | 目的 |
|--------|------|
| **gcloud** | `gcloud` CLI コマンドの安全性検証、ベストプラクティス、実行ガードレール |
| **google-cloud-recipe-auth** | 認証ワークフロー、認証情報選択、サービス ID ベストプラクティス |
| **google-cloud-recipe-onboarding** | 初回プロジェクト オンボーディング、アカウント設定、請求設定 |
| **finding-google-skills** | Google Agent Skills リポジトリから専門スキルを発見・オンデマンド インストール |
| **retrieving-developer-knowledge** | 公式 Google ドキュメントのグラウンディング取得 |

### MCP サーバー
- **Developer Knowledge MCP サーバー** (`https://developerknowledge.googleapis.com/mcp`) — ストリーマブル HTTP 経由で公式 Google 開発者ドキュメントへの最新アクセスを AI エージェントに提供

### ルーティング ルール
- **google-cloud-discovery.md** — 常時有効なルーティング マップ。タスクに基礎バンドル以上の専門知識が必要な場合、より深い製品固有スキル（`gke-*`、`agent-platform-*`、`google-cloud-waf-*`、`<product>-basics` など）の発見と提案をエージェントにガイド

---

## 現在サポートされているエージェント
- **Antigravity CLI** (`agy`)
- **Claude Code** (`claude`)
- **Codex CLI** (`codex`)

## Crush への統合計画

### フェーズ 1: 実現可能性の評価
1. **Agent Plugins 仕様の互換性確認** — Crush は独自のエージェント アーキテクチャ (`internal/agent/`) を使用しているため、Agent Plugins 仕様を採用または適応できるか評価が必要
2. **MCP クライアント サポートの評価** — Crush には `internal/agent/tools/mcp/` に MCP クライアント統合がある。ストリーマブル HTTP トランスポートのサポートを確認
3. **スキル システムの見直し** — Crush には組み込みスキル システム (`internal/skills/`) がある。外部 Agent Skills を読み込めるか判断

### フェーズ 2: 実装オプション

#### オプション A: ネイティブ プラグイン サポート（推奨）
- Crush に Agent Plugins 仕様パーサーを実装
- `crush plugin` コマンドグループ追加（install, list, remove, marketplace）
- 既存のスキル/MCP インフラストラクチャと統合

#### オプション B: crushrc による手動設定（即時利用可能）
- プラグインと同等のスキル/MCP 設定を手動で文書化
- ユーザーがコピペできる `crushrc` スニペットを提供
- 既存の `hook`、`mcp`、`skill` ビルトインを活用

#### オプション C: カスタムコマンド ラッパー
- すべてを設定する `google-cloud-setup` カスタムコマンドを作成
- Crush のカスタムコマンドシステム (`~/.crush/commands/`) 経由でインストール可能

### フェーズ 3: 実装手順（オプション A の場合）

1. **プラグイン インフラストラクチャの追加**
   - `internal/plugin/` — プラグイン仕様パーサー、インストーラー、マーケットプレイス クライアント
   - `internal/cmd/plugin.go` — CLI コマンド
   - `crushrc` ビルトインに `plugin` コマンドを追加

2. **既存システムとの統合**
   - スキル: プラグインから Agent Skills を `internal/skills/` レジストリに読み込み
   - MCP: Developer Knowledge MCP サーバーを `internal/agent/tools/mcp/` で自動設定
   - フック: ルーティング ルールを `internal/hooks/` 経由で PreToolUse フックとして追加

3. **認証フローの追加**
   - `DEVELOPERKNOWLEDGE_API_KEY` 環境変数サポート
   - オプション: `developerknowledge.googleapis.com` 向け OAuth フロー

4. **テストとドキュメント**
   - 統合テスト追加
   - AGENTS.md / CRUSH.md コンテキスト ファイルに文書化

### フェーズ 4: crushrc 設定相当（即座に価値提供）

ネイティブ プラグイン サポート実装中でも、ユーザーは同等の機能を手動で設定可能：

```bash
# crushrc に記述

# 1. Developer Knowledge MCP サーバーを有効化
mcp developer-knowledge \
  --url "https://developerknowledge.googleapis.com/mcp" \
  --header "X-Goog-Api-Key=${DEVELOPERKNOWLEDGE_API_KEY}"

# 2. Google Cloud スキルを読み込み（スキルカタログがリモートスキル対応時）
skill load google-cloud-recipe-auth
skill load google-cloud-recipe-onboarding
skill load gcloud
skill load finding-google-skills
skill load retrieving-developer-knowledge

# 3. gcloud コマンド検証用フック追加
hook PreToolUse gcloud-guardrail \
  --command "gcloud-validate" \
  --match-tool "bash" \
  --match-pattern "gcloud *"

# 4. 環境変数設定
options set env.DEVELOPERKNOWLEDGE_API_KEY "<YOUR_API_KEY>"
```

### フェーズ 5: ユーザー側の前提条件
1. **請求有効な Google Cloud プロジェクト**
2. **API 有効化**: `gcloud services enable developerknowledge.googleapis.com --project=<PROJECT_ID>`
3. **API キー作成**: [Developer Knowledge クイックスタート](https://developers.google.com/knowledge/quickstart#create-secure-key) に従う
4. **環境変数設定**: `export DEVELOPERKNOWLEDGE_API_KEY=<YOUR_KEY>`

---

## Crush ユーザーへのメリット

1. **ゼロコンフィグで Google Cloud 専門知識** — エージェントが即座に GCP ベストプラクティスを理解
2. **ライブ ドキュメント** — MCP サーバーが最新の公式ドキュメントを提供（古いトレーニングデータではない）
3. **安全ガードレール** — `gcloud` スキルが危険コマンドを防止（誤削除、キー漏洩など）
4. **段階的開示** — ルーティング ルールが必要時に専門スキル（GKE、Cloud Run 等）を自動提案
5. **認証の適切な処理** — ユーザー認証情報ではなくサービス ID パターンを使用

---

## 依存関係と参照

- **Agent Plugins 仕様**: https://agent-plugins.org/
- **Google Skills リポジトリ**: https://github.com/google/skills
- **プラグイン ソース**: https://github.com/google/skills/plugins/cloud/google-cloud-developer
- **Developer Knowledge API**: https://developers.google.com/knowledge/
- **Developer Knowledge MCP**: https://developers.google.com/knowledge/mcp
- **発表ブログ**: https://cloud.google.com/blog/topics/developers-practitioners/introducing-the-google-cloud-developer-plugin-for-ai-coding-agents

---

## 次のステップ

- [ ] Agent Plugins 仕様と Crush アーキテクチャの互換性をレビュー
- [ ] Crush で MCP ストリーマブル HTTP トランスポートのプロトタイプ作成
- [ ] `crush plugin` CLI インターフェース設計
- [ ] 即時利用可能な crushrc 設定テンプレート作成
- [ ] プロジェクトレベル採用のために Crush の AGENTS.md に文書化