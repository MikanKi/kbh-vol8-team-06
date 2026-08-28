// 最終便 API と同じデータ提供元にそろえる。
const source = 'kyoto-bus'
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'GET') return new Response(JSON.stringify({ error: 'GET を使用してください。' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return new Response(JSON.stringify({ error: 'Supabaseのサーバー設定が不足しています。' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  const query = new URLSearchParams({ source: `eq.${source}`, select: 'stop_id,stop_name', order: 'stop_name.asc' })
  const stops: Array<{ stop_id: string; stop_name: string }> = []
  for (let start = 0; start < 10_000; start += 1000) {
    const response = await fetch(`${url}/rest/v1/bus_stops?${query}`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${start}-${start + 999}` } })
    if (!response.ok) return new Response(JSON.stringify({ error: '停留所の取得に失敗しました。' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const page = await response.json() as Array<{ stop_id: string; stop_name: string }>
    stops.push(...page)
    if (page.length < 1000) break
  }
  return new Response(JSON.stringify({ stops }), { headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } })
})
