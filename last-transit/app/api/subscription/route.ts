import { NextRequest, NextResponse } from "next/server";

// 許可するドメイン（Origin）のリスト
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3000/",
  "https://xn--u9jxfk1kgb3fzesesccf5551poxrb/",
  "https://xn--u9jxfk1kgb3fzesesccf5551poxrb",
];

// CORSヘッダーを動的に生成する関数
function getCorsHeaders(request: NextRequest) {
  const origin = request.headers.get("origin") || "";

  // 送信元がリストに含まれているかチェック
  const isAllowed = allowedOrigins.includes(origin);
  const allowOriginHeader = isAllowed ? origin : allowedOrigins[0];

  return {
    "Access-Control-Allow-Origin": allowOriginHeader,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

// 1. Preflight（事前確認）リクエストへの対応
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204, // 204 No Content を返す
    headers: getCorsHeaders(request),
  });
}

// 2. 実際のPOSTリクエストへの対応
export async function POST(request: NextRequest) {
  // CORSチェック用のヘッダー取得
  const corsHeaders = getCorsHeaders(request);

  try {
    const body = await request.json();
    // TODO: ここで Push Subscription の保存処理などを行う

    return NextResponse.json(
      { message: "Subscription saved successfully" },
      {
        status: 200,
        headers: corsHeaders,
      },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process subscription" },
      {
        status: 500,
        headers: corsHeaders,
      },
    );
  }
}
