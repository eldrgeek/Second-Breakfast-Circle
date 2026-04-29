// Supabase Edge Function: livekit-token
//
// Mints a short-lived LiveKit access token for the calling user.
// Validates the Supabase JWT in the Authorization header, then signs a LiveKit
// JWT scoped to the requested room. Implementation detail in sbc-21g; this
// scaffold returns a stub so the deploy/route plumbing can be verified first.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { AccessToken } from 'https://esm.sh/livekit-server-sdk@2.7.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface TokenRequest {
  room: string;
  // Optional: client may pass a display name override.
  name?: string;
}

interface TokenResponse {
  token: string;
  url: string;
  identity: string;
  expiresAt: number;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  const apiKey = Deno.env.get('LIVEKIT_API_KEY');
  const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');
  const wsUrl = Deno.env.get('LIVEKIT_WS_URL');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!apiKey || !apiSecret || !wsUrl || !supabaseUrl || !supabaseAnonKey) {
    return json({ error: 'server_misconfigured' }, 500);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'unauthorized' }, 401);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    return json({ error: 'unauthorized' }, 401);
  }
  const user = userData.user;

  let body: TokenRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  if (!body.room || typeof body.room !== 'string') {
    return json({ error: 'missing_room' }, 400);
  }

  const ttlSeconds = 60 * 10;
  const at = new AccessToken(apiKey, apiSecret, {
    identity: user.id,
    name: body.name ?? (user.user_metadata?.display_name as string | undefined) ?? user.email ?? user.id,
    ttl: ttlSeconds,
  });
  at.addGrant({
    room: body.room,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();

  const response: TokenResponse = {
    token,
    url: wsUrl,
    identity: user.id,
    expiresAt: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  return json(response, 200);
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
