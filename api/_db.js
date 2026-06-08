import pg from "pg";

const { Pool } = pg;

let pool;
let schemaReady = false;

export function getPool() {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL_UNPOOLED;

  if (!connectionString) {
    throw new Error("Database URL is not configured");
  }

  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes("localhost")
        ? false
        : { rejectUnauthorized: false }
    });
  }

  return pool;
}

export async function ensureSchema() {
  if (schemaReady) return;

  const db = getPool();

  await db.query(`
    create table if not exists research_sessions (
      id text primary key,
      participant_id text,
      started_at timestamptz not null default now(),
      completed_at timestamptz,
      user_agent text,
      metadata jsonb not null default '{}'::jsonb
    );
  `);

  await db.query(`
    create table if not exists research_events (
      id bigserial primary key,
      session_id text not null references research_sessions(id) on delete cascade,
      event_type text not null,
      step text,
      value text,
      payload jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    );
  `);

  await db.query(`
    create index if not exists idx_research_events_session_time
    on research_events (session_id, created_at);
  `);

  await db.query(`
    create index if not exists idx_research_sessions_started
    on research_sessions (started_at desc);
  `);

  schemaReady = true;
}

export function jsonError(res, status, message) {
  return res.status(status).json({ ok: false, error: message });
}
