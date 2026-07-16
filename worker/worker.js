// 計画帳アプリ用の通知送信ワーカー。
// GitHub Pages（静的サイト）では定期処理や購読情報の保存ができないため、
// このWorkerが「毎日決まった時刻に Web Push を送る」役割を担う。
//
// 必要な設定（Cloudflareダッシュボードで行う）:
// - KV Namespace を作成し、変数名 NOTIFY_KV としてバインドする
// - Secret「VAPID_PRIVATE_JWK」に、ローカルで生成した秘密鍵JWK（JSON文字列）を設定する
// - Secret「VAPID_PUBLIC_KEY」に、対応する公開鍵（base64url文字列）を設定する
// - Secret「VAPID_SUBJECT」に、連絡先として使うメールアドレス（例: mailto:you@example.com）を設定する
// - Secret「GOOGLE_OAUTH_CLIENT_SECRET」に、Google Cloud ConsoleのOAuthクライアントシークレットを設定する
// - 変数「GOOGLE_OAUTH_CLIENT_ID」に、フロントエンドと同じGoogle OAuthクライアントIDを設定する
// - Cron Trigger を追加する（例: 毎分 "* * * * *"）
//
// このファイルはCloudflareの「Quick Edit」にそのまま貼り付けて使うことを想定しており、
// npmパッケージへの依存はない（Web Crypto APIのみで完結する）。

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token'
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (url.pathname === '/subscribe' && request.method === 'POST') {
      return handleSubscribe(request, env);
    }

    if (url.pathname === '/toc' && request.method === 'GET') {
      return handleToc(request, env);
    }

    if (url.pathname === '/book' && request.method === 'GET') {
      return handleBook(request, env);
    }

    if (url.pathname === '/google/code' && request.method === 'POST') {
      return handleGoogleCode(request, env);
    }

    if (url.pathname === '/google/token' && request.method === 'POST') {
      return handleGoogleToken(request, env);
    }

    if (url.pathname === '/techo/stat' && request.method === 'POST') {
      return handleTechoStat(request, env);
    }

    if (url.pathname === '/techo/stats' && request.method === 'GET') {
      return handleTechoStats(request, env);
    }

    // 手ざわり計画表 ⇄ 手ざわり手帳 の連携（即時同期。codeごとのDurable Objectへ転送）
    if (url.pathname.indexOf('/link/') === 0) {
      return handleLink(request, env, url);
    }

    return new Response('not found', { status: 404, headers: CORS_HEADERS });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(checkAndSend(env));
  }
};

async function handleSubscribe(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: 'invalid json' }, 400);
  }
  if (!body || !body.subscriberId || !body.subscription || typeof body.hour !== 'number' || typeof body.minute !== 'number') {
    return jsonResponse({ error: 'invalid body' }, 400);
  }
  // subscriberIdはサインイン中ならFirebaseのuid、未サインインなら端末ごとのランダムID。
  // どちらにせよ購読者ごとにKVキーを分けるため、複数ユーザー/複数端末で購読が上書きされない。
  var kvKey = 'sub:' + body.subscriberId;
  var existingRaw = await env.NOTIFY_KV.get(kvKey);
  var existingLastSentDate = null;
  if (existingRaw) {
    try { existingLastSentDate = JSON.parse(existingRaw).lastSentDate || null; } catch (e) {}
  }
  await env.NOTIFY_KV.put(kvKey, JSON.stringify({
    subscription: body.subscription,
    hour: body.hour,
    minute: body.minute,
    lastSentDate: existingLastSentDate
  }));
  return jsonResponse({ ok: true });
}

function getGoogleOAuthClientId(env, fallbackClientId) {
  return env.GOOGLE_OAUTH_CLIENT_ID || env.GOOGLE_CLIENT_ID || fallbackClientId || '';
}

