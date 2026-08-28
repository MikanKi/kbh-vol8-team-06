# 最終便検索 API

GET /functions/v1/last-service

## 概要

指定した駅・バス停から、指定時刻以降に出発する路線ごとの最終便を返す。

## パラメータ

- `fromStopId`：出発停留所ID（必須）
- `dateTime`：検索時刻。ISO 8601形式・日本時間（必須）
  - 例：`2026-08-28T21:00:00+09:00`

## レスポンス例

```json
{
  "stop": {
    "id": "KYOTO_STATION",
    "name": "京都駅前"
  },
  "searchedAt": "2026-08-28T21:00:00+09:00",
  "departures": [
    {
      "departureTime": "23:12",
      "routeName": "205系統",
      "destination": "九条車庫前",
      "vehicleType": "bus"
    }
  ]
}
```
