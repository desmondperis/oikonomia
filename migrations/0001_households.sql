-- Oikonomia — the operational layer.
--
-- This database holds only what is needed to know who somebody is and which
-- household they belong to. The household's financial life — transactions,
-- budgets, goals — lives on their own devices, not here.
--
-- Everything is additive and safe to run more than once.

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  google_sub    TEXT UNIQUE NOT NULL,
  email         TEXT NOT NULL,
  name          TEXT,
  picture       TEXT,
  created_at    INTEGER NOT NULL,
  last_seen_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS users_google_sub ON users (google_sub);

-- A household is what a family shares. The code is theirs to pass around:
-- readable, sayable over the phone, and not sensitive on its own.
CREATE TABLE IF NOT EXISTS households (
  id          TEXT PRIMARY KEY,
  code        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  created_by  TEXT NOT NULL REFERENCES users (id),
  created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS households_code ON households (code);

-- Roles follow section 6 of the specification. No assumption is made that a
-- household is a husband and a wife.
CREATE TABLE IF NOT EXISTS household_members (
  household_id  TEXT NOT NULL REFERENCES households (id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('HEAD', 'ADULT_MEMBER', 'VIEW_ONLY')),
  joined_at     INTEGER NOT NULL,
  PRIMARY KEY (household_id, user_id)
);

CREATE INDEX IF NOT EXISTS members_by_user ON household_members (user_id);

-- Sessions are rows rather than self-contained tokens, so signing somebody out
-- actually signs them out.
CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS sessions_by_user ON sessions (user_id);

-- Who did what, for a household that wants to check. Never any figures.
CREATE TABLE IF NOT EXISTS audit_log (
  id            TEXT PRIMARY KEY,
  household_id  TEXT,
  user_id       TEXT,
  action        TEXT NOT NULL,
  at            INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS audit_by_household ON audit_log (household_id, at);