function validateGoogleSessionInput(body) {
  return body &&
    /^[A-Za-z0-9_-]{16,128}$/.test(body.sessionId || '') &&
    /^[A-Za-z0-9_-]{32,256}$/.test(body.sessionSecret || '');
}

function googleCalendarKey(sessionId) {
  return 'googlecal:' + sessionId;
}

async function sha256Base64Url(value) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return arrayBufferToBase64Url(hash);
}

function arrayBufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function readGoogleCalendarSession(env, sessionId, sessionSecret) {
  const raw = await env.NOTIFY_KV.get(googleCalendarKey(sessionId));
  if (!raw) return null;
  let stored;
  try {
    stored = JSON.parse(raw);
  } catch (e) {
    return null;
  }
  const secretHash = await sha256Base64Url(sessionSecret);
  if (!stored.secretHash || stored.secretHash !== secretHash) return null;
  return stored;
}

function googleOAuthNotConfigured(env) {
  return !env.GOOGLE_OAUTH_CLIENT_SECRET;
}

async function exchangeGoogleToken(params) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params)
  });
  const data = await res.json().catch(function () { return {}; });
  if (!res.ok) {
    const detail = data.error_description || data.error || ('Google token endpoint status ' + res.status);
    throw new Error(detail);
  }
  return data;
}

async function handleGoogleCode(request, env) {
  if (googleOAuthNotConfigured(env)) {
    return jsonResponse({ error: 'google_oauth_not_configured' }, 503);
  }
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: 'invalid json' }, 400);
  }
  if (!validateGoogleSessionInput(body) || !body.code || !body.redirectUri) {
    return jsonResponse({ error: 'invalid body' }, 400);
  }

  const origin = request.headers.get('Origin') || '';
  if (origin && body.redirectUri !== origin) {
    return jsonResponse({ error: 'invalid redirect origin' }, 400);
  }

  const clientId = getGoogleOAuthClientId(env, body.clientId);
  if (!clientId) {
    return jsonResponse({ error: 'google_oauth_client_id_not_configured' }, 503);
  }

  let tokenData;
  try {
    tokenData = await exchangeGoogleToken({
      code: body.code,
      client_id: clientId,
      client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
      redirect_uri: body.redirectUri,
      grant_type: 'authorization_code'
    });
  } catch (e) {
    return jsonResponse({ error: 'google_code_exchange_failed', detail: e.message }, 400);
  }

  const existing = await readGoogleCalendarSession(env, body.sessionId, body.sessionSecret);
  const now = Date.now();
  const expiresIn = Number(tokenData.expires_in || 3600);
  const stored = {
    secretHash: await sha256Base64Url(body.sessionSecret),
    refreshToken: tokenData.refresh_token || (existing && existing.refreshToken) || null,
    accessToken: tokenData.access_token || null,
    expiresAt: now + Math.max(60, expiresIn - 60) * 1000,
    scope: tokenData.scope || null,
    updatedAt: new Date(now).toISOString()
  };
  await env.NOTIFY_KV.put(googleCalendarKey(body.sessionId), JSON.stringify(stored));

  return jsonResponse({
    access_token: tokenData.access_token,
    expires_in: expiresIn,
    has_refresh_token: !!stored.refreshToken
  });
}

