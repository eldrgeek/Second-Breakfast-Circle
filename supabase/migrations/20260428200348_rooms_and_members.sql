/*
  # Rooms and room membership

  1. New tables
    - `rooms` — themed virtual spaces. Columns: id, name, theme (jsonb),
      description, created_at.
    - `room_members` — join table mapping users to rooms. Columns: room_id,
      user_id, joined_at. Composite PK (room_id, user_id).

  2. Default data
    - Seeds a single default room ("Lobby") so existing flows have somewhere
      to land. The user backfill into this room is a separate migration.

  3. Security
    - RLS enabled on both tables with anon read/insert/update/delete, matching
      the existing permissive model used elsewhere in this schema.

  4. Realtime
    - Both tables added to the supabase_realtime publication so room presence
      and membership updates can stream to clients.
*/

CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  theme jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS room_members (
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS room_members_user_id_idx ON room_members(user_id);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read rooms" ON rooms;
DROP POLICY IF EXISTS "Anyone can insert rooms" ON rooms;
DROP POLICY IF EXISTS "Anyone can update rooms" ON rooms;
DROP POLICY IF EXISTS "Anyone can delete rooms" ON rooms;

CREATE POLICY "Anyone can read rooms"
  ON rooms FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can insert rooms"
  ON rooms FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anyone can update rooms"
  ON rooms FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete rooms"
  ON rooms FOR DELETE TO anon USING (true);

DROP POLICY IF EXISTS "Anyone can read room_members" ON room_members;
DROP POLICY IF EXISTS "Anyone can insert room_members" ON room_members;
DROP POLICY IF EXISTS "Anyone can update room_members" ON room_members;
DROP POLICY IF EXISTS "Anyone can delete room_members" ON room_members;

CREATE POLICY "Anyone can read room_members"
  ON room_members FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can insert room_members"
  ON room_members FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anyone can update room_members"
  ON room_members FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete room_members"
  ON room_members FOR DELETE TO anon USING (true);

INSERT INTO rooms (id, name, theme, description)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Lobby',
  '{"key": "default"}'::jsonb,
  'The default room — a quiet place to land before joining a themed circle.'
)
ON CONFLICT (id) DO NOTHING;

ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE room_members;
