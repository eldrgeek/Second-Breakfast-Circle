# Second Breakfast Circle — Implementation Plan

## Project context

Second Breakfast Circle is a virtual co-working space: a Three.js circular room with up to 15 chairs, Supabase-backed presence/auth/state, a "talking stick" interaction model, and per-user async update feeds with reactions. Stack: React 18 + Vite + TypeScript + Three.js (`@react-three/fiber` + `drei`) + Zustand + Supabase (Postgres, Realtime, Auth, Storage). The repo currently ships a hand-rolled WebRTC mesh for live audio that does not actually connect peers, plus a compile error in `Participants.tsx`.

This plan covers three bug fixes and two feature additions. The shared north star: get reliable live audio/video back online, then layer in async Loom-style video so the cohort can leave updates for each other across timezones.

---

## 1. Bug — WebRTC signaling broken (`src/lib/webrtc.ts`)

### Symptom
Peers never connect. `setupSignaling()` subscribes to a `webrtc-signaling` channel, but every outbound `send()` (in `onicecandidate`, `onnegotiationneeded`, and the answer path inside `handleSignalingMessage`) calls `supabase.channel('webrtc-signaling')` again, which **returns a new, unsubscribed channel**. Supabase Realtime drops broadcasts sent on unsubscribed channels; the peers see nothing.