async function handleGoogleToken(request, env) {
  if (googleOAuthNotConfigured(env)) {
    return jsonResponse({ error: 'google_oauth_not_configured' }, 503);
  }
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: 'invalid json' }, 400);
  }
  if (!validateGoogleSessionInput(body)) {
    return jsonResponse({ error: 'invalid body' }, 400);
  }

  const stored = await readGoogleCalendarSession(env, body.sessionId, body.sessionSecret);
  if (!stored) {
    return jsonResponse({ error: 'reauthorization_required' }, 401);
  }

  const now = Date.now();
  if (stored.accessToken && stored.expiresAt && now < stored.expiresAt) {
    return jsonResponse({
      access_token: stored.accessToken,
      expires_in: Math.max(60, Math.floor((stored.expiresAt - now) / 1000)),
      has_refresh_token: !!stored.refreshToken
    });
  }

  if (!stored.refreshToken) {
    return jsonResponse({ error: 'reauthorization_required' }, 401);
  }

  const clientId = getGoogleOAuthClientId(env);
  if (!clientId) {
    return jsonResponse({ error: 'google_oauth_client_id_not_configured' }, 503);
  }

  let tokenData;
  try {
    tokenData = await exchangeGoogleToken({
      refresh_token: stored.refreshToken,
      client_id: clientId,
      client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
      grant_type: 'refresh_token'
    });
  } catch (e) {
    return jsonResponse({ error: 'reauthorization_required', detail: e.message }, 401);
  }

  const expiresIn = Number(tokenData.expires_in || 3600);
  stored.accessToken = tokenData.access_token;
  stored.expiresAt = now + Math.max(60, expiresIn - 60) * 1000;
  stored.scope = tokenData.scope || stored.scope || null;
  stored.updatedAt = new Date(now).toISOString();
  if (tokenData.refresh_token) stored.refreshToken = tokenData.refresh_token;
  await env.NOTIFY_KV.put(googleCalendarKey(body.sessionId), JSON.stringify(stored));

  return jsonResponse({
    access_token: tokenData.access_token,
    expires_in: expiresIn,
    has_refresh_token: !!stored.refreshToken
  });
}

function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: Object.assign({ 'Content-Type': 'application/json' }, CORS_HEADERS)
  });
}

// ---- 手ざわり計画表 ⇄ 手ざわり手帳 の即時連携 ----
// 別々のiOSアプリ（ホーム画面PWA）はlocalStorageを共有できないため、共有コードごとに
// 勉強計画を中継する。保存するのは 日付・教材名・やること・○ だけ（個人情報は持たない）。
// KVはエッジで最大60秒キャッシュされ「即時」に向かないため、codeごとのDurable Object
// （強整合ストレージ＋WebSocketブロードキャスト）で同期する。
const LINK_CODE_RE = /^[A-Za-z0-9_-]{8,40}$/;
const LINK_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function sanitizeFeed(feed) {
  if (!feed || typeof feed !== 'object' || !Array.isArray(feed.items)) return null;
  const items = [];
  for (const it of feed.items.slice(0, 80)) {
    if (!it || typeof it.id !== 'string' || !it.id || it.id.length > 40) continue;
    items.push({
      id: it.id,
      subject: typeof it.subject === 'string' ? it.subject.slice(0, 60) : '',
      text: typeof it.text === 'string' ? it.text.slice(0, 200) : '',
      done: !!it.done,
      u: (typeof it.u === 'number' && isFinite(it.u)) ? it.u : Date.now()
    });
  }
  return { v: 1, updated: new Date().toISOString(), items: items };
}

// 1アイテム単位の last-write-wins（u=最終更新ms）。存在集合は計画表(plan)が持ち主。
function mergeFeed(existing, incoming, role) {
  const now = Date.now();
  const exItems = (existing && Array.isArray(existing.items)) ? existing.items : [];
  const exById = {}; exItems.forEach(function (it) { exById[it.id] = it; });
  const inById = {}; incoming.items.forEach(function (it) { inById[it.id] = it; });
  let items;
  if (role === 'techo') {
    // 手帳は既存アイテムの中身（text/done/subject）だけ更新。追加・削除はしない
    items = exItems.map(function (old) {
      const inc = inById[old.id];
      if (inc && (inc.u || 0) > (old.u || 0)) return { id: old.id, subject: inc.subject || old.subject, text: inc.text, done: inc.done, u: inc.u || now };
      return old;
    });
  } else {
    // 計画表がアイテムの集合の持ち主。中身は u が新しい方を採用（手帳の編集も残す）
    items = incoming.items.map(function (it) {
      const old = exById[it.id];
      if (old && (old.u || 0) > (it.u || 0)) return old;   // 手帳の編集の方が新しい
      return { id: it.id, subject: it.subject, text: it.text, done: it.done, u: it.u || now };
    });
  }
  return { v: 1, updated: new Date().toISOString(), items: items };
}

