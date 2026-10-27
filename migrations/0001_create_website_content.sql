-- The content row is intentionally not seeded. The bundled JSON remains the
-- fallback until the administrator explicitly saves live content from Control Desk.
CREATE TABLE IF NOT EXISTS website_content (
  id TEXT PRIMARY KEY NOT NULL,
  content TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
