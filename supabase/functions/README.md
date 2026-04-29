# Supabase Edge Functions

## livekit-token

Mints short-lived LiveKit access tokens. The frontend calls this immediately
before connecting to a LiveKit room, and again whenever a token is about to
expire (see `useLivekitTokenRefresh`).

### Required secrets

```bash
supabase secrets set \
  LIVEKIT_API_KEY=...                       \
  LIVEKIT_API_SECRET=...                    \
  LIVEKIT_WS_URL=wss://vpsmikewolf.duckdns.org
```

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are auto-injected by the Edge Functions
runtime.

### Deploy

```bash
supabase functions deploy livekit-token --project-ref <ref>
```

### Smoke test

```bash
curl -X POST "$SUPABASE_URL/functions/v1/livekit-token" \
  -H "Authorization: Bearer $USER_JWT"                  \
  -H "Content-Type: application/json"                   \
  -d '{"room":"main"}'
```

Expected: `{ token, url, identity, expiresAt }`. A 401 means the user JWT is
missing or expired; a 500 with `server_misconfigured` means one of the secrets
above isn't set.

### Rollback

```bash
supabase functions deploy livekit-token --project-ref <ref> --import-map=...
# or revert the source file and redeploy
```

Edge Functions don't keep version history server-side; rollback = redeploy
the previous source.