// Workerは code から Durable Object を引いて、そのまま転送する（WSのUpgradeも本文もそのまま）
async function handleLink(request, env, url) {
  const code = url.searchParams.get('code') || '';
  if (!LINK_CODE_RE.test(code)) return jsonResponse({ error: 'bad code' }, 400);
  const id = env.LINK_DO.idFromName(code);
  return env.LINK_DO.get(id).fetch(request);
}

// codeごとの部屋。強整合ストレージに日付ごとのフィードを持ち、接続中の全端末へ即ブロードキャスト
export class LinkRoom {
  constructor(state, env) {
    this.state = state;
    this.sessions = new Set();
  }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/link/ws') {
      if ((request.headers.get('Upgrade') || '').toLowerCase() !== 'websocket') {
        return new Response('expected websocket', { status: 426 });
      }
      const pair = new WebSocketPair();
      const client = pair[0], server = pair[1];
      await this.accept(server);
      return new Response(null, { status: 101, webSocket: client });
    }

    if (path === '/link/push' && request.method === 'POST') {
      let body;
      try { body = await request.json(); } catch (e) { return this.json({ error: 'invalid json' }, 400); }
      if (!body || !LINK_DATE_RE.test(body.date || '') || (body.role !== 'plan' && body.role !== 'techo')) {
        return this.json({ error: 'bad request' }, 400);
      }
      const incoming = sanitizeFeed(body.feed);
      if (!incoming) return this.json({ error: 'bad feed' }, 400);
      const merged = await this.applyPush(body.date, body.role, incoming);
      return this.json({ ok: true, feed: merged });
    }

    if (path === '/link/pull' && request.method === 'GET') {
      const date = url.searchParams.get('date') || '';
      if (!LINK_DATE_RE.test(date)) return this.json({ error: 'bad request' }, 400);
      return this.json({ feed: (await this.state.storage.get('feed:' + date)) || null });
    }

    if (path === '/link/pullmany' && request.method === 'POST') {
      let body;
      try { body = await request.json(); } catch (e) { return this.json({ error: 'invalid json' }, 400); }
      const dates = (body && Array.isArray(body.dates)) ? body.dates.slice(0, 60) : null;
      if (!dates) return this.json({ error: 'bad request' }, 400);
      const feeds = {};
      for (const date of dates) {
        if (!LINK_DATE_RE.test(date)) continue;
        const f = await this.state.storage.get('feed:' + date);
        if (f) feeds[date] = f;
      }
      return this.json({ feeds: feeds });
    }

    return new Response('not found', { status: 404, headers: CORS_HEADERS });
  }

  async accept(ws) {
    ws.accept();
    this.sessions.add(ws);
    // 接続時に現在の全フィードを渡す（開いた瞬間に同期される）
    const feeds = {};
    const map = await this.state.storage.list({ prefix: 'feed:' });
    for (const [k, v] of map) feeds[k.slice('feed:'.length)] = v;
    try { ws.send(JSON.stringify({ type: 'snapshot', feeds: feeds })); } catch (e) {}
    ws.addEventListener('close', () => this.sessions.delete(ws));
    ws.addEventListener('error', () => this.sessions.delete(ws));
  }

  async applyPush(date, role, incoming) {
    const existing = await this.state.storage.get('feed:' + date);
    const merged = mergeFeed(existing, incoming, role);
    if (merged.items.length) await this.state.storage.put('feed:' + date, merged);
    else await this.state.storage.delete('feed:' + date);
    const result = merged.items.length ? merged : { v: 1, items: [] };
    this.broadcast(JSON.stringify({ type: 'update', date: date, feed: result }));
    return result;
  }

  broadcast(str) {
    for (const ws of this.sessions) {
      try { ws.send(str); } catch (e) { this.sessions.delete(ws); }
    }
  }

  json(obj, status) {
    return new Response(JSON.stringify(obj), {
      status: status || 200,
      headers: Object.assign({ 'Content-Type': 'application/json' }, CORS_HEADERS)
    });
  }
}

