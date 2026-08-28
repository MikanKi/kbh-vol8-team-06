<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md

このファイルは、AI コーディングエージェントに読ませる「プロジェクトの前提」です。

## このプロジェクト

- 何を作るか：<終バスと終電を通知するWebアプリ>
- 誰が使うか：<京都府にいる人>
- 方針：3日間で作る。まず動くことを最優先。きれいさより、締め切りまでに完成させること。

## 技術構成

<!-- 実際のバージョンは package.json を見て書き換えること -->

- React 19 + TypeScript
- Vite（開発サーバとビルド）
- Tailwind CSS v4
- パッケージマネージャは **npm**（pnpm / yarn は使わない）
- Node.js は v20 以上

## コマンド

- `npm install` … 依存をインストールする
- `npm run dev` … 開発サーバを起動（http://localhost:5173）
- `npm run build` … 壊れていないかの確認。PR を出す前に必ず通す

## ディレクトリ

- `src/app/page.tsx` … 画面のルート
- `src/app/layout.tsx` … レイアウト。1ファイル1コンポーネント
- `src/globals.css` … 全体のスタイル。Tailwind をここで読み込んでいる
- `public/` … 画像などそのまま配信されるファイル
- `node_modules/` `dist/` … 生成物。**触らない・コミットしない**

## コードの書き方

- **既存のコードの書き方に合わせる**。勝手にフォーマットを変えない
- コンポーネントは関数コンポーネント + TypeScript（`.tsx`）
- 見た目は Tailwind のクラスで書く。CSS ファイルを新しく作らない
- アイコンは `lucide-react` を使う。**絵文字は使わない**（画面・コメント・コミットメッセージすべて）
- 変数名・関数名は英語、UI に出る文字は日本語

## やってほしくないこと

- **新しいライブラリを勝手に増やさない**。必要なら理由を添えて提案してから
- 頼んでいないファイルを書き換えない。触ったファイルは最後に列挙する
- 既存の機能を消さない。消す必要があるなら先に確認する
- エラーを握りつぶさない（空の `catch`、`// @ts-ignore` の乱用）

## Git

- `main` に直接コミットしない。`feat/◯◯` のようなブランチを切る
- コミットメッセージは日本語でよい。接頭辞だけ英語（`feat:` `fix:` `chore:`）
- 1つのコミットに無関係な変更を混ぜない

## 返答の仕方

- 説明は**日本語**で。専門用語には短い言い換えを添える
- コードを出すときは、**どのファイルの何行目あたりか**を明示する
- 自信がないところは「ここは確認してほしい」と書く。それらしく断言しない
