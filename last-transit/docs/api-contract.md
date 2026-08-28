# C担当のAPI契約

フロントエンドは、認証情報やVAPID秘密鍵を扱いません。Push購読情報の保存と通知送信はサーバーが担当します。

## `GET /functions/v1/last-departures?stopId={停留所ID}`

Supabase Edge Functionが京都市バスの停留所IDを受け取り、当日の運行日・例外運行を考慮した路線／行先ごとの最終便を返します。`date=YYYY-MM-DD` を指定すると、その日の結果を確認できます。通知設定時に使う `tripId` も含まれます。

```json
{
  "stopId": "1001",
  "serviceDate": "2026-08-28",
  "departures": [
    {
      "tripId": "gtfs-trip-id",
      "routeId": "route-id",
      "routeName": "206",
      "headsign": "京都駅前",
      "departureTime": "24:05"
    }
  ]
}
```

停留所プルダウンは `GET /functions/v1/bus-stops` を使います。どちらもサービスロールキーをEdge Function内にだけ置き、ブラウザには公開しません。

## `POST /api/push-subscriptions`

ブラウザで通知を許可した直後に呼び出します。同じ `endpoint` が届いた場合は、新規作成ではなく既存の購読情報を更新します。

### リクエスト

```json
{
  "endpoint": "https://push.example.com/...",
  "keys": {
    "p256dh": "公開鍵",
    "auth": "認証鍵"
  }
}
```

### 成功レスポンス

```json
{
  "id": "uuid",
  "status": "active"
}
```

## `POST /api/notification-schedules`

A担当が返した最終便情報に対して、通知予定を作成・更新します。通知時刻はサーバーの日本時間で扱い、UTCのISO 8601文字列で保存・送受信します。

### リクエスト

```json
{
  "pushSubscriptionId": "uuid",
  "tripId": "gtfs-trip-id",
  "departureAt": "2026-08-28T14:15:00.000Z",
  "notifyAt": "2026-08-28T13:45:00.000Z"
}
```

## 定期実行

1分ごとに `notification_schedules` の `status = 'pending'` かつ `notify_at <= NOW()` を取得します。Push送信が成功したら `sent` と `sent_at` を更新し、410または404なら対応する購読を無効化します。

開発中は実送信せず、送信対象をログに出すドライランを用意してください。
