# 終電・終バス通知

京都府内の利用者が、手入力した出発地・目的地に対して最終便までの残り時間を確認し、通知を受け取るWebアプリです。

## 開発環境

- Node.js 20以上（npm同梱版）
- npm

初回だけ以下を実行します。

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

`http://localhost:5173` を開きます。PR前には必ず `npm run build` を実行してください。

## CI（GitHub Actions）

リポジトリ直下の `.github/workflows/ci.yml` に、GitHub Actionsの自動チェックを用意しています。`main` へのpushとPull Requestで、Node.js 20による `npm ci` と `npm run build` を実行します。GitHubへリポジトリをpushすれば、Actionsタブから実行結果を確認できます。

## Vercel（Hobby）へのデプロイ

Vercelでは、画面（Vite）と次のAPIを同じプロジェクトにデプロイできます。

- `GET /api/manual-last-departures`
- `POST /api/push-subscriptions`
- `POST /api/notification-schedules`

Vercelの「Add New > Project」でGitHubリポジトリをImportし、**Root Directory** に `last-transit` を指定してください。`vercel.json` により、`npm run build` と `dist` が自動で使用されます。

Environment Variablesには次を設定します。値はローカルの `.env.local` と `.env.server` を参照し、値そのものをGitへ保存しません。

```text
DATABASE_URL
VAPID_SUBJECT
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VITE_VAPID_PUBLIC_KEY
APP_ORIGIN
CRON_SECRET
```

`APP_ORIGIN` には公開後のVercel URL（例：`https://your-project.vercel.app`）を設定します。`DATABASE_URL` はSupabaseのSession pooler接続文字列を使います。パスワードに `@` などが含まれる場合はURLエンコードしてください。

HobbyプランのCronは1日1回までで実行時刻の精度も保証されないため、最終便直前のPush通知には使えません。そのためHobbyでは通知予定の保存までを公開し、実送信はローカルの `npm run notify:watch` または将来の外部スケジューラで行います。Vercel Proへ移行したときは、`/api/cron/send-due-notifications` を1分ごとに呼び出すCronを追加します。

## 結合テスト

画面、通知API、Supabase、Web Pushをつないだローカル結合テストは [docs/integration-test.md](docs/integration-test.md) に従って実行します。

## C担当：通知基盤の利用方法

`src/lib/push-notifications.ts` の `subscribeToPushNotifications()` を、画面側の「通知を有効にする」ボタンから呼び出します。戻り値の購読情報は、バックエンドの `POST /api/push-subscriptions` に送信して保存します。

本番では次を設定します。

- `VITE_VAPID_PUBLIC_KEY`: Web Pushの公開鍵
- サーバー側のみ: VAPID秘密鍵、購読情報を保管するDB接続情報

秘密鍵は `VITE_` を付けた環境変数に絶対に置かないでください。`VITE_` の変数はブラウザに配信されます。

## Supabaseと通知APIの設定

1. Supabaseで新しいプロジェクトを作成し、SQL Editorで `db/schema.sql` を実行します。
2. SupabaseのConnect画面で取得したPostgreSQL接続文字列を使い、`.env.server.example` をコピーして `.env.server` を作成します。
3. 次のコマンドでVAPID鍵を生成し、公開鍵は `.env.local` と `.env.server` に、秘密鍵は `.env.server` にだけ設定します。

```powershell
npx web-push generate-vapid-keys --json
```

4. ターミナルを2つ開き、片方で画面、もう片方でAPIを起動します。

```powershell
npm run dev
npm run dev:api
```

通知の送信処理は `npm run notify:due` で1回だけ実行されます。本番では、このコマンドを1分ごとに実行するスケジューラへ設定します。

開発中に1分ごと自動確認を続ける場合は、3つ目のターミナルで次を実行します。停止するときは `Ctrl + C` を押します。

```powershell
npm run notify:watch
```

## 京都バスGTFS-JPの定期更新

ODPT開発者サイトで発行したconsumer keyを `.env.server` の `ODPT_CONSUMER_KEY` に設定します。すでに通知用テーブルを作成済みの場合は、SupabaseのSQL Editorで `db/002_gtfs_schema.sql` を実行してGTFS用テーブルを追加してください。

```powershell
npm install
npm run gtfs:import:kyoto-bus
```

正常終了すると、`gtfs_stops`、`gtfs_routes`、`gtfs_trips`、`gtfs_stop_times`、`gtfs_calendar`、`gtfs_calendar_dates` に京都バスの最新GTFS-JPが取り込まれます。定期更新では、このコマンドを毎日1回スケジューラで実行します。

## ODPT承認前：公式時刻表の手入力版

Supabase SQL Editorで `db/003_manual_kyoto_bus.sql` を実行すると、次の3方向を登録します。

- 赤の宮 → 大原方面（stopId: `6001_2`）
- 朝露ヶ原町 → 出町柳・北大路方面（stopId: `472_1`）
- 飛鳥井町 → 京都駅前方面（stopId: `906_1`）

平日の最終便は登録済みです。土曜・休日は、未確認の時刻で通知しないよう未登録にしています。公式時刻表で確認後、SQLファイル末尾の `UPDATE` の形式で追加してください。

画面担当は、次のAPIを使って最終便を取得できます。`dayType` は `weekday`、`saturday`、`holiday` のいずれかです。

```text
GET http://localhost:8787/api/manual-last-departures?stopId=6001_2&dayType=weekday
```

## 担当間の接続点

- A担当は、最終便・通知時刻を返すAPIを実装する
- B担当は、通知を有効化するUIから購読関数を呼び出す
- C担当は、購読情報保存API、最終便前にPushを送る定期実行、運用環境を接続する

サービスワーカーはプッシュ通知を受けて表示するだけで、指定時刻に自力で確実な通知を予約できません。通知時刻の判定と送信はサーバー側の定期実行で行います。

サーバー実装時のテーブル定義は `db/schema.sql`、A・B担当と共有するリクエスト形式は `docs/api-contract.md` を参照してください。

`NotificationSetup` は購読情報を受け渡せるようにしてあります。B担当が保存APIをつないだ後は、次のように利用します。

```tsx
<NotificationSetup onSubscribed={(subscription) => postPushSubscription(subscription)} />
```
