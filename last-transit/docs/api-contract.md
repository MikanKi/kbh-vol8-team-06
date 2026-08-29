# C担当のAPI契約

フロントエンドは、認証情報やVAPID秘密鍵を扱いません。Push購読情報の保存と通知送信はサーバーが担当します。

## `GET /api/push-config`

PWAはこのAPIからVAPID公開鍵を取得できます。秘密鍵は絶対にレスポンスへ含めません。

### 成功レスポンス

```json
{
  "vapidPublicKey": "Base64URL形式の公開鍵"
}
```

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

### 失敗レスポンス

```json
{
  "error": "通知の購読情報が不完全です。"
}
```

`400` はリクエスト不備、`500` は保存失敗です。

## `DELETE /api/push-subscriptions`

ブラウザ側で `PushSubscription.unsubscribe()` を実行した後、同じendpointを使ってサーバー上の購読も無効化します。

### リクエスト

```json
{
  "endpoint": "https://push.example.com/..."
}
```

### 成功レスポンス

```json
{
  "status": "inactive"
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

## `GET /api/manual-last-departures`

ODPTのGTFS-JPデータを取り込むまでの暫定APIです。3つの京都バス方向に限り、公式時刻表を手入力した最終便を返します。`dayType` は画面側で選択して渡します。国民の祝日を自動判定しないため、休日は `holiday` を明示します。

```text
GET /api/manual-last-departures?stopId=6001_2&dayType=weekday
```

### 成功レスポンス

```json
{
  "stopId": "6001_2",
  "stopName": "赤の宮",
  "directionLabel": "大原方面",
  "dayType": "weekday",
  "lastDepartureTime": "19:36:00",
  "routeLabel": "特17 大原行",
  "sourceUrl": "https://www.kyotobus.jp/route/timetable/schedule.html?stop_id=6001_2",
  "sourceCheckedAt": "2026-08-28"
}
```

最終便が未登録の場合は `404` を返します。画面側では「この運行日の時刻は確認中です」と表示してください。

## 定期実行

1分ごとに `notification_schedules` の `status = 'pending'` かつ `notify_at <= NOW()` を取得します。Push送信が成功したら `sent` と `sent_at` を更新し、410または404なら対応する購読を無効化します。

開発中は実送信せず、送信対象をログに出すドライランを用意してください。