// ---- 手ざわり手帳の匿名利用統計 ----
// 受け取るのは「数」と紙/字のIDだけ。書いた内容・予定・個人情報は受け取らない。
// 匿名IDごとに1日1ドキュメント（上書き）なのでカウンタ競合も起きない。400日で自動消滅
async function handleTechoStat(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: 'invalid json' }, 400);
  }
  if (!body || typeof body.id !== 'string' || !/^[A-Za-z0-9_-]{8,40}$/.test(body.id) ||
      typeof body.d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.d) ||
      typeof body.m !== 'object' || body.m === null) {
    return jsonResponse({ error: 'bad request' }, 400);
  }
  // 数値カウンタだけを通す（文字列などが混ざっていたら捨てる）
  const metrics = {};
  for (const k of Object.keys(body.m).slice(0, 20)) {
    const v = body.m[k];
    if (/^[a-z]{1,16}$/.test(k) && typeof v === 'number' && v >= 0 && v < 100000) {
      metrics[k] = Math.round(v);
    }
  }
  const sel = typeof body.v === 'string' && /^[a-z]{0,16}\/[a-z]{0,16}\/[01]$/.test(body.v) ? body.v : '';
  await env.NOTIFY_KV.put(
    'techostat:' + body.d + ':' + body.id,
    JSON.stringify({ m: metrics, v: sel }),
    { expirationTtl: 60 * 60 * 24 * 400 }
  );
  return jsonResponse({ ok: true });
}

// 集計の照会（管理トークン必須。開発者だけが見られる）
async function handleTechoStats(request, env) {
  if (!env.TECHO_ADMIN_TOKEN || request.headers.get('X-Admin-Token') !== env.TECHO_ADMIN_TOKEN) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }
  const url = new URL(request.url);
  const date = url.searchParams.get('date') || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return jsonResponse({ error: 'bad date' }, 400);
  const agg = { date: date, users: 0, metrics: {}, papers: {}, fonts: {}, gcal: 0 };
  let cursor;
  do {
    const list = await env.NOTIFY_KV.list({ prefix: 'techostat:' + date + ':', cursor });
    for (const key of list.keys) {
      const doc = await env.NOTIFY_KV.get(key.name, 'json');
      if (!doc) continue;
      agg.users++;
      for (const k of Object.keys(doc.m || {})) {
        agg.metrics[k] = (agg.metrics[k] || 0) + doc.m[k];
      }
      if (doc.v) {
        const parts = doc.v.split('/');
        if (parts[0]) agg.papers[parts[0]] = (agg.papers[parts[0]] || 0) + 1;
        if (parts[1]) agg.fonts[parts[1]] = (agg.fonts[parts[1]] || 0) + 1;
        if (parts[2] === '1') agg.gcal++;
      }
    }
    cursor = list.list_complete ? null : list.cursor;
  } while (cursor);
  return jsonResponse(agg);
}

