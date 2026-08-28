# 最終便検索 API

GET /api/last-service

## パラメータ

- fromStopId: 出発停留所ID
- toStopId: 到着停留所ID
- dateTime: 検索時刻（JST）

## レスポンス

- departureTime: 出発時刻
- arrivalTime: 到着時刻
- routeName: 路線名
- destination: 行先
- isLastService: 最終便か
