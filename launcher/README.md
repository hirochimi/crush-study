# Crush Launcher for Windows

このフォルダには、WindowsでCrushを簡単に起動するためのランチャーが含まれています。

## ファイル構成

| ファイル | 説明 |
|---------|------|
| `crush-launcher.ps1` | メインのPowerShellランチャー（フォルダ選択ダイアログ付き） |
| `crush-launcher.bat` | バッチファイルラッパー（ダブルクリックで実行可能） |
| `create-shortcut.vbs` | デスクトップ/スタートメニューへのショートカット作成スクリプト |

## 使い方

### 方法1: バッチファイルを直接実行
`crush-launcher.bat` をダブルクリックすると、フォルダ選択ダイアログが表示され、選択したフォルダで `crush.exe` が起動します。

### 方法2: ショートカットを作成して使う
1. `create-shortcut.vbs` をダブルクリック実行
2. ショートカットの作成場所を選択（デスクトップ / スタートメニュー / カスタム）
3. 作成されたショートカットから起動

### 方法3: PowerShellから直接実行
```powershell
powershell -ExecutionPolicy Bypass -File "C:\opt\l-llm\crush-study\launcher\crush-launcher.ps1"
```

## 事前準備

`crush.exe` が存在する必要があります。未ビルドの場合：

```bash
cd C:\opt\l-llm\crush-study
go build -o crush.exe .
```

または `task install` でインストール済みの場合は自動で見つかります。

## 動作フロー

1. フォルダ選択ダイアログが表示される
2. ユーザーがフォルダを選択（キャンセルで終了）
3. 選択フォルダをカレントディレクトリに設定
4. `C:\opt\l-llm\crush-study\crush.exe` を起動

## カスタマイズ

`crush-launcher.ps1` の `$CrushExePath` 変数を編集することで、異なる場所の `crush.exe` を指定できます。

```powershell
$CrushExePath = "C:\path\to\your\crush.exe"
```