// ---- 目次取得（hanmoto.comのスクレイピング） ----
//
// openBD/Google Booksは目次(ONIXのTextType=04等)を提供していないため、
// 版元ドットコム(hanmoto.com)の書籍ページから目次テキストを抽出する。
// 公式APIではなくHTML構造への依存のため、サイト側の改修で壊れる可能性がある。
// ブラウザから直接fetchするとCORSで拒否されるが、Worker(サーバー間通信)は
// CORSの対象外なのでここで代理取得してJSONとして返す。
async function handleToc(request, env) {
  const url = new URL(request.url);
  const isbn = (url.searchParams.get('isbn') || '').replace(/[^0-9Xx]/g, '');
  if (!/^(97[89]\d{10}|\d{9}[0-9Xx])$/.test(isbn)) {
    return jsonResponse({ error: 'invalid isbn' }, 400);
  }

  let pageRes;
  try {
    pageRes = await fetch('https://www.hanmoto.com/bd/isbn/' + isbn, {
      headers: {
        'User-Agent': 'keikakuchou-study-plan-app/1.0 (+https://michael-anderson-official.github.io/study-plan-app/; personal study planner, fetches ToC for a book the user scanned)'
      },
      cf: { cacheTtl: 86400, cacheEverything: true }
    });
  } catch (e) {
    return jsonResponse({ toc: null });
  }
  if (!pageRes.ok) {
    return jsonResponse({ toc: null });
  }

  let tocText = '';
  const rewriter = new HTMLRewriter()
    .on('div[data-book-contents-name="toc"] p', {
      text(chunk) {
        tocText += chunk.text;
      }
    })
    .on('div[data-book-contents-name="toc"] p br', {
      element() {
        tocText += '\n';
      }
    });

  try {
    await rewriter.transform(pageRes).text();
  } catch (e) {
    return jsonResponse({ toc: null });
  }

  tocText = tocText
    .split('\n')
    .map(function (line) { return line.trim(); })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return jsonResponse({ toc: tocText || null, source: 'hanmoto.com', isbn: isbn });
}

// ---- 書籍情報の代理取得 ----
//
// ブラウザから直接呼ぶGoogle BooksはAPIキー無しだと世界共有の無料枠に相乗りしており、
// 枠が尽きた日は429で丸ごと失敗する（2026-07-12に実際に発生）。Worker経由で
// openBD → 国立国会図書館サーチ(NDL) → Google Books の3段構えにして、
// どれかが死んでいても書誌が取れるようにする。レスポンスは index.html の
// fetchOpenBdBook() と同じ形に正規化して返す。
async function handleBook(request, env) {
  const url = new URL(request.url);
  const isbn = (url.searchParams.get('isbn') || '').replace(/[^0-9Xx]/g, '');
  if (!/^97[89]\d{10}$/.test(isbn)) {
    return jsonResponse({ error: 'invalid isbn' }, 400);
  }

  const fetchOpts = { cf: { cacheTtl: 86400, cacheEverything: true } };

  // 1. openBD
  try {
    const res = await fetch('https://api.openbd.jp/v1/get?isbn=' + isbn, fetchOpts);
    if (res.ok) {
      const items = await res.json();
      const summary = items && items[0] && items[0].summary;
      if (summary && (summary.title || summary.author || summary.publisher)) {
        return bookResponse({
          isbn: summary.isbn || isbn,
          title: summary.title || null,
          authors: summary.author ? summary.author.split('／').map(function (s) { return s.trim(); }).filter(Boolean) : [],
          publisher: summary.publisher || null,
          publishedDate: summary.pubdate || null,
          coverImage: summary.cover || null,
          source: 'openBD'
        });
      }
    }
  } catch (e) { /* 次のソースへ */ }

  // 2. 国立国会図書館サーチ（OpenSearch、XMLをタグ単位で素朴に抜く）
  try {
    const res = await fetch('https://ndlsearch.ndl.go.jp/api/opensearch?isbn=' + isbn, fetchOpts);
    if (res.ok) {
      const xml = await res.text();
      const item = (xml.split('<item>')[1] || '').split('</item>')[0];
      const pick = function (tag) {
        const m = item.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)</' + tag + '>'));
        return m ? m[1].replace(/<[^>]+>/g, '').trim() : null;
      };
      const title = pick('title');
      if (title) {
        const creator = pick('dc:creator') || pick('author');
        return bookResponse({
          isbn: isbn,
          title: title,
          authors: creator ? creator.split(/[／\/]/).map(function (s) { return s.replace(/\s*(著|作|編|訳|監修)\s*$/, '').trim(); }).filter(Boolean) : [],
          publisher: pick('dc:publisher') || null,
          publishedDate: pick('dc:date') || null,
          coverImage: 'https://ndlsearch.ndl.go.jp/thumbnail/' + isbn + '.jpg',
          source: '国立国会図書館'
        });
      }
    }
  } catch (e) { /* 次のソースへ */ }

  // 3. Google Books（最後の砦。共有枠が枯れていると429で失敗する）
  try {
    const res = await fetch('https://www.googleapis.com/books/v1/volumes?q=isbn:' + isbn + '&maxResults=1', fetchOpts);
    if (res.ok) {
      const data = await res.json();
      const info = data && data.items && data.items[0] && data.items[0].volumeInfo;
      if (info && info.title) {
        const links = info.imageLinks || {};
        let cover = links.thumbnail || links.smallThumbnail || null;
        if (cover && cover.indexOf('http://') === 0) cover = 'https://' + cover.slice(7);
        return bookResponse({
          isbn: isbn,
          title: info.title,
          authors: Array.isArray(info.authors) ? info.authors : [],
          publisher: info.publisher || null,
          publishedDate: info.publishedDate || null,
          coverImage: cover,
          description: info.description || null,
          pageCount: info.pageCount || null,
          source: 'Google Books'
        });
      }
    }
  } catch (e) { /* 見つからなかった扱い */ }

  return jsonResponse({ found: false, isbn: isbn });
}

