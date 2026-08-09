/* The operational store.
 *
 * Users, households, membership and sessions. Nothing about anybody's money.
 * If a figure ever needs to be written here, something has gone wrong with the
 * architecture rather than with the query.
 */

import { randomId } from './http.js';

const SESSION_DAYS = 60;

/* Codes a household can say aloud: a name and a number, like PERIS19. No
   vowel-free confusion, nothing sensitive, and short enough to text. */
const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

export async function ensureSchema(db) {
  // Pages Functions cannot run migrations themselves, so the schema is made
  // certain on first use. Every statement is safe to repeat.
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, google_sub TEXT UNIQUE NOT NULL, email TEXT NOT NULL,
      name TEXT, picture TEXT, created_at INTEGER NOT NULL, last_seen_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS households (
      id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
      created_by TEXT NOT NULL, created_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS household_members (
      household_id TEXT NOT NULL, user_id TEXT NOT NULL, role TEXT NOT NULL,
      joined_at INTEGER NOT NULL, PRIMARY KEY (household_id, user_id))`,
    `CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY, household_id TEXT, user_id TEXT,
      action TEXT NOT NULL, at INTEGER NOT NULL)`,

    /* A household's records, sealed. The server holds `body` and cannot open
       it: the key is derived on the household's own devices from a phrase this
       database has never seen. `updated_at` and `deleted` are in the clear
       because syncing needs to know what changed and when — nothing else is. */
    `CREATE TABLE IF NOT EXISTS records (
      household_id TEXT NOT NULL, id TEXT NOT NULL,
      updated_at INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0,
      iv TEXT, body TEXT,
      PRIMARY KEY (household_id, id))`,
    `CREATE INDEX IF NOT EXISTS records_by_household ON records (household_id, updated_at)`,

    /* A token sealed with the household's key, so a phone can tell a wrong
       phrase immediately rather than syncing records it cannot read. */
    `CREATE TABLE IF NOT EXISTS household_check (
      household_id TEXT PRIMARY KEY, iv TEXT NOT NULL, body TEXT NOT NULL,
      set_at INTEGER NOT NULL)`
  ];

  for (const sql of statements) await db.prepare(sql).run();
}

/* ---------- people ---------- */

export async function upsertUser(db, profile) {
  const now = Date.now();
  const existing = await db
    .prepare('SELECT id FROM users WHERE google_sub = ?')
    .bind(profile.sub)
    .first();

  if (existing) {
    await db
      .prepare('UPDATE users SET email = ?, name = ?, picture = ?, last_seen_at = ? WHERE id = ?')
      .bind(profile.email, profile.name || null, profile.picture || null, now, existing.id)
      .run();
    return existing.id;
  }

  const id = randomId(16);
  await db
    .prepare(`INSERT INTO users (id, google_sub, email, name, picture, created_at, last_seen_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, profile.sub, profile.email, profile.name || null, profile.picture || null, now, now)
    .run();

  return id;
}

/* ---------- sessions ---------- */

export async function createSession(db, userId) {
  const id = randomId(32);
  const now = Date.now();
  await db
    .prepare('INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(id, userId, now, now + SESSION_DAYS * 24 * 60 * 60 * 1000)
    .run();
  return id;
}

export async function userForSession(db, sessionId) {
  if (!sessionId) return null;

  const row = await db
    .prepare(`SELECT u.id, u.email, u.name, u.picture, s.expires_at
              FROM sessions s JOIN users u ON u.id = s.user_id
              WHERE s.id = ?`)
    .bind(sessionId)
    .first();

  if (!row) return null;

  if (row.expires_at < Date.now()) {
    await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
    return null;
  }

  return { id: row.id, email: row.email, name: row.name, picture: row.picture };
}

export async function endSession(db, sessionId) {
  if (sessionId) await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
}

/* ---------- households ---------- */

/** PERIS19 — from the household's own name where possible. */
function proposeCode(name) {
  const letters = String(name || '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 5);

  const stem = letters.length >= 3
    ? letters
    : Array.from({ length: 5 }, () => CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)]).join('');

  return `${stem}${Math.floor(Math.random() * 90) + 10}`;
}

export async function createHousehold(db, userId, name) {
  await ensureSchema(db);

  let code = proposeCode(name);
  for (let attempt = 0; attempt < 12; attempt++) {
    const clash = await db.prepare('SELECT 1 FROM households WHERE code = ?').bind(code).first();
    if (!clash) break;
    code = proposeCode(name);
  }

  const id = randomId(16);
  const now = Date.now();

  await db
    .prepare('INSERT INTO households (id, code, name, created_by, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(id, code, name, userId, now)
    .run();

  await db
    .prepare('INSERT INTO household_members (household_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)')
    .bind(id, userId, 'HEAD', now)
    .run();

  await note(db, id, userId, 'household created');

  return { id, code, name, role: 'HEAD' };
}

export async function joinHousehold(db, userId, code) {
  await ensureSchema(db);

  const household = await db
    .prepare('SELECT id, code, name FROM households WHERE code = ?')
    .bind(String(code || '').toUpperCase().trim())
    .first();

  if (!household) return null;

  const already = await db
    .prepare('SELECT role FROM household_members WHERE household_id = ? AND user_id = ?')
    .bind(household.id, userId)
    .first();

  if (already) return { ...household, role: already.role };

  await db
    .prepare('INSERT INTO household_members (household_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)')
    .bind(household.id, userId, 'ADULT_MEMBER', Date.now())
    .run();

  await note(db, household.id, userId, 'joined household');

  return { ...household, role: 'ADULT_MEMBER' };
}

export async function householdFor(db, userId) {
  const row = await db
    .prepare(`SELECT h.id, h.code, h.name, m.role
              FROM household_members m JOIN households h ON h.id = m.household_id
              WHERE m.user_id = ? ORDER BY m.joined_at LIMIT 1`)
    .bind(userId)
    .first();

  return row || null;
}

export async function membersOf(db, householdId) {
  const { results } = await db
    .prepare(`SELECT u.name, u.email, u.picture, m.role, m.joined_at
              FROM household_members m JOIN users u ON u.id = m.user_id
              WHERE m.household_id = ? ORDER BY m.joined_at`)
    .bind(householdId)
    .all();

  return results || [];
}

async function note(db, householdId, userId, action) {
  try {
    await db
      .prepare('INSERT INTO audit_log (id, household_id, user_id, action, at) VALUES (?, ?, ?, ?, ?)')
      .bind(randomId(12), householdId, userId, action, Date.now())
      .run();
  } catch {
    // An audit line failing must never stop the thing being audited.
  }
}
