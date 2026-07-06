// 計画帳アプリ用の通知送信ワーカー。
// GitHub Pages（静的サイト）では定期処理や購読情報の保存ができないため、
// このWorkerが「毎日決まった時刻に Web Push を送る」役割を担う。
//
// 必要な設定（Cloudflareダッシュボードで行う）:
// - KV Namespace を作成し、変数名 NOTIFY_KV としてバインドする
// - Secret「VAPID_PRIVATE_JWK」に、ローカルで生成した秘密鍵JWK（JSON文字列）を設定する
// - Secret「VAPID_PUBLIC_KEY」に、対応する公開鍵（base64url文字列）を設定する
// - Secret「VAPID_SUBJECT」に、連絡先として使うメールアドレス（例: mailto:you@example.com）を設定する
// - Cron Trigger を追加する（例: 毎分 "* * * * *"）
//
// このファイルはCloudflareの「Quick Edit」にそのまま貼り付けて使うことを想定しており、
// npmパッケージへの依存はない（Web Crypto APIのみで完結する）。

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
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
  if (!body || !body.subscription || typeof body.hour !== 'number' || typeof body.minute !== 'number') {
    return jsonResponse({ error: 'invalid body' }, 400);
  }
  await env.NOTIFY_KV.put('subscription', JSON.stringify({
    subscription: body.subscription,
    hour: body.hour,
    minute: body.minute
  }));
  return jsonResponse({ ok: true });
}

function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: Object.assign({ 'Content-Type': 'application/json' }, CORS_HEADERS)
  });
}

async function checkAndSend(env) {
  const storedRaw = await env.NOTIFY_KV.get('subscription');
  if (!storedRaw) return;
  const stored = JSON.parse(storedRaw);

  // 日本時間 (UTC+9) で現在時刻を求める
  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const hour = jstNow.getUTCHours();
  const minute = jstNow.getUTCMinutes();
  const todayStr = jstNow.getUTCFullYear() + '-' + pad2(jstNow.getUTCMonth() + 1) + '-' + pad2(jstNow.getUTCDate());

  const targetMinutes = stored.hour * 60 + stored.minute;
  const currentMinutes = hour * 60 + minute;

  const lastSent = await env.NOTIFY_KV.get('lastSentDate');
  console.log('checkAndSend: now=' + hour + ':' + minute + ' target=' + stored.hour + ':' + stored.minute + ' lastSent=' + lastSent + ' today=' + todayStr);
  if (currentMinutes >= targetMinutes && lastSent !== todayStr) {
    try {
      await sendWebPush(stored.subscription, { title: '計画帳', body: '今日の成果を報告してください。' }, env);
      console.log('push send succeeded');
    } catch (e) {
      console.log('push send failed: ' + (e && (e.stack || e.message)));
    }
    await env.NOTIFY_KV.put('lastSentDate', todayStr);
  }
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