function bookResponse(book) {
  book.found = true;
  return new Response(JSON.stringify(book), {
    status: 200,
    headers: Object.assign(
      { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400' },
      CORS_HEADERS
    )
  });
}

async function checkAndSend(env) {
  // 日本時間 (UTC+9) で現在時刻を求める
  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const hour = jstNow.getUTCHours();
  const minute = jstNow.getUTCMinutes();
  const todayStr = jstNow.getUTCFullYear() + '-' + pad2(jstNow.getUTCMonth() + 1) + '-' + pad2(jstNow.getUTCDate());
  const currentMinutes = hour * 60 + minute;

  // 複数購読者（uidまたは端末ID単位）を全て走査する。
  let cursor;
  do {
    const list = await env.NOTIFY_KV.list({ prefix: 'sub:', cursor });
    for (const key of list.keys) {
      const storedRaw = await env.NOTIFY_KV.get(key.name);
      if (!storedRaw) continue;
      let stored;
      try {
        stored = JSON.parse(storedRaw);
      } catch (e) {
        continue;
      }
      const targetMinutes = stored.hour * 60 + stored.minute;
      console.log('checkAndSend: ' + key.name + ' now=' + hour + ':' + minute + ' target=' + stored.hour + ':' + stored.minute + ' lastSent=' + stored.lastSentDate + ' today=' + todayStr);
      if (currentMinutes >= targetMinutes && stored.lastSentDate !== todayStr) {
        try {
          await sendWebPush(stored.subscription, { title: '計画帳', body: '今日の成果を報告してください。' }, env);
          console.log('push send succeeded: ' + key.name);
        } catch (e) {
          console.log('push send failed for ' + key.name + ': ' + (e && (e.stack || e.message)));
        }
        stored.lastSentDate = todayStr;
        await env.NOTIFY_KV.put(key.name, JSON.stringify(stored));
      }
    }
    cursor = list.list_complete ? undefined : list.cursor;
  } while (cursor);
}

function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}

// ---- Web Push 送信本体 ----

