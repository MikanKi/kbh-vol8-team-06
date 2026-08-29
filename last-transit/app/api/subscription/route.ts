import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Supabaseクライアントの初期化
// ※環境変数（NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEYなど）が設定されている必要があります
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    // 1. フロントエンドから送られてきた Subscription (購読情報) を取得
    const body = await request.json();
    const { subscription, userId } = body; // ユーザーID等も一緒に送る場合

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: "無効な Subscription データです。" },
        { status: 400 },
      );
    }

    console.log("受け取ったSubscription:", subscription);

    // 2. Supabase のデータベース (例: push_subscriptions テーブル) に保存
    // ※テーブル名や列名はご自身のSupabaseの構成に合わせて変更してください
    const { data, error } = await supabase
      .from("push_subscriptions") // 保存先のテーブル名
      .upsert(
        {
          user_id: userId || null,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" }, // 同じ端末からの重複登録を防ぐ
      );

    if (error) {
      console.error("Supabase保存エラー:", error);
      return NextResponse.json(
        { error: "データベースへの保存に失敗しました。" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { message: "通知の購読情報が正常に保存されました！" },
      { status: 200 },
    );
  } catch (error) {
    console.error("APIエラー:", error);
    return NextResponse.json(
      { error: "サーバー内部エラーが発生しました。" },
      { status: 500 },
    );
  }
}
