# 結合テスト手順（ローカル）

この手順は、画面・通知API・Supabase・Web Pushが接続できているかを確認するためのものです。実施には通常のChromeまたはEdgeを使います。

## 事前準備

3つのターミナルを起動します。すべて `last-transit` フォルダで実行してください。

```powershell
npm run dev
npm run dev:api
npm run notify:watch
```

画面用ターミナルに表示された `http://localhost:5173` などのURLを開きます。ポート番号は環境により異なります。

## テスト1：最終便取得

1. 画面で「赤の宮 → 大原方面」と「平日」を選びます。
2. 「最終便を確認する」を押します。

次が表示されれば成功です。

- 最終便 `19:36`
- 残り時間（例：`あと2時間15分`）または、過去時刻なら「この最終便は出発済みです。」
- 京都バス公式時刻表へのリンク

同様に、次の2方向も平日で確認します。

| 停留所・方面 | 期待する最終便 |
| --- | --- |
| 朝露ヶ原町 → 出町柳・北大路方面 | 20:18 |
| 飛鳥井町 → 京都駅前方面 | 20:24 |

土曜・休日は時刻未登録のため、「まだ登録されていません」と表示されれば仕様どおりです。

## テスト2：通知の購読保存

1. 「通知を有効にする」を押します。
2. ブラウザの許可ダイアログで「許可」を選びます。
3. 「通知を有効にしました。」と表示されることを確認します。

Supabase SQL Editorで次を実行し、`is_active` が `true` の行があることを確認します。

```sql
SELECT endpoint, is_active, created_at
FROM push_subscriptions
ORDER BY created_at DESC;
```

## テスト3：通知予定の保存

1. テスト1で最終便を取得します。
2. 未来の利用日と通知する分数を入力します。
3. 「この最終便の通知を設定する」を押します。

「30分前の通知を設定しました。」のように表示されれば成功です。Supabaseで次を実行し、`pending` の行を確認します。

```sql
SELECT trip_id, departure_at, notify_at, status
FROM notification_schedules
ORDER BY created_at DESC
LIMIT 10;
```

## テスト4：Push通知の送信

テスト用に `notify_at` が現在時刻より前の `pending` レコードを1件用意したうえで、`notify:watch` を1分ほど待ちます。ブラウザ通知が届き、該当行の `status` が `sent` になれば成功です。

```sql
SELECT trip_id, status, sent_at
FROM notification_schedules
ORDER BY created_at DESC
LIMIT 10;
```

テスト後は不要な通知予定を削除するか、`cancelled` に更新してください。

```sql
UPDATE notification_schedules
SET status = 'cancelled'
WHERE status = 'pending';
```

## 合格条件

テスト1〜4がすべて成功し、ブラウザのコンソールとAPI用ターミナルにエラーがないこと。