async function sendWebPush(subscription, payloadObj, env) {
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payloadObj));
  const encryptedBody = await encryptPayload(payloadBytes, subscription.keys.p256dh, subscription.keys.auth);
  const vapidAuthHeader = await buildVapidHeader(subscription.endpoint, env);

  console.log('sending to endpoint: ' + subscription.endpoint);
  const res = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '86400',
      'Authorization': vapidAuthHeader
    },
    body: encryptedBody
  });
  console.log('push endpoint response status: ' + res.status);
  if (!res.ok) {
    const text = await res.text().catch(function () { return ''; });
    throw new Error('push endpoint responded ' + res.status + ' ' + text);
  }
}

// RFC 8292: VAPID JWT の生成と Authorization ヘッダの組み立て
async function buildVapidHeader(endpoint, env) {
  const aud = new URL(endpoint).origin;
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60;
  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = { aud: aud, exp: exp, sub: env.VAPID_SUBJECT };

  const encodedHeader = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsigned = encodedHeader + '.' + encodedPayload;

  const jwk = JSON.parse(env.VAPID_PRIVATE_JWK);
  const privateKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    privateKey,
    new TextEncoder().encode(unsigned)
  );
  const encodedSignature = base64UrlEncode(new Uint8Array(signature));
  const jwt = unsigned + '.' + encodedSignature;

  return 'vapid t=' + jwt + ', k=' + env.VAPID_PUBLIC_KEY;
}

// RFC 8291: メッセージ本文の暗号化（aes128gcm）
async function encryptPayload(payloadBytes, p256dhBase64, authBase64) {
  const uaPublicBytes = base64UrlDecode(p256dhBase64); // 65 bytes, subscriber's public key
  const authSecret = base64UrlDecode(authBase64); // 16 bytes

  const uaPublicKey = await crypto.subtle.importKey(
    'raw',
    uaPublicBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );
  const serverPublicBytes = new Uint8Array(await crypto.subtle.exportKey('raw', serverKeyPair.publicKey));

  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: uaPublicKey },
    serverKeyPair.privateKey,
    256
  );
  const ecdhSecret = new Uint8Array(sharedSecretBits);

  // PRK_key = HKDF-Extract(salt=authSecret, ikm=ecdhSecret)
  const prkKey = await hmacSha256(authSecret, ecdhSecret);

  const keyInfo = concatBytes([
    new TextEncoder().encode('WebPush: info\0'),
    uaPublicBytes,
    serverPublicBytes
  ]);
  // IKM = HKDF-Expand(PRK_key, keyInfo, 32)
  const ikm = (await hmacSha256(prkKey, concatBytes([keyInfo, new Uint8Array([1])]))).slice(0, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));

  // PRK = HKDF-Extract(salt, ikm)  (RFC 8188)
  const prk = await hmacSha256(salt, ikm);

  const cekInfo = new TextEncoder().encode('Content-Encoding: aes128gcm\0');
  const cekBytes = (await hmacSha256(prk, concatBytes([cekInfo, new Uint8Array([1])]))).slice(0, 16);

  const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\0');
  const nonce = (await hmacSha256(prk, concatBytes([nonceInfo, new Uint8Array([1])]))).slice(0, 12);

  // 平文の末尾にパディング区切り(0x02)を1バイト付与する（最終レコードを示す）
  const plaintext = concatBytes([payloadBytes, new Uint8Array([2])]);

  const aesKey = await crypto.subtle.importKey('raw', cekBytes, { name: 'AES-GCM' }, false, ['encrypt']);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    aesKey,
    plaintext
  ));

  // aes128gcm ヘッダー: salt(16) + record size(4) + idlen(1) + keyid(65)
  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096, false);
  const header = concatBytes([
    salt,
    recordSize,
    new Uint8Array([serverPublicBytes.length]),
    serverPublicBytes
  ]);

  return concatBytes([header, ciphertext]);
}

async function hmacSha256(keyBytes, dataBytes) {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, dataBytes);
  return new Uint8Array(sig);
}

function concatBytes(arrays) {
  let total = 0;
  for (const a of arrays) total += a.length;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

function base64UrlEncode(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (str.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
