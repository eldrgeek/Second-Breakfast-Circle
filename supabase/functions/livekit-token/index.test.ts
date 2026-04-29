// Unit tests for the livekit-token Edge Function.
//
// Run from the project root:
//   deno test --allow-env --no-check supabase/functions/livekit-token/index.test.ts
//
// We exercise mintToken() directly (the JWT-signing core) and the
// no-auth-header branch of handler(). The full `auth.getUser` path is
// covered by the integration test against `supabase functions serve`.

import {
  assert,
  assertEquals,
  assertStringIncludes,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { decodeBase64Url } from 'https://deno.land/std@0.224.0/encoding/base64url.ts';

const TEST_API_KEY = 'APItestkey';
const TEST_API_SECRET = 'secretsecretsecretsecretsecretse'; // 32+ chars
const TEST_WS = 'wss://livekit.test.local';
const TEST_USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

Deno.env.set('LIVEKIT_API_KEY', TEST_API_KEY);
Deno.env.set('LIVEKIT_API_SECRET', TEST_API_SECRET);
Deno.env.set('LIVEKIT_WS_URL', TEST_WS);
Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
Deno.env.set('SUPABASE_ANON_KEY', 'anon');
Deno.env.set('LIVEKIT_TOKEN_TEST_MODE', '1');

const { handler, mintToken, TOKEN_TTL_SECONDS } = await import('./index.ts');

function decodeJwt(jwt: string): { header: any; payload: any } {
  const [h, p] = jwt.split('.');
  const dec = (s: string) =>
    JSON.parse(new TextDecoder().decode(decodeBase64Url(s)));
  return { header: dec(h), payload: dec(p) };
}

Deno.test('handler returns 401 when no Authorization header is supplied', async () => {
  const res = await handler(
    new Request('http://x/livekit-token', { method: 'POST', body: '{}' }),
  );
  assertEquals(res.status, 401);
  const body = await res.json();
  assertEquals(body.error, 'unauthorized');
});

Deno.test('handler returns 401 when Authorization header is malformed', async () => {
  const res = await handler(
    new Request('http://x/livekit-token', {
      method: 'POST',
      headers: { Authorization: 'Token foo' },
      body: '{}',
    }),
  );
  assertEquals(res.status, 401);
});

Deno.test('handler returns 405 for non-POST', async () => {
  const res = await handler(new Request('http://x/livekit-token', { method: 'GET' }));
  assertEquals(res.status, 405);
});

Deno.test('mintToken issues a 10-min JWT with roomJoin grant', async () => {
  const before = Math.floor(Date.now() / 1000);
  const { token, room } = await mintToken({
    apiKey: TEST_API_KEY,
    apiSecret: TEST_API_SECRET,
    identity: TEST_USER_ID,
    roomId: '11111111-1111-1111-1111-111111111111',
  });
  const after = Math.floor(Date.now() / 1000);

  assertStringIncludes(room, 'room-11111111');
  assertEquals(room, 'room-11111111-1111-1111-1111-111111111111');

  const { payload } = decodeJwt(token);
  assert(payload.video?.roomJoin === true, 'roomJoin grant missing');
  assertEquals(payload.video.room, room);
  assert(payload.video.canPublish, 'canPublish missing');
  assert(payload.video.canSubscribe, 'canSubscribe missing');
  assertEquals(payload.sub, TEST_USER_ID, 'identity is the supabase user id');
  // exp is `now + 600s` (livekit-server-sdk omits iat).
  assert(
    payload.exp >= before + TOKEN_TTL_SECONDS && payload.exp <= after + TOKEN_TTL_SECONDS + 1,
    `exp ${payload.exp} not within [${before + TOKEN_TTL_SECONDS}, ${after + TOKEN_TTL_SECONDS}]`,
  );
});

Deno.test('mintToken defaults to ROOM_CONFIG.DEFAULT_ROOM_ID when roomId is omitted', async () => {
  const { room } = await mintToken({
    apiKey: TEST_API_KEY,
    apiSecret: TEST_API_SECRET,
    identity: TEST_USER_ID,
  });
  assertEquals(room, 'room-00000000-0000-0000-0000-000000000001');
});
