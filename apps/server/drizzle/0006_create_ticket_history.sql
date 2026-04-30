CREATE TABLE IF NOT EXISTS ticket_history (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL
)
