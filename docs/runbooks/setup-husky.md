# Huskyセットアップガイド

## 初回セットアップ

```bash
# 1. 依存関係インストール
pnpm install

# 2. Husky初期化（自動：package.json の prepare スクリプトで実行）
pnpm prepare

# 3. Pre-commitフックに実行権限付与（Linux/Mac）
chmod +x .husky/pre-commit
```

## Windows環境での注意

Windowsでは以下を確認：
- Git Bashまたは WSL を使用
- `.husky/pre-commit` の改行コードがLFであること

## 動作確認

```bash
# テストコミット
git add .
git commit -m "test: pre-commit hook"

# 期待動作:
# ✅ 型チェック実行
# ✅ Lint実行
# ✅ DDL変更時は警告表示
```

## トラブルシューティング

### フックが動作しない
```bash
# フックの再初期化
rm -rf .husky
pnpm prepare
chmod +x .husky/pre-commit
```

### 型チェックをスキップしたい場合
```bash
git commit --no-verify -m "message"
```

**注意**: 緊急時のみ使用。通常は型チェックを通すこと。

