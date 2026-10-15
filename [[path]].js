export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (request.method !== 'POST') {
    return json({ success: false, error: 'Método no permitido.' }, 405);
  }
  if (!env.APPS_SCRIPT_URL || !env.API_SECRET) {
    return json({ success: false, error: 'Faltan variables APPS_SCRIPT_URL o API_SECRET en Cloudflare.' }, 500);
  }
  try {
    const payload = await request.json();
    payload.apiSecret = env.API_SECRET;
    const upstream = await fetch(env.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    const text = await upstream.text();
    let data;
    try { data = JSON.parse(text); }
    catch { return json({ success: false, error: 'Apps Script no devolvió JSON. Verifica el despliegue y la URL del backend.', detail: text.slice(0, 500) }, 502); }
    return json(data, upstream.ok ? 200 : upstream.status);
  } catch (err) {
    return json({ success: false, error: err?.message || 'Error al conectar con el backend.' }, 502);
  }
}
function corsHeaders() {
  return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders() } });
}