### Fix
- Store the subscribed channel as `private signalingChannel: RealtimeChannel` on `WebRTCManager`.
- Await `.subscribe()` and only resolve `setupSignaling()` once status is `SUBSCRIBED`. (See https://supabase.com/docs/reference/javascript/subscribe.)
- Replace all three `supabase.channel('webrtc-signaling').send(...)` callsites with `this.signalingChannel.send(...)`.
- In `disconnect()`, also unsubscribe and remove the channel (`supabase.removeChannel(this.signalingChannel)`).
- Guard against `send()` before subscribe completes by buffering or by exposing a `ready` promise that callers await.

### Note
This bug is moot once we move live audio to LiveKit (item 4). However, we still fix it because:
1. The LiveKit migration is multi-day; we need a working fallback for the interim.
2. The fix is small; reverting to broken signaling during the migration window would block cohort co-working entirely.
3. The fix doubles as a regression test we can run against the LiveKit-replaced code path to confirm the old module is fully gone.

### Tests
- Unit: mock `supabase.channel().subscribe()` and assert all three send paths use the same channel instance.
- Integration: two-tab smoke test (script in `scripts/smoke-webrtc.ts`) that confirms `RTCPeerConnection.connectionState === 'connected'` within 10s.

---

## 2. Bug — Missing `User` type import in `Participants.tsx`

### Symptom
`src/components/Participants.tsx:30` uses `User` in `handleClick(event: THREE.Event, user: User | undefined)` but never imports it. TypeScript compile error; production build fails.

### Fix
Add `import type { User } from '../types';` to the top of the file.

### Tests
- `npm run build` succeeds.
- ESLint passes with no `no-undef` errors.

---

## 3. Bug — No TURN server (only public STUN)

### Symptom
`createPeerConnection()` configures only Google's public STUN servers. Cohort members behind symmetric NATs (corporate networks, hotel wifi, mobile carriers) cannot connect. We have a TURN server already running on the Mike Wolf VPS at `vpsmikewolf.duckdns.org`.

### Fix
- Add `VITE_TURN_URL`, `VITE_TURN_USERNAME`, `VITE_TURN_CREDENTIAL` to `.env.example` and document.
- Add `stun:vpsmikewolf.duckdns.org:3478` and `turn:vpsmikewolf.duckdns.org:3478` (UDP+TCP transports) to the `iceServers` config.
- Keep Google STUN as fallback.
- Add `iceTransportPolicy: 'all'` (already present) but expose a debug flag `iceTransportPolicy: 'relay'` to force-test TURN-only flow.

### Note
Like (1), this only matters if we keep the hand-rolled WebRTC. LiveKit handles its own TURN. We still ship the fix because LiveKit migration ships incrementally and we want the interim to actually work for users on hostile networks.

### Tests
- Manual: load `chrome://webrtc-internals/`, force `iceTransportPolicy: 'relay'`, verify connection succeeds (proves TURN is wired).
- Unit: assert `iceServers` array contains both STUN and TURN entries when env vars are set.

---

## 4. Feature — Sync video via LiveKit (replace hand-rolled WebRTC)

### Why
LiveKit is already running at `wss://vpsmikewolf.duckdns.org`. It handles SFU, TURN, simulcast, adaptive bitrate, reconnection, and bandwidth estimation — all of which the current mesh does not. Mesh WebRTC also scales O(n²) connections; with 15 chairs that's 105 peer connections per room. An SFU is the right architecture.

### Scope
- Add `livekit-client`, `@livekit/components-react`, `@livekit/components-styles` to `package.json`.
- Add `livekit-server-sdk` for token issuance.
- Create a Supabase Edge Function `livekit-token` that issues short-lived (10 min) JWT room tokens. Reads `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` from Edge Function secrets. Validates the caller's Supabase auth JWT before minting.
- Build `<LiveKitRoomProvider>` wrapper that pulls a token from the edge function, joins `wss://vpsmikewolf.duckdns.org`, room name = `ROOM_CONFIG.DEFAULT_ROOM_ID`.
- Replace `AudioControls.tsx` mute/unmute with LiveKit's `useLocalParticipant` + `setMicrophoneEnabled`.
- Replace `WebRTCManager` consumer code in `useStore.ts` with LiveKit equivalents. Subscribe to remote tracks via `useTracks`.
- Wire LiveKit's `ActiveSpeakers` event into the existing `speakingLevel` field on `User` (drives the avatar pulse animation in `Participants.tsx`).
- Add video tracks: when a user enables their camera (new toggle in `AudioControls`), publish a video track. Display remote video as a texture on a small floating panel above each chair (Three.js `videoTexture`).
- Keep Supabase for everything else: presence (already on `users` table + Realtime), talking stick state, user updates, sessions, 3D room layout, auth.
- Delete `src/lib/webrtc.ts` once LiveKit parity is verified. Do not delete during migration — keep behind a `VITE_USE_LIVEKIT` flag.

### Tests
- E2E: Playwright two-browser test, both join, both publish audio, assert audio track count = 2 on each.
- E2E: third tab joins, assert all three see two remote audio tracks.
- E2E: video toggle test — publish video, remote tab sees `<video>` element with non-zero dimensions.
- Unit: edge function rejects unauthenticated callers, mints valid JWT for authenticated.

### Risks / considerations
- LiveKit JS SDK bundle size — measure with `vite build --mode production` before/after; budget +200KB gzip.
- Token refresh: 10 min tokens mean we need to refresh before expiry. LiveKit client supports `connectOptions.tokenRefresh` callback; wire it.
- LiveKit's room name must be valid (lowercase, alphanumeric + dashes); the UUID `00000000-0000-0000-0000-000000000001` is fine.
- Existing `videoEnabled` field on `User` already exists in types — we just have to populate it.

---

## 5. Feature — Async Loom-style video updates

### Why
Cohort spans multiple timezones. People miss live circles. Async video updates ("here's what I'm working on, 90 seconds") let the group stay connected without forcing synchronous attendance. We already have a text-based `user_updates` table with reactions; layering video onto the same model keeps the UX consistent.

### Scope
- Supabase Storage: create a private `recordings` bucket. RLS: users can read all, write only their own (`storage.objects.owner = auth.uid()`).
- Migration: extend `user_updates` with `recording_url text`, `recording_duration_seconds int`, `recording_thumbnail_url text` (all nullable; text-only updates remain valid).
- Or alternative: separate `user_recordings` table joined to `user_updates` 1:1. Decide via single bead — recommendation is to extend `user_updates` to keep the notification + reactions pipeline unchanged.
- Capture component `<RecordUpdate>` using `MediaRecorder` API. Codec: `video/webm; codecs=vp9,opus` (Chrome/Firefox) with `video/mp4` fallback (Safari 14+).
- Recording UI: 90s max (configurable), countdown, pause/resume, re-record, preview before upload.
- Upload: chunked upload to Supabase Storage with progress UI. On success, insert `user_updates` row with `recording_url` populated.
- Thumbnail: generate via canvas snapshot of the video element at t=1s, upload as `<recording_id>-thumb.jpg`.
- Playback: extend the existing `UpdateDialog.tsx` to render a `<video controls>` when `recording_url` is present.
- Notifications: existing `user_updates` realtime subscription already triggers `hasUnreadUpdates` on the `User` model. Confirm video updates flow through it. Add a "🎥" indicator in the roster panel when the unread update has video.

### Tests
- E2E: record 5s clip, upload, reload, confirm playback works.
- Unit: MediaRecorder mock — verify start/stop/pause/resume state machine.
- Unit: thumbnail generator produces a valid JPEG blob.
- Storage: verify RLS — user A cannot delete user B's recording.

### Risks
- Safari `MediaRecorder` support: historically spotty pre-Safari 14.1. Feature-detect and show a graceful fallback message.
- Upload size: 90s of 720p VP9 is ~10-20 MB. Supabase free tier has 1GB storage; document expected usage.
- Mobile: capture on iOS Safari requires `<input type="file" accept="video/*" capture>` as alternative. Out of scope for v1; document.

---

## 6. Feature — Multiple rooms with themes

### Why
Today there is exactly one room (`DEFAULT_ROOM_ID = "00000000-0000-0000-0000-000000000001"`). The cohort has overlapping but distinct sub-groups (writing circle, building circle, accountability pods). Forcing them all into one circle dilutes presence and overflows the 15-chair cap. Multi-room with themes also makes the product viable for other communities.

### Scope (sequenced; the DB bead must land first)

#### 6a. Schema migration (lands first — gates everything else in this section)
- New table `rooms`:
  - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
  - `name text NOT NULL` (1-60 chars, validated)
  - `slug text UNIQUE NOT NULL` (URL-safe, derived from name)
  - `description text`
  - `theme_id text NOT NULL DEFAULT 'default'` (foreign key not used; theme registry lives in code)
  - `num_chairs int NOT NULL DEFAULT 15 CHECK (num_chairs BETWEEN 4 AND 30)`
  - `visibility text NOT NULL DEFAULT 'invite'` (`'public' | 'invite' | 'private'`)
  - `created_by uuid REFERENCES users(id)`
  - `created_at timestamptz DEFAULT now()`
- New table `room_members`:
  - `room_id uuid REFERENCES rooms(id) ON DELETE CASCADE`
  - `user_id uuid REFERENCES users(id) ON DELETE CASCADE`
  - `role text NOT NULL DEFAULT 'member'` (`'owner' | 'admin' | 'member'`)
  - `joined_at timestamptz DEFAULT now()`
  - `PRIMARY KEY (room_id, user_id)`
- Backfill: insert one row into `rooms` with the existing `DEFAULT_ROOM_ID` (`name = 'Second Breakfast Circle'`, `theme_id = 'default'`). Insert all current users as `room_members` of that room.
- Migrate existing `users.room_id` (or whichever column tracks current room) to point at the seeded room.
- Migrate `user_updates`, `sessions`: keep them user-scoped but add a nullable `room_id` for future per-room update streams (out of scope for write paths in this feature, but the column lands now to avoid a second migration).
- RLS:
  - `rooms`: SELECT allowed if `visibility = 'public'` OR caller is in `room_members`. INSERT allowed if authenticated. UPDATE/DELETE allowed if caller is owner/admin.
  - `room_members`: SELECT allowed if caller is in the same room. INSERT (joining): public rooms = self-insert allowed; invite/private = only existing admin/owner can insert. DELETE: self or admin/owner.
- Realtime: enable Realtime on `rooms` and `room_members` so the lobby reflects live state.

#### 6b. Theme registry (code-only, no schema)
- `src/config/themes.ts`: a typed registry of themes. Each theme has:
  - `id: string`
  - `displayName: string`
  - `palette: { ambient: string, walls: string, floor: string, accent: string, seatPrimary: string, seatSecondary: string }`
  - `lighting: { ambientIntensity: number, pointIntensity: number, environmentPreset: PresetsType }`
  - `geometry: { wallStyle: 'panels' | 'arches' | 'glass', floorPattern: 'solid' | 'checker' | 'concentric' }`
- Ship 4 starter themes: `default` (current sunset), `forest`, `ocean`, `library`. The registry is closed-set; users pick from a dropdown, not free-form (avoids ugly user-generated palettes in v1).

#### 6c. Lobby / room selector screen
- New route/component `<Lobby />` shown after login, before `<Room />`.
- Lists rooms the user is a member of + public rooms + an "Owned by you" section.
- "Create room" button opens a modal: name, description, theme picker (visual swatches), num_chairs slider, visibility radio.
- Clicking a room sets `currentRoomId` in the Zustand store, mounts `<Room roomId={...} />`.
- "Leave room" (existing button in `Room.tsx`) returns to lobby instead of logging out.

#### 6d. Themed 3D environment
- `<CircularRoom>` and `<Participants>` accept the active theme. Pull from `useStore(state => state.currentRoom?.themeId)` → resolve via theme registry.
- Apply theme to: ambient light color/intensity, point light intensity, environment preset, wall material color, floor material, seat primary/secondary colors. Smooth crossfade not required for v1 — themes apply on room mount.
- Verify theme switching by joining different rooms; expect the visible scene to change.

#### 6e. Room-scoped presence
- LiveKit room name = `room-${roomId}` (was: `ROOM_CONFIG.DEFAULT_ROOM_ID`). Audio/video is now naturally scoped per room.
- Supabase presence: include `room_id` in presence state. The roster, talking stick, and avatars filter to the active room.
- Talking stick state: add `room_id` to whatever table holds it; ensure a stick can only be passed between users in the same room.
- User updates: keep global for now; add a "post to: [my rooms]" picker in a follow-up bead (out of scope for this feature, but called out for the future-self).

#### 6f. Invites
- Simple invite via shareable link: `https://app/.../join/<room.slug>?token=<signed-token>`.
- Token = JWT signed by a Supabase Edge Function, embeds `room_id` and `expires_at` (default 7 days).
- Visiting the link (when authenticated) inserts the caller into `room_members` and redirects into the room.
- Out of scope for v1: email invites, in-app invite UI. Just the share-link primitive.

### Tests
- Unit: theme registry returns expected palette; unknown theme falls back to `default` with a warning.
- Unit: slug generation handles unicode + collisions (append `-2`, `-3`...).
- Integration: create a room, switch into it, confirm the active theme renders (compare canvas snapshot or material color).
- E2E: User A creates an invite-only room, User B joins via link, both see each other in the roster, User C (no invite) cannot see the room in the lobby.
- RLS: regression tests asserting visibility rules (use Supabase's pgTAP or a Node script with two service-role-less clients).

### Risks / considerations
- The DB migration moves the model from "single global room" to "first-class rooms". Make the seeded backfill idempotent and verify the existing single-room cohort lands cleanly in the seeded `Second Breakfast Circle` room with no UX disruption.
- Talking stick currently assumes one room; carefully scope the stick state by `room_id`.
- LiveKit room names — when an invite-only room is deleted, its LiveKit room may persist briefly. LiveKit auto-evicts empty rooms after a timeout; we don't need to manage this manually.
- Theme registry being closed-set in v1 is deliberate; opening it up later requires an admin-curated theme moderation flow.

### Sequencing within feature 6
1. Schema migration (6a) — gates everything.
2. Theme registry (6b) — code-only, can land in parallel with 6a.
3. Lobby (6c) — depends on 6a (queries `rooms`, `room_members`).
4. Themed 3D environment (6d) — depends on 6b + 6c.
5. Room-scoped presence (6e) — depends on 6c (needs `currentRoomId` in store) and lands alongside or after the LiveKit work in feature 4.
6. Invites (6f) — depends on 6a + 6c.

---

## Cross-cutting work

### A. E2E test harness
- Add Playwright + a `pnpm test:e2e` script.
- Run against a dev Supabase instance (or staging project). Document setup in `README.md`.
- Two-browser fixture for sync tests; single-browser for async.

### B. Manual smoke test checklist
- Document a `docs/SMOKE.md` with the steps to manually verify each fix and feature.

### C. Logging
- Add a thin logger (`src/lib/logger.ts`) with namespaces (`webrtc`, `livekit`, `recording`, `signaling`). Verbose mode toggled by `VITE_DEBUG_LOG`. All five workstreams adopt it.

---

## Dependency rough-graph (informal)

- (2) Participants import — independent, ship first.
- (1) WebRTC signaling fix and (3) TURN config — independent of each other, both gate the interim audio.
- (4) LiveKit — depends on edge function infra; supersedes (1) + (3) but ships behind flag, then deletes legacy.
- (5) Async video — depends on Storage bucket + migration; mostly independent of (4) but should land after (4) so the team has both modes.
- (6) Multi-room with themes — schema (6a) blocks 6c/6d/6e/6f; theme registry (6b) is parallelizable. (6e) coordinates with (4) on LiveKit room naming.
- (A) E2E harness — should land before (4), (5), (6) so we can test them.
- (C) Logger — small, ship early.

---

## Done criteria

- All three bugs fixed; `npm run build` clean; cohort can have a 5-person live audio call without dropouts.
- LiveKit shipped, flag default-on, legacy WebRTC deleted.
- Async video updates: at least one cohort member records and reacts to a video update end-to-end.
- E2E harness covers the happy path of items 1, 4, 5.
